// Consolidated Grocery List Generator
// Merges grocery lists across multiple events in a date range into one shopping list.
// Shared ingredients are combined with per-event attribution.
// Uses the same inventory subtraction, unit conversion, and budget logic as single-event lists.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from './pdf-layout'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import { convertQuantity } from '@/lib/units/conversion-engine'

// ─── Types ────────────────────────────────────────────────────────────────────

type EventSource = {
  eventId: string
  eventDate: string
  occasion: string | null
  clientName: string
  guestCount: number
}

type ConsolidatedGroceryItem = {
  ingredientId: string
  ingredientName: string
  totalQuantity: number
  unit: string
  category: string
  lastPriceCents: number | null
  isOptional: boolean
  onHandQty: number | null
  needToBuyQty: number
  // Which events need this ingredient and how much
  eventBreakdown: { eventId: string; label: string; quantity: number }[]
  sharedAcrossEvents: boolean // true if 2+ events need this
}

type StoreSection = {
  sectionName: string
  items: ConsolidatedGroceryItem[]
}

export type ConsolidatedGroceryListData = {
  events: EventSource[]
  dateRange: { start: string; end: string }
  groceryStoreName: string
  liquorStoreName: string
  stop1Sections: StoreSection[]
  stop2Items: ConsolidatedGroceryItem[]
  budget: {
    totalCeilingCents: number | null
    totalProjectedCents: number | null
  }
  totalBuyItems: number
  hasStop2: boolean
  // Merged allergies across ALL events
  allergies: string[]
  // Summary stats
  sharedIngredientCount: number
  totalEventCount: number
}

// ─── Category → Section Mapping (shared with single-event) ──────────────────

const SECTION_ORDER = ['PROTEINS', 'PRODUCE', 'DAIRY / FATS', 'PANTRY', 'SPECIALTY']

const CATEGORY_TO_SECTION: Record<string, string> = {
  protein: 'PROTEINS',
  produce: 'PRODUCE',
  fresh_herb: 'PRODUCE',
  dry_herb: 'PRODUCE',
  dairy: 'DAIRY / FATS',
  pantry: 'PANTRY',
  baking: 'PANTRY',
  canned: 'PANTRY',
  condiment: 'PANTRY',
  spice: 'PANTRY',
  oil: 'PANTRY',
  frozen: 'SPECIALTY',
  specialty: 'SPECIALTY',
  beverage: 'SPECIALTY',
  other: 'SPECIALTY',
}

const STOP_2_CATEGORIES = new Set(['alcohol'])

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchConsolidatedGroceryData(
  startDate: string,
  endDate: string
): Promise<ConsolidatedGroceryListData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch events in date range with actionable statuses
  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, event_date, occasion, guest_count, quoted_price_cents, allergies,
      client:clients(full_name, allergies)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['confirmed', 'paid', 'accepted', 'in_progress'])
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })

  if (error || !events || events.length === 0) return null

  // Chef preferences
  const { data: prefs } = await db
    .from('chef_preferences')
    .select('default_grocery_store, default_liquor_store, target_margin_percent')
    .eq('tenant_id', user.tenantId!)
    .single()

  const groceryStoreName = (prefs?.default_grocery_store || 'GROCERY STORE').toUpperCase()
  const liquorStoreName = (prefs?.default_liquor_store || 'LIQUOR STORE').toUpperCase()
  const targetMargin = prefs?.target_margin_percent ?? null

  // Build event sources and collect all allergies
  const eventSources: EventSource[] = []
  const allAllergies = new Set<string>()
  let totalCeilingCents = 0
  let hasCeiling = false

  for (const event of events) {
    const clientData = event.client as unknown as {
      full_name: string
      allergies: string[] | null
    } | null

    eventSources.push({
      eventId: event.id,
      eventDate: event.event_date,
      occasion: event.occasion,
      clientName: clientData?.full_name ?? 'Unknown',
      guestCount: event.guest_count,
    })

    for (const a of event.allergies ?? []) allAllergies.add(a.trim())
    for (const a of clientData?.allergies ?? []) allAllergies.add(a.trim())

    // Accumulate budget ceilings
    if (event.quoted_price_cents && targetMargin != null) {
      const ceiling = Math.round(event.quoted_price_cents * (1 - Number(targetMargin) / 100))
      totalCeilingCents += ceiling
      hasCeiling = true
    }
  }

  // For each event, fetch its menu -> dishes -> components -> recipe_ingredients
  // Key: ingredientId::unit -> consolidated item
  type AggEntry = Omit<ConsolidatedGroceryItem, 'onHandQty' | 'needToBuyQty'>
  const aggregated = new Map<string, AggEntry>()

  let projectedCents = 0
  let priceCount = 0
  let totalIngredientCount = 0

  for (const event of events) {
    const eventLabel = `${format(parseISO(dateToDateString(event.event_date as Date | string)), 'M/d')} ${(event.occasion || '').slice(0, 15) || 'Event'}`

    // Menu for this event
    const { data: menus } = await db
      .from('menus')
      .select('id')
      .eq('event_id', event.id)
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: true })
      .limit(1)

    if (!menus || menus.length === 0) continue
    const menuId = menus[0].id

    // Dishes
    const { data: dishes } = await db
      .from('dishes')
      .select('id, course_number')
      .eq('menu_id', menuId)
      .eq('tenant_id', user.tenantId!)

    if (!dishes || dishes.length === 0) continue

    // Components
    const dishIds = dishes.map((d: any) => d.id)
    const { data: components } = await db
      .from('components')
      .select('id, dish_id, recipe_id, scale_factor')
      .in('dish_id', dishIds)
      .eq('tenant_id', user.tenantId!)

    if (!components) continue

    const withRecipe = components.filter((c: any) => c.recipe_id)
    const recipeToScale = new Map<string, number[]>()
    for (const comp of withRecipe) {
      const existing = recipeToScale.get(comp.recipe_id!) || []
      existing.push(Number(comp.scale_factor))
      recipeToScale.set(comp.recipe_id!, existing)
    }

    const recipeIds = [...recipeToScale.keys()]
    if (recipeIds.length === 0) continue

    // Recipe ingredients
    const { data: recipeIngredients } = await db
      .from('recipe_ingredients')
      .select(
        `
        recipe_id, ingredient_id, quantity, unit, is_optional,
        ingredient:ingredients(id, name, category, is_staple, last_price_cents)
      `
      )
      .in('recipe_id', recipeIds)

    if (!recipeIngredients) continue

    for (const ri of recipeIngredients) {
      const ingredient = ri.ingredient as unknown as {
        id: string
        name: string
        category: string
        is_staple: boolean
        last_price_cents: number | null
      } | null

      if (!ingredient) continue
      if (ingredient.is_staple) continue

      const scaleFactors = recipeToScale.get(ri.recipe_id) || [1]
      for (const sf of scaleFactors) {
        const scaledQty = Number(ri.quantity) * sf
        const key = `${ingredient.id}::${ri.unit}`

        const existing = aggregated.get(key)
        if (existing) {
          existing.totalQuantity += scaledQty
          // Add to event breakdown
          const eventEntry = existing.eventBreakdown.find((e) => e.eventId === event.id)
          if (eventEntry) {
            eventEntry.quantity += scaledQty
          } else {
            existing.eventBreakdown.push({
              eventId: event.id,
              label: eventLabel,
              quantity: scaledQty,
            })
            existing.sharedAcrossEvents = existing.eventBreakdown.length >= 2
          }
        } else {
          totalIngredientCount++
          aggregated.set(key, {
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            totalQuantity: scaledQty,
            unit: ri.unit,
            category: ingredient.category,
            lastPriceCents: ingredient.last_price_cents,
            isOptional: ri.is_optional,
            eventBreakdown: [{ eventId: event.id, label: eventLabel, quantity: scaledQty }],
            sharedAcrossEvents: false,
          })
        }
      }
    }
  }

  if (aggregated.size === 0) return null

  // ── Query current inventory ─────────────────────────────────────────────────
  const ingredientIds = [...new Set(Array.from(aggregated.values()).map((e) => e.ingredientId))]
  const onHandMap = new Map<string, { qty: number; unit: string }>()

  if (ingredientIds.length > 0) {
    try {
      const { data: stockData } = await db
        .from('inventory_current_stock')
        .select('ingredient_id, current_qty, unit')
        .eq('chef_id', user.tenantId!)
        .in('ingredient_id', ingredientIds)

      for (const row of (stockData ?? []) as any[]) {
        if (row.ingredient_id && Number(row.current_qty) > 0) {
          onHandMap.set(row.ingredient_id, {
            qty: Number(row.current_qty),
            unit: row.unit ?? 'each',
          })
        }
      }
    } catch {
      // Non-blocking
    }
  }

  // ── Sort and bin ────────────────────────────────────────────────────────────
  const stop1Map = new Map<string, ConsolidatedGroceryItem[]>()
  const stop2Items: ConsolidatedGroceryItem[] = []
  let sharedIngredientCount = 0

  for (const entry of aggregated.values()) {
    // Inventory subtraction
    let onHandQty: number | null = null
    let needToBuyQty = entry.totalQuantity
    const stock = onHandMap.get(entry.ingredientId)
    if (stock && stock.qty > 0) {
      let stockInRecipeUnit = stock.qty
      if (stock.unit !== entry.unit) {
        const converted = convertQuantity(stock.qty, stock.unit, entry.unit)
        stockInRecipeUnit = converted !== null ? converted : 0
      }
      onHandQty = stockInRecipeUnit > 0 ? stockInRecipeUnit : null
      needToBuyQty = Math.max(0, entry.totalQuantity - stockInRecipeUnit)
    }

    if (needToBuyQty <= 0 && !entry.isOptional) continue

    if (entry.sharedAcrossEvents) sharedIngredientCount++

    const item: ConsolidatedGroceryItem = {
      ...entry,
      onHandQty,
      needToBuyQty: needToBuyQty > 0 ? needToBuyQty : entry.totalQuantity,
    }

    if (entry.lastPriceCents != null) {
      projectedCents += item.needToBuyQty * entry.lastPriceCents
      priceCount++
    }

    if (STOP_2_CATEGORIES.has(entry.category)) {
      stop2Items.push(item)
    } else {
      const section = CATEGORY_TO_SECTION[entry.category] || 'SPECIALTY'
      const existing = stop1Map.get(section) || []
      existing.push(item)
      stop1Map.set(section, existing)
    }
  }

  const stop1Sections: StoreSection[] = SECTION_ORDER.filter(
    (s) => (stop1Map.get(s) || []).length > 0
  ).map((s) => ({
    sectionName: s,
    items: (stop1Map.get(s) || []).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName)),
  }))

  stop2Items.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))

  const showProjected = totalIngredientCount > 0 && priceCount >= totalIngredientCount * 0.5
  const totalBuyItems =
    stop1Sections.reduce((sum, s) => sum + s.items.length, 0) + stop2Items.length

  return {
    events: eventSources,
    dateRange: { start: startDate, end: endDate },
    groceryStoreName,
    liquorStoreName,
    stop1Sections,
    stop2Items,
    budget: {
      totalCeilingCents: hasCeiling ? totalCeilingCents : null,
      totalProjectedCents: showProjected ? Math.round(projectedCents) : null,
    },
    totalBuyItems,
    hasStop2: stop2Items.length > 0,
    allergies: Array.from(allAllergies),
    sharedIngredientCount,
    totalEventCount: eventSources.length,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatQuantity(qty: number, unit: string): string {
  const rounded = qty === Math.floor(qty) ? qty : parseFloat(qty.toFixed(2))
  return `${rounded} ${unit}`
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

// ─── Render ───────────────────────────────────────────────────────────────────

export async function renderConsolidatedGroceryList(
  pdf: PDFLayout,
  data: ConsolidatedGroceryListData
) {
  const { events, stop1Sections, stop2Items, budget, totalBuyItems, hasStop2 } = data

  // Estimate density for font scaling
  const totalItems = totalBuyItems
  if (totalItems > 50) pdf.setFontScale(0.65)
  else if (totalItems > 35) pdf.setFontScale(0.75)
  else if (totalItems > 25) pdf.setFontScale(0.85)

  // ── Title ──────────────────────────────────────────────────────────────────
  const startStr = format(parseISO(data.dateRange.start), 'MMM d')
  const endStr = format(parseISO(data.dateRange.end), 'MMM d, yyyy')
  pdf.title(`CONSOLIDATED GROCERY LIST`, 12)
  pdf.text(`${startStr} - ${endStr}  |  ${events.length} events`, 9, 'normal', 0)
  pdf.space(1)

  // ── Event summary bar ─────────────────────────────────────────────────────
  for (const ev of events) {
    const dateStr = format(parseISO(dateToDateString(ev.eventDate as Date | string)), 'EEE M/d')
    const label = `${dateStr}: ${ev.clientName} (${ev.guestCount} guests)${ev.occasion ? ' - ' + ev.occasion : ''}`
    pdf.bullet(label, 7, 2)
  }
  pdf.space(2)

  // Budget line
  const budgetParts: string[] = []
  if (budget.totalCeilingCents != null)
    budgetParts.push(`Combined budget: ${formatCents(budget.totalCeilingCents)}`)
  if (budget.totalProjectedCents != null)
    budgetParts.push(`Projected: ~${formatCents(budget.totalProjectedCents)}`)
  if (data.sharedIngredientCount > 0)
    budgetParts.push(`${data.sharedIngredientCount} shared ingredients`)
  if (budgetParts.length > 0) {
    pdf.text(budgetParts.join('  |  '), 8, 'normal', 0)
    pdf.space(1)
  }

  // ── Allergy Alert ────────────────────────────────────────────────────────
  if (data.allergies.length > 0) {
    pdf.warningBox(`* ALLERGY ALERT: ${data.allergies.map((a) => a.toUpperCase()).join(', ')}`)
    pdf.space(1)
  }

  // ── Stop 1: Grocery Store ─────────────────────────────────────────────────
  if (stop1Sections.length > 0) {
    pdf.sectionHeader(`STOP 1: ${data.groceryStoreName}`, 10, true)

    for (const section of stop1Sections) {
      pdf.courseHeader(section.sectionName, 9)
      for (const item of section.items) {
        const qtyStr = formatQuantity(item.needToBuyQty, item.unit)
        const onHandNote =
          item.onHandQty != null
            ? ` (have ${formatQuantity(item.onHandQty, item.unit)} on hand)`
            : ''

        // Show event attribution for shared ingredients
        let eventNote = ''
        if (item.sharedAcrossEvents) {
          eventNote = ` [${item.eventBreakdown.map((e) => e.label).join(', ')}]`
        }

        const label = `${item.ingredientName} - ${qtyStr}${onHandNote}${eventNote}`
        pdf.checkbox(label, 7.5)
      }
      pdf.space(1)
    }
  }

  // ── Stop 2: Liquor Store ──────────────────────────────────────────────────
  if (hasStop2) {
    pdf.sectionHeader(`STOP 2: ${data.liquorStoreName}`, 10, true)
    for (const item of stop2Items) {
      const qtyStr = formatQuantity(item.needToBuyQty, item.unit)
      const onHandNote =
        item.onHandQty != null ? ` (have ${formatQuantity(item.onHandQty, item.unit)} on hand)` : ''
      let eventNote = ''
      if (item.sharedAcrossEvents) {
        eventNote = ` [${item.eventBreakdown.map((e) => e.label).join(', ')}]`
      }
      const label = `${item.ingredientName} - ${qtyStr}${onHandNote}${eventNote}`
      pdf.checkbox(label, 7.5)
    }
    pdf.space(1)
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const stops = hasStop2 ? 2 : 1
  const footerParts = [
    `${totalBuyItems} items`,
    `${stops} stop${stops > 1 ? 's' : ''}`,
    `${events.length} events`,
  ]
  if (budget.totalCeilingCents != null)
    footerParts.push(`Budget: ${formatCents(budget.totalCeilingCents)}`)
  pdf.footer(footerParts.join('  \u00B7  '))
}

// ─── Generate ─────────────────────────────────────────────────────────────────

/** Generate a consolidated grocery list PDF for a date range */
export async function generateConsolidatedGroceryList(
  startDate: string,
  endDate: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchConsolidatedGroceryData(startDate, endDate)
  if (!data) throw new Error('No upcoming events with menus found in the specified date range')

  const pdf = new PDFLayout()
  renderConsolidatedGroceryList(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Consolidated Grocery List')
  return pdf.toBuffer()
}
