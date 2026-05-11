'use server'

// Bulk Buy Intelligence Engine
// Aggregates ingredient needs across events in a date range.
// Identifies bulk purchase opportunities with savings estimates.
// Factors in shelf life to avoid spoilage.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────────

export interface BulkBuyOpportunity {
  ingredientId: string
  ingredientName: string
  category: string
  /** Total quantity needed across all events */
  individualTotal: number
  unit: string
  /** Suggested bulk size (rounded up to common bulk sizes) */
  bulkSize: number
  /** Estimated per-unit price at regular quantity */
  individualPriceCents: number | null
  /** Estimated per-unit price at bulk quantity (typically 15-25% less) */
  bulkPriceCents: number | null
  /** Estimated dollar savings from bulk buying */
  savingsCents: number
  /** Events that need this ingredient */
  events: { eventId: string; eventName: string; eventDate: string; quantity: number }[]
  /** Approximate shelf life in days */
  shelfLifeDays: number
  /** Whether bulk buying is recommended given shelf life */
  recommendation: 'recommended' | 'caution' | 'skip'
  /** Reason for the recommendation */
  reason: string
  eventCount: number
}

export interface ShoppingConsolidationItem {
  ingredientId: string
  ingredientName: string
  category: string
  storeSection: string
  totalQuantity: number
  unit: string
  events: { eventId: string; eventName: string; eventDate: string; quantity: number }[]
  eventCount: number
}

export interface ShoppingConsolidation {
  items: ShoppingConsolidationItem[]
  totalItems: number
  eventsCovered: number
  dateRange: { start: string; end: string }
}

// ── Shelf life estimates by category ────────────────────────────────────────

const SHELF_LIFE_DAYS: Record<string, number> = {
  protein: 3,
  produce: 5,
  dairy: 7,
  pantry: 180,
  spice: 365,
  oil: 180,
  alcohol: 365,
  baking: 90,
  frozen: 90,
  canned: 365,
  fresh_herb: 5,
  dry_herb: 180,
  condiment: 90,
  beverage: 30,
  specialty: 14,
  other: 14,
}

// ── Store section assignment ────────────────────────────────────────────────

const CATEGORY_TO_SECTION: Record<string, string> = {
  protein: 'Meat & Seafood',
  produce: 'Produce',
  dairy: 'Dairy & Eggs',
  pantry: 'Pantry & Dry Goods',
  spice: 'Spices & Seasonings',
  oil: 'Oils & Vinegars',
  alcohol: 'Beverages & Alcohol',
  baking: 'Baking',
  frozen: 'Frozen',
  canned: 'Canned Goods',
  fresh_herb: 'Produce',
  dry_herb: 'Spices & Seasonings',
  condiment: 'Condiments',
  beverage: 'Beverages & Alcohol',
  specialty: 'Specialty',
  other: 'Other',
}

// ── Bulk size rounding ──────────────────────────────────────────────────────

function suggestBulkSize(quantity: number, unit: string): number {
  // Round up to common bulk sizes
  const u = (unit || '').toLowerCase()

  if (u === 'lb' || u === 'lbs') {
    if (quantity <= 3) return 5
    if (quantity <= 8) return 10
    if (quantity <= 15) return 20
    return Math.ceil(quantity / 5) * 5
  }

  if (u === 'oz') {
    if (quantity <= 16) return 32
    if (quantity <= 48) return 64
    return Math.ceil(quantity / 16) * 16
  }

  if (u === 'each' || u === 'ea') {
    if (quantity <= 6) return 12
    if (quantity <= 20) return 24
    return Math.ceil(quantity / 12) * 12
  }

  // Generic: round up 25%
  return Math.ceil(quantity * 1.25)
}

// ── Main: Find bulk buy opportunities ───────────────────────────────────────

export async function findBulkBuyOpportunities(
  dateRange: { start: string; end: string }
): Promise<BulkBuyOpportunity[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Get events in date range (non-cancelled)
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, menu_id')
    .eq('tenant_id', tenantId)
    .gte('event_date', dateRange.start)
    .lte('event_date', dateRange.end)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: true })

  if (!events || events.length < 2) return []

  const eventIds = events.map((e: any) => e.id)
  const eventMap = new Map<string, any>()
  for (const e of events) {
    eventMap.set(e.id, e)
  }

  // 2. Get menus for these events
  const { data: menus } = await db
    .from('menus')
    .select('id, event_id')
    .in('event_id', eventIds)
    .eq('tenant_id', tenantId)

  if (!menus || menus.length === 0) return []

  const menuEventMap = new Map<string, string>()
  for (const m of menus as any[]) {
    if (m.event_id) menuEventMap.set(m.id, m.event_id)
  }

  const allMenuIds = menus.map((m: any) => m.id)

  // 3. Get dishes
  const { data: dishes } = await db
    .from('dishes')
    .select('id, menu_id')
    .in('menu_id', allMenuIds)

  if (!dishes || dishes.length === 0) return []

  const dishMenuMap = new Map<string, string>()
  for (const d of dishes as any[]) {
    dishMenuMap.set(d.id, d.menu_id)
  }

  const dishIds = dishes.map((d: any) => d.id)

  // 4. Get components with recipe links
  const { data: components } = await db
    .from('components')
    .select('id, dish_id, recipe_id')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) return []

  // Build recipe -> events mapping
  const recipeEventMap = new Map<string, Set<string>>()

  for (const c of components as any[]) {
    if (!c.recipe_id) continue
    const menuId = dishMenuMap.get(c.dish_id)
    if (!menuId) continue
    const eventId = menuEventMap.get(menuId)
    if (!eventId) continue

    if (!recipeEventMap.has(c.recipe_id)) recipeEventMap.set(c.recipe_id, new Set())
    recipeEventMap.get(c.recipe_id)!.add(eventId)
  }

  const recipeIds = [...new Set(components.map((c: any) => c.recipe_id).filter(Boolean))]
  if (recipeIds.length === 0) return []

  // 5. Get recipe ingredients
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit')
    .in('recipe_id', recipeIds)

  if (!recipeIngredients || recipeIngredients.length === 0) return []

  // 6. Get ingredient info
  const ingredientIds = [...new Set((recipeIngredients as any[]).map((ri: any) => ri.ingredient_id))]

  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name, category')
    .in('id', ingredientIds)

  if (!ingredients) return []

  const ingredientInfo = new Map<string, { name: string; category: string }>()
  for (const ing of ingredients as any[]) {
    ingredientInfo.set(ing.id, { name: ing.name, category: ing.category || 'other' })
  }

  // 7. Try to get price history for savings estimates
  let priceMap = new Map<string, number>()
  try {
    const { data: prices } = await db
      .from('ingredient_price_history')
      .select('ingredient_id, price_cents')
      .in('ingredient_id', ingredientIds)
      .eq('tenant_id', tenantId)
      .order('recorded_at', { ascending: false })

    if (prices) {
      for (const p of prices as any[]) {
        if (!priceMap.has(p.ingredient_id) && p.price_cents > 0) {
          priceMap.set(p.ingredient_id, p.price_cents)
        }
      }
    }
  } catch {
    // Price lookup is non-blocking
  }

  // 8. Aggregate per event
  const aggregation = new Map<string, {
    ingredientId: string
    perEvent: Map<string, { quantity: number; unit: string }>
  }>()

  for (const ri of recipeIngredients as any[]) {
    const riEventIds = recipeEventMap.get(ri.recipe_id)
    if (!riEventIds) continue

    for (const eventId of riEventIds) {
      const key = ri.ingredient_id

      if (!aggregation.has(key)) {
        aggregation.set(key, {
          ingredientId: ri.ingredient_id,
          perEvent: new Map(),
        })
      }

      const agg = aggregation.get(key)!
      const existing = agg.perEvent.get(eventId)
      if (existing) {
        existing.quantity += Number(ri.quantity) || 0
      } else {
        agg.perEvent.set(eventId, {
          quantity: Number(ri.quantity) || 0,
          unit: ri.unit || '',
        })
      }
    }
  }

  // 9. Build bulk buy opportunities (2+ events)
  const opportunities: BulkBuyOpportunity[] = []

  for (const [, agg] of aggregation) {
    if (agg.perEvent.size < 2) continue

    const info = ingredientInfo.get(agg.ingredientId)
    if (!info) continue

    let totalQuantity = 0
    let unit = ''
    const eventEntries: BulkBuyOpportunity['events'] = []

    for (const [eventId, data] of agg.perEvent) {
      const event = eventMap.get(eventId)
      if (!event) continue

      totalQuantity += data.quantity
      unit = data.unit || unit

      eventEntries.push({
        eventId,
        eventName: event.occasion || 'Untitled Event',
        eventDate: event.event_date,
        quantity: Math.round(data.quantity * 100) / 100,
      })
    }

    const bulkSize = suggestBulkSize(totalQuantity, unit)
    const shelfLifeDays = SHELF_LIFE_DAYS[info.category] || 14
    const individualPrice = priceMap.get(agg.ingredientId) || null

    // Calculate date span to check against shelf life
    const dates = eventEntries.map(e => new Date(e.eventDate).getTime())
    const dateSpanDays = Math.ceil((Math.max(...dates) - Math.min(...dates)) / (24 * 60 * 60 * 1000))

    // Recommendation based on shelf life vs date span
    let recommendation: BulkBuyOpportunity['recommendation'] = 'recommended'
    let reason = 'Bulk buying saves time and money across multiple events'

    if (dateSpanDays > shelfLifeDays) {
      recommendation = 'skip'
      reason = `${shelfLifeDays}-day shelf life is shorter than the ${dateSpanDays}-day span between events`
    } else if (dateSpanDays > shelfLifeDays * 0.7) {
      recommendation = 'caution'
      reason = `Tight shelf life: ${shelfLifeDays} days vs ${dateSpanDays}-day event span. Buy close to first event.`
    }

    // Savings estimate: bulk typically 15-20% cheaper
    const bulkDiscountPct = 0.18
    let savingsCents = 0
    let bulkPriceCents: number | null = null

    if (individualPrice) {
      const individualTotal = Math.round(individualPrice * totalQuantity)
      bulkPriceCents = Math.round(individualPrice * (1 - bulkDiscountPct))
      const bulkTotal = Math.round(bulkPriceCents * bulkSize)
      savingsCents = Math.max(0, individualTotal - bulkTotal)

      // If spoilage risk is high, reduce savings estimate
      if (recommendation === 'caution') savingsCents = Math.round(savingsCents * 0.5)
      if (recommendation === 'skip') savingsCents = 0
    }

    opportunities.push({
      ingredientId: agg.ingredientId,
      ingredientName: info.name,
      category: info.category,
      individualTotal: Math.round(totalQuantity * 100) / 100,
      unit,
      bulkSize,
      individualPriceCents: individualPrice,
      bulkPriceCents,
      savingsCents,
      events: eventEntries.sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
      shelfLifeDays,
      recommendation,
      reason,
      eventCount: eventEntries.length,
    })
  }

  // Sort: recommended first, then by savings (desc)
  const recOrder = { recommended: 0, caution: 1, skip: 2 }
  opportunities.sort((a, b) => {
    const recDiff = recOrder[a.recommendation] - recOrder[b.recommendation]
    if (recDiff !== 0) return recDiff
    return b.savingsCents - a.savingsCents
  })

  return opportunities
}

// ── Shopping Consolidation ──────────────────────────────────────────────────

export async function getShoppingConsolidation(
  dateRange: { start: string; end: string }
): Promise<ShoppingConsolidation> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Get events in date range (non-cancelled)
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, menu_id')
    .eq('tenant_id', tenantId)
    .gte('event_date', dateRange.start)
    .lte('event_date', dateRange.end)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) {
    return { items: [], totalItems: 0, eventsCovered: 0, dateRange }
  }

  const eventIds = events.map((e: any) => e.id)
  const eventMap = new Map<string, any>()
  for (const e of events) {
    eventMap.set(e.id, e)
  }

  // 2. Get menus
  const { data: menus } = await db
    .from('menus')
    .select('id, event_id')
    .in('event_id', eventIds)
    .eq('tenant_id', tenantId)

  if (!menus || menus.length === 0) {
    return { items: [], totalItems: 0, eventsCovered: 0, dateRange }
  }

  const menuEventMap = new Map<string, string>()
  for (const m of menus as any[]) {
    if (m.event_id) menuEventMap.set(m.id, m.event_id)
  }

  const allMenuIds = menus.map((m: any) => m.id)

  // 3. Get dishes
  const { data: dishes } = await db
    .from('dishes')
    .select('id, menu_id')
    .in('menu_id', allMenuIds)

  if (!dishes || dishes.length === 0) {
    return { items: [], totalItems: 0, eventsCovered: 0, dateRange }
  }

  const dishMenuMap = new Map<string, string>()
  for (const d of dishes as any[]) {
    dishMenuMap.set(d.id, d.menu_id)
  }

  const dishIds = dishes.map((d: any) => d.id)

  // 4. Get components with recipe links
  const { data: components } = await db
    .from('components')
    .select('id, dish_id, recipe_id')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) {
    return { items: [], totalItems: 0, eventsCovered: events.length, dateRange }
  }

  // Build recipe -> events mapping
  const recipeEventMap = new Map<string, Set<string>>()

  for (const c of components as any[]) {
    if (!c.recipe_id) continue
    const menuId = dishMenuMap.get(c.dish_id)
    if (!menuId) continue
    const eventId = menuEventMap.get(menuId)
    if (!eventId) continue

    if (!recipeEventMap.has(c.recipe_id)) recipeEventMap.set(c.recipe_id, new Set())
    recipeEventMap.get(c.recipe_id)!.add(eventId)
  }

  const recipeIds = [...new Set(components.map((c: any) => c.recipe_id).filter(Boolean))]
  if (recipeIds.length === 0) {
    return { items: [], totalItems: 0, eventsCovered: events.length, dateRange }
  }

  // 5. Get recipe ingredients
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit')
    .in('recipe_id', recipeIds)

  if (!recipeIngredients || recipeIngredients.length === 0) {
    return { items: [], totalItems: 0, eventsCovered: events.length, dateRange }
  }

  // 6. Get ingredient info
  const ingredientIds = [...new Set((recipeIngredients as any[]).map((ri: any) => ri.ingredient_id))]

  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name, category')
    .in('id', ingredientIds)

  if (!ingredients) {
    return { items: [], totalItems: 0, eventsCovered: events.length, dateRange }
  }

  const ingredientInfo = new Map<string, { name: string; category: string }>()
  for (const ing of ingredients as any[]) {
    ingredientInfo.set(ing.id, { name: ing.name, category: ing.category || 'other' })
  }

  // 7. Aggregate all ingredients across events
  const aggregation = new Map<string, {
    ingredientId: string
    totalQuantity: number
    unit: string
    perEvent: Map<string, number>
  }>()

  for (const ri of recipeIngredients as any[]) {
    const riEventIds = recipeEventMap.get(ri.recipe_id)
    if (!riEventIds) continue

    for (const eventId of riEventIds) {
      const key = ri.ingredient_id

      if (!aggregation.has(key)) {
        aggregation.set(key, {
          ingredientId: ri.ingredient_id,
          totalQuantity: 0,
          unit: ri.unit || '',
          perEvent: new Map(),
        })
      }

      const agg = aggregation.get(key)!
      const qty = Number(ri.quantity) || 0
      agg.totalQuantity += qty
      agg.perEvent.set(eventId, (agg.perEvent.get(eventId) || 0) + qty)
    }
  }

  // 8. Build consolidated shopping list
  const items: ShoppingConsolidationItem[] = []

  for (const [, agg] of aggregation) {
    const info = ingredientInfo.get(agg.ingredientId)
    if (!info) continue

    const eventEntries: ShoppingConsolidationItem['events'] = []
    for (const [eventId, qty] of agg.perEvent) {
      const event = eventMap.get(eventId)
      if (!event) continue
      eventEntries.push({
        eventId,
        eventName: event.occasion || 'Untitled Event',
        eventDate: event.event_date,
        quantity: Math.round(qty * 100) / 100,
      })
    }

    items.push({
      ingredientId: agg.ingredientId,
      ingredientName: info.name,
      category: info.category,
      storeSection: CATEGORY_TO_SECTION[info.category] || 'Other',
      totalQuantity: Math.round(agg.totalQuantity * 100) / 100,
      unit: agg.unit,
      events: eventEntries.sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
      eventCount: eventEntries.length,
    })
  }

  // Sort by store section, then alphabetically within section
  const SECTION_ORDER = [
    'Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods',
    'Spices & Seasonings', 'Oils & Vinegars', 'Canned Goods', 'Baking',
    'Condiments', 'Frozen', 'Beverages & Alcohol', 'Specialty', 'Other',
  ]

  items.sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.storeSection)
    const bi = SECTION_ORDER.indexOf(b.storeSection)
    const sectionDiff = (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    if (sectionDiff !== 0) return sectionDiff
    return a.ingredientName.localeCompare(b.ingredientName)
  })

  return {
    items,
    totalItems: items.length,
    eventsCovered: events.length,
    dateRange,
  }
}
