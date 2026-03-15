// Serving Labels Generator
// Generates printable food labels for event dishes/components.
// Each label includes: dish name, allergens, dietary tags, prep/use-by dates,
// reheating instructions, client name, and chef branding.
// Labels are laid out in a grid on US Letter paper for easy cutting.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import { format, parseISO, addDays } from 'date-fns'

// ── Types ───────────────────────────────────────────────────────────────────

export type LabelOptions = {
  labelSize: '2x3' | '2x4' | '3x5'
  includeReheating: boolean
  includeAllergens: boolean
  prepDate: string // ISO date string
  shelfLifeDays: number // default 3
}

type LabelData = {
  dishName: string
  componentName: string | null
  allergenFlags: string[]
  dietaryTags: string[]
  reheatingNotes: string | null
  clientName: string
  chefName: string
  prepDate: string
  useByDate: string
}

// ── Label size configs (in mm) ──────────────────────────────────────────────

const LABEL_CONFIGS = {
  '2x3': { width: 76.2, height: 50.8 }, // 3" x 2" (width x height)
  '2x4': { width: 101.6, height: 50.8 }, // 4" x 2"
  '3x5': { width: 127.0, height: 76.2 }, // 5" x 3"
} as const

const LETTER_WIDTH = 215.9 // mm
const LETTER_HEIGHT = 279.4 // mm
const PAGE_MARGIN = 10 // mm

// ── Dietary tag abbreviations ───────────────────────────────────────────────

const DIETARY_ABBREV: Record<string, string> = {
  vegan: 'V',
  vegetarian: 'VG',
  'gluten-free': 'GF',
  gluten_free: 'GF',
  'dairy-free': 'DF',
  dairy_free: 'DF',
  'nut-free': 'NF',
  nut_free: 'NF',
  pescatarian: 'PESC',
  keto: 'KETO',
  paleo: 'PALEO',
  halal: 'HALAL',
  kosher: 'KOSHER',
}

// ── Allergen display names ──────────────────────────────────────────────────

const ALLERGEN_DISPLAY: Record<string, string> = {
  dairy: 'Dairy',
  eggs: 'Eggs',
  fish: 'Fish',
  shellfish: 'Shellfish',
  tree_nuts: 'Tree Nuts',
  peanuts: 'Peanuts',
  wheat: 'Wheat',
  soy: 'Soy',
  sesame: 'Sesame',
  gluten: 'Gluten',
  sulfites: 'Sulfites',
  mustard: 'Mustard',
  celery: 'Celery',
  lupin: 'Lupin',
  mollusks: 'Mollusks',
}

// ── Data fetcher ────────────────────────────────────────────────────────────

export async function fetchServingLabelsData(
  eventId: string,
  options: LabelOptions
): Promise<LabelData[] | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch event + client
  const { data: event } = await supabase
    .from('events')
    .select(
      `
      id, event_date,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Fetch chef info for branding
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', user.tenantId!)
    .single()

  const chefName = chef?.business_name || 'Chef'
  const clientName =
    (event.client as unknown as { full_name: string } | null)?.full_name ?? 'Client'

  // Find menu
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!menus || menus.length === 0) return null
  const menuId = menus[0].id

  // Fetch dishes
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, course_name, course_number, allergen_flags, dietary_tags')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  // Fetch components with recipes
  const dishIds = dishes.map((d) => d.id)
  const { data: components } = await supabase
    .from('components')
    .select(
      `
      id, name, dish_id, recipe_id, execution_notes, storage_notes,
      recipe:recipes(id, method, dietary_tags)
    `
    )
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (!components || components.length === 0) return null

  // Build dish lookup
  const dishById = new Map(dishes.map((d) => [d.id, d]))

  // For each component with a recipe, fetch allergen flags via the DB function
  const recipeIds = components
    .filter((c) => c.recipe_id)
    .map((c) => c.recipe_id!)
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe

  // Fetch allergen flags for all recipes
  const allergenMap = new Map<string, string[]>()
  for (const recipeId of recipeIds) {
    try {
      const { data } = await supabase.rpc('get_recipe_allergen_flags', {
        p_recipe_id: recipeId,
      })
      if (data) allergenMap.set(recipeId, data as string[])
    } catch {
      // Function may not exist yet; fall back to empty
    }
  }

  // Compute dates
  const prepDateStr = options.prepDate || new Date().toISOString().split('T')[0]
  const prepDate = parseISO(prepDateStr)
  const useByDate = addDays(prepDate, options.shelfLifeDays)
  const formattedPrepDate = format(prepDate, 'MMM d, yyyy')
  const formattedUseBy = format(useByDate, 'MMM d, yyyy')

  // Build labels: one per component
  const labels: LabelData[] = []

  for (const comp of components) {
    const dish = dishById.get(comp.dish_id)
    if (!dish) continue

    const recipe = comp.recipe as unknown as {
      id: string
      method: string | null
      dietary_tags: string[]
    } | null

    // Allergens: from recipe ingredients (via DB function), fall back to dish-level
    let allergens: string[] = []
    if (recipe?.id && allergenMap.has(recipe.id)) {
      allergens = allergenMap.get(recipe.id) || []
    }
    // Also merge dish-level allergen flags
    const dishAllergens = (dish.allergen_flags as string[]) || []
    const allAllergens = [...new Set([...allergens, ...dishAllergens])]

    // Dietary tags: merge recipe + dish level
    const recipeTags = recipe?.dietary_tags || []
    const dishTags = (dish.dietary_tags as string[]) || []
    const allDietaryTags = [...new Set([...recipeTags, ...dishTags])]

    // Reheating: from execution_notes or recipe method (first sentence)
    let reheatingNotes: string | null = null
    if (comp.execution_notes) {
      reheatingNotes = comp.execution_notes
    } else if (recipe?.method) {
      // Extract a brief note from method (first sentence, max 100 chars)
      const firstSentence = recipe.method.split(/[.!?]/)[0]?.trim()
      if (firstSentence && firstSentence.length <= 100) {
        reheatingNotes = firstSentence
      }
    }

    labels.push({
      dishName: dish.course_name,
      componentName: comp.name,
      allergenFlags: allAllergens,
      dietaryTags: allDietaryTags,
      reheatingNotes,
      clientName,
      chefName,
      prepDate: formattedPrepDate,
      useByDate: formattedUseBy,
    })
  }

  return labels
}

// ── PDF renderer ────────────────────────────────────────────────────────────

function renderLabel(
  doc: jsPDF,
  label: LabelData,
  x: number,
  y: number,
  width: number,
  height: number,
  options: LabelOptions
) {
  const padding = 3 // mm
  const innerW = width - padding * 2
  let curY = y + padding

  // Border with cut marks
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.rect(x, y, width, height)

  // Cut marks at corners (small L-shapes outside the border)
  const markLen = 3
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  // Top-left
  doc.line(x - markLen, y, x - 0.5, y)
  doc.line(x, y - markLen, x, y - 0.5)
  // Top-right
  doc.line(x + width + 0.5, y, x + width + markLen, y)
  doc.line(x + width, y - markLen, x + width, y - 0.5)
  // Bottom-left
  doc.line(x - markLen, y + height, x - 0.5, y + height)
  doc.line(x, y + height + 0.5, x, y + height + markLen)
  // Bottom-right
  doc.line(x + width + 0.5, y + height, x + width + markLen, y + height)
  doc.line(x + width, y + height + 0.5, x + width, y + height + markLen)

  // Determine font sizes based on label size
  const isSmall = options.labelSize === '2x3'
  const titleSize = isSmall ? 9 : 11
  const bodySize = isSmall ? 6 : 7
  const smallSize = isSmall ? 5 : 6

  // ── Dish / component name (large, bold) ──
  doc.setFontSize(titleSize)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)

  const displayName = label.componentName ? `${label.componentName}` : label.dishName

  const nameLines = doc.splitTextToSize(displayName, innerW) as string[]
  const lineH = titleSize * 0.38
  for (const line of nameLines.slice(0, 2)) {
    // max 2 lines
    doc.text(line, x + padding, curY + lineH)
    curY += lineH + 0.5
  }

  // Course name in smaller text if showing component
  if (label.componentName) {
    doc.setFontSize(smallSize)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    const courseLines = doc.splitTextToSize(label.dishName, innerW) as string[]
    doc.text(courseLines[0] || '', x + padding, curY + smallSize * 0.35)
    curY += smallSize * 0.38 + 0.5
    doc.setTextColor(0, 0, 0)
  }

  curY += 1

  // ── Dietary badges ──
  const dietaryBadges = label.dietaryTags
    .map((t) => DIETARY_ABBREV[t.toLowerCase()] || t.toUpperCase())
    .slice(0, 5) // max 5 badges

  if (dietaryBadges.length > 0) {
    doc.setFontSize(smallSize)
    doc.setFont('helvetica', 'bold')
    let badgeX = x + padding
    for (const badge of dietaryBadges) {
      const tw = doc.getTextWidth(badge) + 3
      if (badgeX + tw > x + width - padding) break

      // Badge background
      doc.setFillColor(34, 139, 34) // forest green
      doc.setDrawColor(34, 139, 34)
      const badgeH = smallSize * 0.45
      doc.roundedRect(badgeX, curY - 0.5, tw, badgeH + 1.5, 0.8, 0.8, 'F')

      // Badge text
      doc.setTextColor(255, 255, 255)
      doc.text(badge, badgeX + 1.5, curY + badgeH)
      doc.setTextColor(0, 0, 0)

      badgeX += tw + 1.5
    }
    curY += smallSize * 0.45 + 2.5
  }

  // ── Allergens ──
  if (options.includeAllergens && label.allergenFlags.length > 0) {
    doc.setFontSize(smallSize)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 0, 0)

    const allergenNames = label.allergenFlags
      .map((f) => ALLERGEN_DISPLAY[f.toLowerCase()] || f)
      .join(', ')

    const allergenText = `CONTAINS: ${allergenNames}`
    const allergenLines = doc.splitTextToSize(allergenText, innerW) as string[]
    for (const line of allergenLines.slice(0, 2)) {
      doc.text(line, x + padding, curY + smallSize * 0.35)
      curY += smallSize * 0.38 + 0.3
    }
    doc.setTextColor(0, 0, 0)
    curY += 0.5
  }

  // ── Dates ──
  doc.setFontSize(bodySize)
  doc.setFont('helvetica', 'normal')
  const bodyH = bodySize * 0.38

  doc.setFont('helvetica', 'bold')
  doc.text('Prepared:', x + padding, curY + bodyH)
  const prepLabelW = doc.getTextWidth('Prepared: ')
  doc.setFont('helvetica', 'normal')
  doc.text(label.prepDate, x + padding + prepLabelW, curY + bodyH)
  curY += bodyH + 0.5

  doc.setFont('helvetica', 'bold')
  doc.text('Use by:', x + padding, curY + bodyH)
  const useLabelW = doc.getTextWidth('Use by: ')
  doc.setFont('helvetica', 'normal')
  doc.text(label.useByDate, x + padding + useLabelW, curY + bodyH)
  curY += bodyH + 1

  // ── Reheating instructions ──
  if (options.includeReheating && label.reheatingNotes) {
    doc.setFontSize(smallSize)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(60, 60, 60)

    const reheatLines = doc.splitTextToSize(label.reheatingNotes, innerW) as string[]
    const maxReheatLines = isSmall ? 2 : 3
    for (const line of reheatLines.slice(0, maxReheatLines)) {
      if (curY + smallSize * 0.38 > y + height - padding - 4) break // leave room for footer
      doc.text(line, x + padding, curY + smallSize * 0.35)
      curY += smallSize * 0.38 + 0.2
    }
    doc.setTextColor(0, 0, 0)
  }

  // ── Footer: client name + chef branding ──
  doc.setFontSize(smallSize)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)

  const footerY = y + height - padding
  doc.text(`For: ${label.clientName}`, x + padding, footerY)

  doc.setFont('helvetica', 'italic')
  const chefText = `Prepared by ${label.chefName}`
  const chefTextW = doc.getTextWidth(chefText)
  doc.text(chefText, x + width - padding - chefTextW, footerY)

  doc.setTextColor(0, 0, 0)
}

// ── Main generator ──────────────────────────────────────────────────────────

export async function generateServingLabels(
  eventId: string,
  options?: Partial<LabelOptions>
): Promise<Buffer> {
  const opts: LabelOptions = {
    labelSize: options?.labelSize || '2x3',
    includeReheating: options?.includeReheating ?? true,
    includeAllergens: options?.includeAllergens ?? true,
    prepDate: options?.prepDate || new Date().toISOString().split('T')[0],
    shelfLifeDays: options?.shelfLifeDays ?? 3,
  }

  const labels = await fetchServingLabelsData(eventId, opts)
  if (!labels || labels.length === 0) {
    throw new Error('Cannot generate serving labels: no menu components found')
  }

  const config = LABEL_CONFIGS[opts.labelSize]
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })

  // Calculate grid layout
  const usableWidth = LETTER_WIDTH - PAGE_MARGIN * 2
  const usableHeight = LETTER_HEIGHT - PAGE_MARGIN * 2

  const cols = Math.floor(usableWidth / config.width)
  const rows = Math.floor(usableHeight / config.height)
  const labelsPerPage = cols * rows

  // Center the grid on the page
  const gridWidth = cols * config.width
  const gridHeight = rows * config.height
  const offsetX = PAGE_MARGIN + (usableWidth - gridWidth) / 2
  const offsetY = PAGE_MARGIN + (usableHeight - gridHeight) / 2

  for (let i = 0; i < labels.length; i++) {
    if (i > 0 && i % labelsPerPage === 0) {
      doc.addPage('letter')
    }

    const indexOnPage = i % labelsPerPage
    const col = indexOnPage % cols
    const row = Math.floor(indexOnPage / cols)

    const x = offsetX + col * config.width
    const y = offsetY + row * config.height

    renderLabel(doc, labels[i], x, y, config.width, config.height, opts)
  }

  return Buffer.from(doc.output('arraybuffer'))
}
