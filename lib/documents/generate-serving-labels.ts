// Serving Labels PDF Generator
// Produces printable labels for containers/plates during service.
// Each label shows: dish name, course, allergens, date prepared, reheating notes.
// Supports 3 label sizes: 2x3, 2x4, and full-page.

'use server'

import { jsPDF } from 'jspdf'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { allergenShortName } from '@/lib/constants/allergens'
import { format, parseISO } from 'date-fns'

// --- Types ---

export type LabelSize = '2x3' | '2x4' | 'full-page'

export type LabelOptions = {
  labelSize: LabelSize
  includeReheating?: boolean
  includeAllergens?: boolean
  prepDate?: string
  shelfLifeDays?: number
}

type LabelData = {
  dishName: string
  courseName: string
  allergens: string[]
  datePrepared: string
  reheatNote: string | null
}

type LabelGrid = {
  cols: number
  rows: number
  labelWidthMm: number
  labelHeightMm: number
  marginXMm: number
  marginYMm: number
  gapXMm: number
  gapYMm: number
}

// --- Label Size Configs ---

const LETTER_WIDTH_MM = 215.9
const LETTER_HEIGHT_MM = 279.4

function getLabelGrid(size: LabelSize): LabelGrid {
  switch (size) {
    case '2x3': {
      const lw = 50.8
      const lh = 76.2
      const cols = 2
      const rows = 3
      const totalW = cols * lw
      const totalH = rows * lh
      const mx = (LETTER_WIDTH_MM - totalW) / (cols + 1)
      const my = (LETTER_HEIGHT_MM - totalH) / (rows + 1)
      return {
        cols,
        rows,
        labelWidthMm: lw,
        labelHeightMm: lh,
        marginXMm: mx,
        marginYMm: my,
        gapXMm: mx,
        gapYMm: my,
      }
    }
    case '2x4': {
      const lw = 50.8
      const lh = 101.6
      const cols = 2
      const rows = 2
      const totalW = cols * lw
      const totalH = rows * lh
      const mx = (LETTER_WIDTH_MM - totalW) / (cols + 1)
      const my = (LETTER_HEIGHT_MM - totalH) / (rows + 1)
      return {
        cols,
        rows,
        labelWidthMm: lw,
        labelHeightMm: lh,
        marginXMm: mx,
        marginYMm: my,
        gapXMm: mx,
        gapYMm: my,
      }
    }
    case 'full-page': {
      const mx = 20
      const my = 20
      return {
        cols: 1,
        rows: 1,
        labelWidthMm: LETTER_WIDTH_MM - 2 * mx,
        labelHeightMm: LETTER_HEIGHT_MM - 2 * my,
        marginXMm: mx,
        marginYMm: my,
        gapXMm: 0,
        gapYMm: 0,
      }
    }
  }
}

// --- Reheat Detection ---

const REHEAT_PATTERNS: { pattern: RegExp; hasTemp: boolean }[] = [
  { pattern: /reheat\s+(?:at|to)\s+(\d{2,3}\s*[°]?\s*[FCfc])/i, hasTemp: true },
  { pattern: /warm\s+(?:at|to)\s+(\d{2,3}\s*[°]?\s*[FCfc])/i, hasTemp: true },
  { pattern: /(\d{2,3}\s*[°]\s*[FCfc])\s+(?:for|until)/i, hasTemp: true },
  { pattern: /reheat/i, hasTemp: false },
  { pattern: /warm\s+(?:in|through|gently)/i, hasTemp: false },
]

function extractReheatNote(method: string | null): string | null {
  if (!method) return null
  for (const { pattern, hasTemp } of REHEAT_PATTERNS) {
    const match = method.match(pattern)
    if (match) {
      if (hasTemp && match[1]) {
        return `Reheat to ${match[1].trim()}`
      }
      return 'Reheat before serving'
    }
  }
  return null
}

// --- Fetch Label Data ---

async function fetchLabelData(
  eventId: string
): Promise<{ labels: LabelData[]; eventName: string } | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, occasion, event_date, menu_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event || !event.menu_id) return null

  const eventDate = event.event_date ? format(parseISO(event.event_date), 'MMM d, yyyy') : 'N/A'

  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, name, course_name, course_number, allergen_flags')
    .eq('menu_id', event.menu_id)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  const dishIds = dishes.map((d: any) => d.id)

  const { data: components } = await supabase
    .from('components')
    .select('id, name, dish_id, recipe_id, sort_order')
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  const recipeIds = (components ?? []).map((c: any) => c.recipe_id).filter(Boolean) as string[]

  const recipeMethods: Record<string, string> = {}
  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, method')
      .in('id', recipeIds)
      .eq('tenant_id', tenantId)

    for (const r of (recipes ?? []) as any[]) {
      recipeMethods[r.id] = r.method ?? ''
    }
  }

  // Fetch allergens from recipe_ingredients -> ingredients for components.
  // Supplements the dish-level allergen_flags with ingredient-level data.
  const componentAllergens: Record<string, string[]> = {}
  if (recipeIds.length > 0) {
    const { data: riRows } = await supabase
      .from('recipe_ingredients')
      .select('recipe_id, ingredients(allergen_flags)')
      .in('recipe_id', recipeIds)

    for (const ri of (riRows ?? []) as any[]) {
      const flags = (ri.ingredients as any)?.allergen_flags
      if (flags && Array.isArray(flags) && flags.length > 0) {
        if (!componentAllergens[ri.recipe_id]) {
          componentAllergens[ri.recipe_id] = []
        }
        for (const f of flags) {
          if (!componentAllergens[ri.recipe_id].includes(f)) {
            componentAllergens[ri.recipe_id].push(f)
          }
        }
      }
    }
  }

  // One label per dish (components roll up into the dish)
  const labels: LabelData[] = []

  for (const dish of dishes as any[]) {
    const dishName = dish.name || dish.course_name
    const courseName = dish.course_name
    const allergenSet = new Set<string>(dish.allergen_flags ?? [])

    const dishComponents = (components ?? []).filter((c: any) => c.dish_id === dish.id) as any[]

    let reheatNote: string | null = null

    for (const comp of dishComponents) {
      if (comp.recipe_id) {
        const recipeAllergens = componentAllergens[comp.recipe_id] ?? []
        for (const a of recipeAllergens) {
          allergenSet.add(a)
        }
        if (!reheatNote) {
          reheatNote = extractReheatNote(recipeMethods[comp.recipe_id] ?? null)
        }
      }
    }

    labels.push({
      dishName,
      courseName,
      allergens: Array.from(allergenSet).sort(),
      datePrepared: eventDate,
      reheatNote,
    })
  }

  return { labels, eventName: event.occasion ?? 'Event' }
}

// --- Render Single Label ---

function renderLabel(
  doc: jsPDF,
  label: LabelData,
  x: number,
  y: number,
  width: number,
  height: number,
  size: LabelSize
) {
  const padding = size === 'full-page' ? 8 : 3
  const innerW = width - 2 * padding
  let curY = y + padding

  // Dashed border for cut guides
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.setLineDashPattern([2, 2], 0)
  doc.rect(x, y, width, height)
  doc.setLineDashPattern([], 0)

  const maxY = y + height - padding

  // Font sizes scale with label size
  const nameFontSize = size === 'full-page' ? 24 : size === '2x4' ? 14 : 11
  const courseFontSize = size === 'full-page' ? 14 : size === '2x4' ? 10 : 8
  const detailFontSize = size === 'full-page' ? 12 : size === '2x4' ? 9 : 7
  const badgeFontSize = size === 'full-page' ? 11 : size === '2x4' ? 8 : 6.5

  // Dish name (bold, prominent)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(nameFontSize)
  doc.setTextColor(0, 0, 0)

  const nameLines = doc.splitTextToSize(label.dishName, innerW)
  const lineH = nameFontSize * 0.38
  for (const line of nameLines.slice(0, 2)) {
    if (curY + lineH > maxY) break
    doc.text(line, x + padding, curY)
    curY += lineH
  }
  curY += 1

  // Course name
  if (curY + courseFontSize * 0.38 < maxY) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(courseFontSize)
    doc.setTextColor(100, 100, 100)
    doc.text(label.courseName, x + padding, curY)
    curY += courseFontSize * 0.38 + 1
  }

  // Separator line
  if (curY + 2 < maxY) {
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.line(x + padding, curY, x + padding + innerW, curY)
    curY += 2
  }

  // Allergen badges
  if (label.allergens.length > 0 && curY + badgeFontSize * 0.38 + 2 < maxY) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(badgeFontSize)

    const allergenText = label.allergens.map((a) => allergenShortName(a)).join(' | ')

    const prefixW = doc.getTextWidth('CONTAINS: ')
    doc.setTextColor(100, 100, 100)
    doc.text('CONTAINS:', x + padding, curY)
    doc.setTextColor(180, 50, 50)

    const allergenLines = doc.splitTextToSize(allergenText, innerW - prefixW)
    if (allergenLines.length === 1) {
      doc.text(allergenLines[0], x + padding + prefixW, curY)
      curY += badgeFontSize * 0.38 + 1
    } else {
      curY += badgeFontSize * 0.38
      const allLines = doc.splitTextToSize(allergenText, innerW)
      for (const line of allLines.slice(0, 2)) {
        if (curY + badgeFontSize * 0.38 > maxY) break
        doc.text(line, x + padding, curY)
        curY += badgeFontSize * 0.38
      }
      curY += 1
    }
  } else if (label.allergens.length === 0 && curY + badgeFontSize * 0.38 + 2 < maxY) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(badgeFontSize)
    doc.setTextColor(80, 140, 80)
    doc.text('No known allergens', x + padding, curY)
    curY += badgeFontSize * 0.38 + 1
  }

  // Reheat note
  if (label.reheatNote && curY + detailFontSize * 0.38 + 1 < maxY) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(detailFontSize)
    doc.setTextColor(60, 60, 60)
    const reheatLines = doc.splitTextToSize(label.reheatNote, innerW)
    for (const line of reheatLines.slice(0, 1)) {
      if (curY + detailFontSize * 0.38 > maxY) break
      doc.text(line, x + padding, curY)
      curY += detailFontSize * 0.38
    }
    curY += 1
  }

  // Date prepared (anchored toward bottom of label)
  const dateLineH = detailFontSize * 0.38
  const dateY = Math.max(curY, y + height - padding - dateLineH)
  if (dateY > curY && dateY + dateLineH <= y + height) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(detailFontSize)
    doc.setTextColor(120, 120, 120)
    doc.text('Prepared: ' + label.datePrepared, x + padding, dateY)
  }
}

// --- Public API ---

export async function generateServingLabels(
  eventId: string,
  optionsOrSize: Partial<LabelOptions> | LabelSize = '2x3'
): Promise<{ pdf: string; labelCount: number } | { error: string }> {
  const labelSize: LabelSize =
    typeof optionsOrSize === 'string' ? optionsOrSize : (optionsOrSize.labelSize ?? '2x3')
  try {
    const result = await fetchLabelData(eventId)
    if (!result) {
      return {
        error: 'Event not found, has no menu assigned, or no dishes in the menu.',
      }
    }

    const { labels } = result
    if (labels.length === 0) {
      return { error: 'No dishes found to generate labels for.' }
    }

    const grid = getLabelGrid(labelSize)
    const labelsPerPage = grid.cols * grid.rows
    const totalPages = Math.ceil(labels.length / labelsPerPage)

    const doc = new jsPDF({ unit: 'mm', format: 'letter' })

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage()

      const startIdx = page * labelsPerPage
      const pageLabels = labels.slice(startIdx, startIdx + labelsPerPage)

      for (let i = 0; i < pageLabels.length; i++) {
        const col = i % grid.cols
        const row = Math.floor(i / grid.cols)

        const lx = grid.marginXMm + col * (grid.labelWidthMm + grid.gapXMm)
        const ly = grid.marginYMm + row * (grid.labelHeightMm + grid.gapYMm)

        renderLabel(doc, pageLabels[i], lx, ly, grid.labelWidthMm, grid.labelHeightMm, labelSize)
      }
    }

    const pdfBase64 = doc.output('datauristring')
    return { pdf: pdfBase64, labelCount: labels.length }
  } catch (err) {
    console.error('[serving-labels] Generation failed', err)
    return { error: 'Failed to generate serving labels. Please try again.' }
  }
}

// --- Preview Count (lightweight, no PDF generation) ---

export async function getServingLabelCount(
  eventId: string
): Promise<{ count: number } | { error: string }> {
  try {
    const result = await fetchLabelData(eventId)
    if (!result) {
      return { error: 'Event not found or no menu assigned.' }
    }
    return { count: result.labels.length }
  } catch (err) {
    console.error('[serving-labels] Count failed', err)
    return { error: 'Failed to count labels.' }
  }
}
