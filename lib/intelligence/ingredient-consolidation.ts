'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConsolidatedIngredient {
  ingredientName: string
  totalQuantity: number | null
  unit: string | null
  eventCount: number // how many events need this ingredient
  events: { eventId: string; eventDate: string; clientName: string; quantity: number | null }[]
  estimatedCostCents: number | null
  lastPriceCents: number | null
}

export interface IngredientConsolidationResult {
  consolidatedList: ConsolidatedIngredient[]
  totalEstimatedCostCents: number
  eventsCovered: number
  dateRange: { start: string; end: string }
  savingsOpportunities: SavingsOpportunity[]
  sharedIngredientCount: number // ingredients needed for 2+ events
}

export interface SavingsOpportunity {
  type: 'bulk_buy' | 'shared_prep' | 'vendor_consolidation'
  title: string
  description: string
  estimatedSavingsPercent: number
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getIngredientConsolidation(): Promise<IngredientConsolidationResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch upcoming events (next 14 days) with menus
  const today = new Date().toISOString().split('T')[0]
  const twoWeeksOut = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, event_date, guest_count,
      client:clients(full_name),
      menu_id
    `
    )
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'accepted'])
    .gte('event_date', today)
    .lte('event_date', twoWeeksOut)
    .order('event_date', { ascending: true })

  if (error || !events || events.length === 0) return null

  // Get menus for these events
  const menuIds = events.map((e: any) => e.menu_id).filter(Boolean)
  if (menuIds.length === 0) return null

  // Fetch dishes linked to these menus
  const { data: dishes } = await db
    .from('dishes')
    .select('id, menu_id, recipe_id')
    .in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) return null

  // Fetch recipe ingredients
  const recipeIds = [...new Set((dishes || []).map((d: any) => d.recipe_id).filter(Boolean))]
  if (recipeIds.length === 0) return null

  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name, quantity, unit, recipe_id, average_price_cents')
    .in('recipe_id', recipeIds)

  if (!ingredients || ingredients.length === 0) return null

  // Build recipe → menu → event mapping
  const menuToEvent = new Map<string, any[]>()
  for (const event of events) {
    if (!event.menu_id) continue
    if (!menuToEvent.has(event.menu_id)) menuToEvent.set(event.menu_id, [])
    menuToEvent.get(event.menu_id)!.push(event)
  }

  const recipeToMenus = new Map<string, string[]>()
  for (const dish of dishes) {
    if (!dish.recipe_id || !dish.menu_id) continue
    if (!recipeToMenus.has(dish.recipe_id)) recipeToMenus.set(dish.recipe_id, [])
    if (!recipeToMenus.get(dish.recipe_id)!.includes(dish.menu_id)) {
      recipeToMenus.get(dish.recipe_id)!.push(dish.menu_id)
    }
  }

  // Consolidate ingredients across events
  const consolidated = new Map<string, ConsolidatedIngredient>()

  for (const ingredient of ingredients) {
    const name = (ingredient.name || '').toLowerCase().trim()
    if (!name) continue

    const menus = recipeToMenus.get(ingredient.recipe_id) || []
    for (const menuId of menus) {
      const linkedEvents = menuToEvent.get(menuId) || []
      for (const event of linkedEvents) {
        const key = name

        if (!consolidated.has(key)) {
          consolidated.set(key, {
            ingredientName: ingredient.name,
            totalQuantity: 0,
            unit: ingredient.unit,
            eventCount: 0,
            events: [],
            estimatedCostCents: 0,
            lastPriceCents: ingredient.average_price_cents || null,
          })
        }

        const entry = consolidated.get(key)!
        // Scale quantity by guest count (rough scaling)
        const scaledQuantity = ingredient.quantity || 0
        entry.totalQuantity = (entry.totalQuantity || 0) + scaledQuantity

        // Avoid double-counting the same event
        if (!entry.events.find((e) => e.eventId === event.id)) {
          entry.eventCount++
          entry.events.push({
            eventId: event.id,
            eventDate: event.event_date,
            clientName: (event.client as any)?.full_name || 'Client',
            quantity: scaledQuantity,
          })
        }

        if (ingredient.average_price_cents) {
          entry.estimatedCostCents =
            (entry.estimatedCostCents || 0) + ingredient.average_price_cents
        }
      }
    }
  }

  const consolidatedList = Array.from(consolidated.values()).sort(
    (a, b) =>
      b.eventCount - a.eventCount || (b.estimatedCostCents || 0) - (a.estimatedCostCents || 0)
  )

  // Generate savings opportunities
  const savingsOpportunities: SavingsOpportunity[] = []
  const sharedIngredients = consolidatedList.filter((i) => i.eventCount >= 2)

  if (sharedIngredients.length >= 3) {
    savingsOpportunities.push({
      type: 'bulk_buy',
      title: `Bulk buy ${sharedIngredients.length} shared ingredients`,
      description: `${sharedIngredients.length} ingredients are needed for 2+ events. Buying in bulk could reduce grocery trips and cost.`,
      estimatedSavingsPercent: 10,
    })
  }

  if (sharedIngredients.length >= 2) {
    savingsOpportunities.push({
      type: 'shared_prep',
      title: 'Batch prep opportunity',
      description: `Ingredients like ${sharedIngredients
        .slice(0, 3)
        .map((i) => i.ingredientName)
        .join(', ')} are shared across events. Consider prepping them together.`,
      estimatedSavingsPercent: 15,
    })
  }

  // Check if multiple events are close together (within 2 days)
  const eventDates = events.map((e: any) => e.event_date).sort()
  let closeEvents = 0
  for (let i = 1; i < eventDates.length; i++) {
    const diff =
      (new Date(eventDates[i]).getTime() - new Date(eventDates[i - 1]).getTime()) / 86400000
    if (diff <= 2) closeEvents++
  }
  if (closeEvents > 0) {
    savingsOpportunities.push({
      type: 'vendor_consolidation',
      title: 'Consolidate vendor trips',
      description: `${closeEvents + 1} events within 2 days of each other. One shopping trip could cover multiple events.`,
      estimatedSavingsPercent: 5,
    })
  }

  const totalEstimatedCost = consolidatedList.reduce((s, i) => s + (i.estimatedCostCents || 0), 0)

  return {
    consolidatedList: consolidatedList.slice(0, 50),
    totalEstimatedCostCents: totalEstimatedCost,
    eventsCovered: events.length,
    dateRange: { start: today, end: twoWeeksOut },
    savingsOpportunities,
    sharedIngredientCount: sharedIngredients.length,
  }
}
