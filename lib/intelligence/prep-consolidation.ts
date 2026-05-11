'use server'

// Prep Consolidation Engine
// Finds cross-event prep opportunities: same ingredient/component across multiple events
// in a date range. Groups them into batch prep plans with time savings estimates.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConsolidationOpportunity {
  /** The shared ingredient or component name */
  ingredientName: string
  ingredientId: string | null
  /** Which events need this item */
  events: {
    eventId: string
    eventName: string
    eventDate: string
    quantity: number
    unit: string
    guestCount: number
    recipeName: string
  }[]
  /** Sum of individual quantities across events */
  batchQuantity: number
  unit: string
  /** Technique or category (e.g. "stock", "sauce", "protein") */
  technique: string
  /** Estimated minutes saved by batching vs individual prep */
  timeSavedMinutes: number
  /** Number of events this serves */
  eventCount: number
}

export interface ConsolidatedPrepDay {
  date: string
  dayOfWeek: string
  items: {
    ingredientName: string
    batchQuantity: number
    unit: string
    technique: string
    events: string[] // event names
    prepMinutes: number
  }[]
  totalPrepMinutes: number
}

export interface WeeklyPrepPlan {
  days: ConsolidatedPrepDay[]
  totalPrepMinutes: number
  totalSavedMinutes: number
  eventsCovered: number
}

// ── Helper: ISO date string ─────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Technique classification ────────────────────────────────────────────────

function classifyTechnique(category: string | null, name: string): string {
  const lowerName = (name || '').toLowerCase()
  const lowerCat = (category || '').toLowerCase()

  if (lowerName.includes('stock') || lowerName.includes('broth')) return 'stock'
  if (lowerName.includes('sauce') || lowerCat === 'condiment') return 'sauce'
  if (lowerName.includes('dough') || lowerName.includes('pastry')) return 'dough'
  if (lowerName.includes('marinade')) return 'marinade'
  if (lowerCat === 'protein') return 'protein prep'
  if (lowerCat === 'produce') return 'produce prep'
  if (lowerCat === 'spice' || lowerCat === 'fresh_herb' || lowerCat === 'dry_herb') return 'spice blend'
  if (lowerCat === 'dairy') return 'dairy prep'
  if (lowerCat === 'baking') return 'baking prep'
  return 'general prep'
}

// ── Estimate prep time for a quantity of ingredient ─────────────────────────

function estimatePrepMinutes(quantity: number, technique: string): number {
  // Base prep time estimates by technique (minutes per standard unit)
  const BASE_MINUTES: Record<string, number> = {
    'stock': 45,
    'sauce': 30,
    'dough': 40,
    'marinade': 15,
    'protein prep': 20,
    'produce prep': 15,
    'spice blend': 10,
    'dairy prep': 10,
    'baking prep': 25,
    'general prep': 15,
  }

  // Batch efficiency: making double takes ~1.3x, not 2x
  const baseMinutes = BASE_MINUTES[technique] || 15
  return Math.round(baseMinutes + Math.log2(Math.max(quantity, 1)) * 5)
}

// ── Main: Find consolidation opportunities ──────────────────────────────────

export async function findConsolidationOpportunities(
  dateRange: { start: string; end: string }
): Promise<ConsolidationOpportunity[]> {
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
  const menuIds = events.map((e: any) => e.menu_id).filter(Boolean)
  if (menuIds.length === 0) return []

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

  // 3. Get dishes for these menus
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
    .select('id, dish_id, recipe_id, name')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) return []

  // Build recipe -> events mapping
  const recipeEventMap = new Map<string, Set<string>>()
  const componentNameMap = new Map<string, string>()

  for (const c of components as any[]) {
    if (!c.recipe_id) continue
    const menuId = dishMenuMap.get(c.dish_id)
    if (!menuId) continue
    const eventId = menuEventMap.get(menuId)
    if (!eventId) continue

    if (!recipeEventMap.has(c.recipe_id)) recipeEventMap.set(c.recipe_id, new Set())
    recipeEventMap.get(c.recipe_id)!.add(eventId)
    componentNameMap.set(c.recipe_id, c.name)
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

  // 7. Get recipe names
  const { data: recipes } = await db
    .from('recipes')
    .select('id, name, prep_time_minutes')
    .in('id', recipeIds)

  const recipeInfo = new Map<string, { name: string; prepMinutes: number }>()
  for (const r of (recipes || []) as any[]) {
    recipeInfo.set(r.id, { name: r.name, prepMinutes: r.prep_time_minutes || 30 })
  }

  // 8. Aggregate: ingredient_id -> per-event quantities
  const aggregation = new Map<string, {
    ingredientId: string
    ingredientName: string
    category: string
    perEvent: Map<string, { quantity: number; unit: string; recipeName: string }>
  }>()

  for (const ri of recipeIngredients as any[]) {
    const eventIds = recipeEventMap.get(ri.recipe_id)
    if (!eventIds) continue

    const info = ingredientInfo.get(ri.ingredient_id)
    if (!info) continue

    const rInfo = recipeInfo.get(ri.recipe_id)
    const recipeName = rInfo?.name || 'Unknown Recipe'

    for (const eventId of eventIds) {
      const key = ri.ingredient_id

      if (!aggregation.has(key)) {
        aggregation.set(key, {
          ingredientId: ri.ingredient_id,
          ingredientName: info.name,
          category: info.category,
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
          recipeName,
        })
      }
    }
  }

  // 9. Filter to items appearing in 2+ events
  const opportunities: ConsolidationOpportunity[] = []

  for (const [, agg] of aggregation) {
    if (agg.perEvent.size < 2) continue

    const technique = classifyTechnique(agg.category, agg.ingredientName)
    let batchQuantity = 0
    const eventEntries: ConsolidationOpportunity['events'] = []
    let units = ''

    for (const [eventId, data] of agg.perEvent) {
      const event = eventMap.get(eventId)
      if (!event) continue

      batchQuantity += data.quantity
      units = data.unit || units

      eventEntries.push({
        eventId,
        eventName: event.occasion || 'Untitled Event',
        eventDate: event.event_date,
        quantity: Math.round(data.quantity * 100) / 100,
        unit: data.unit || '',
        guestCount: event.guest_count || 0,
        recipeName: data.recipeName,
      })
    }

    // Time savings: individual prep for each event vs one batch
    const individualTime = eventEntries.length * estimatePrepMinutes(batchQuantity / eventEntries.length, technique)
    const batchTime = estimatePrepMinutes(batchQuantity, technique)
    const timeSaved = Math.max(0, individualTime - batchTime)

    opportunities.push({
      ingredientName: agg.ingredientName,
      ingredientId: agg.ingredientId,
      events: eventEntries.sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
      batchQuantity: Math.round(batchQuantity * 100) / 100,
      unit: units,
      technique,
      timeSavedMinutes: timeSaved,
      eventCount: eventEntries.length,
    })
  }

  // Sort by time saved (desc), then event count (desc)
  opportunities.sort((a, b) => {
    if (a.timeSavedMinutes !== b.timeSavedMinutes) return b.timeSavedMinutes - a.timeSavedMinutes
    return b.eventCount - a.eventCount
  })

  return opportunities
}

// ── Weekly Prep Plan ────────────────────────────────────────────────────────

export async function getWeeklyPrepPlan(
  weekStart: string
): Promise<WeeklyPrepPlan> {
  const weekEnd = toDateStr(new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000))
  const opportunities = await findConsolidationOpportunities({ start: weekStart, end: weekEnd })

  if (opportunities.length === 0) {
    return { days: [], totalPrepMinutes: 0, totalSavedMinutes: 0, eventsCovered: 0 }
  }

  // Assign each opportunity to a prep day
  // Strategy: prep 1-2 days before the earliest event that needs it
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayMap = new Map<string, ConsolidatedPrepDay['items']>()

  const allEventIds = new Set<string>()
  let totalSavedMinutes = 0

  for (const opp of opportunities) {
    // Find earliest event date for this ingredient
    const earliestDate = opp.events.reduce((min, e) =>
      e.eventDate < min ? e.eventDate : min, opp.events[0].eventDate)

    // Prep 1 day before earliest event (or same day if start of range)
    const earliestMs = new Date(earliestDate).getTime()
    const prepDateMs = earliestMs - 24 * 60 * 60 * 1000
    const weekStartMs = new Date(weekStart).getTime()
    const prepDate = toDateStr(new Date(Math.max(prepDateMs, weekStartMs)))

    if (!dayMap.has(prepDate)) dayMap.set(prepDate, [])
    const batchPrepMinutes = estimatePrepMinutes(opp.batchQuantity, opp.technique)

    dayMap.get(prepDate)!.push({
      ingredientName: opp.ingredientName,
      batchQuantity: opp.batchQuantity,
      unit: opp.unit,
      technique: opp.technique,
      events: opp.events.map(e => e.eventName),
      prepMinutes: batchPrepMinutes,
    })

    for (const e of opp.events) {
      allEventIds.add(e.eventId)
    }
    totalSavedMinutes += opp.timeSavedMinutes
  }

  // Build day array sorted by date
  const days: ConsolidatedPrepDay[] = []
  const sortedDates = [...dayMap.keys()].sort()

  for (const date of sortedDates) {
    const items = dayMap.get(date)!
    // Sort within day: longest prep first
    items.sort((a, b) => b.prepMinutes - a.prepMinutes)
    const d = new Date(date + 'T12:00:00')

    days.push({
      date,
      dayOfWeek: dayNames[d.getDay()],
      items,
      totalPrepMinutes: items.reduce((sum, i) => sum + i.prepMinutes, 0),
    })
  }

  return {
    days,
    totalPrepMinutes: days.reduce((sum, d) => sum + d.totalPrepMinutes, 0),
    totalSavedMinutes,
    eventsCovered: allEventIds.size,
  }
}
