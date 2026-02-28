// Grocery Route Planning Server Actions
// Organizes shopping lists by store/vendor and suggests visit order.
// Uses existing tables: events, recipes, recipe_ingredients, vendors

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

// --- Types ---

export type GroceryItem = {
  ingredientName: string
  quantity: string | null
  unit: string | null
  recipeNames: string[]
}

export type StoreGroup = {
  storeName: string
  storeId: string | null
  items: GroceryItem[]
  itemCount: number
}

export type GroceryRoute = {
  eventId: string
  eventName: string
  eventDate: string
  stores: StoreGroup[]
  unassignedItems: GroceryItem[]
  totalItemCount: number
}

export type StoreVisitOrder = {
  storeName: string
  storeId: string | null
  itemCount: number
  priority: number
}

export type OptimizedRoute = {
  eventId: string
  suggestedOrder: StoreVisitOrder[]
  reasoning: string
}

// --- Schemas ---

const EventIdSchema = z.string().uuid()

// --- Actions ---

/**
 * Get the grocery shopping list for an event, organized by store/vendor.
 * Fetches ingredients from the event's menu recipes and groups them by
 * their associated vendor (if any).
 */
export async function getGroceryRoute(eventId: string): Promise<GroceryRoute> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const validatedEventId = EventIdSchema.parse(eventId)

  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, occasion, event_date')
    .eq('id', validatedEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  // Fetch menus for this event
  const { data: menus } = await supabase.from('menus').select('id').eq('event_id', validatedEventId)

  if (!menus || menus.length === 0) {
    return {
      eventId: event.id,
      eventName: event.occasion || 'Untitled Event',
      eventDate: event.event_date,
      stores: [],
      unassignedItems: [],
      totalItemCount: 0,
    }
  }

  const menuIds = menus.map((m: any) => m.id)

  // Fetch dishes from menus
  const { data: dishes } = await supabase.from('dishes').select('id, name').in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) {
    return {
      eventId: event.id,
      eventName: event.occasion || 'Untitled Event',
      eventDate: event.event_date,
      stores: [],
      unassignedItems: [],
      totalItemCount: 0,
    }
  }

  // recipe_id is not directly on dishes; recipe links require a junction table
  const recipeIds: string[] = []
  const dishNameByRecipeId = new Map<string, string[]>()

  if (recipeIds.length === 0) {
    return {
      eventId: event.id,
      eventName: event.occasion || 'Untitled Event',
      eventDate: event.event_date,
      stores: [],
      unassignedItems: [],
      totalItemCount: 0,
    }
  }

  // Fetch ingredients for all recipes
  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('id, name, quantity, unit, recipe_id, vendor_id')
    .in('recipe_id', recipeIds)

  if (!ingredients || ingredients.length === 0) {
    return {
      eventId: event.id,
      eventName: event.occasion || 'Untitled Event',
      eventDate: event.event_date,
      stores: [],
      unassignedItems: [],
      totalItemCount: 0,
    }
  }

  // Fetch vendors for ingredients that have vendor_id
  const vendorIds = [
    ...new Set(
      (ingredients as any[])
        .map((i) => i.vendor_id)
        .filter((id): id is string => id !== null && id !== undefined)
    ),
  ]

  const vendorMap = new Map<string, string>()
  if (vendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('chef_id', user.tenantId!)
      .in('id', vendorIds)

    for (const vendor of vendors || []) {
      vendorMap.set(vendor.id, vendor.name)
    }
  }

  // Group ingredients by vendor/store
  const storeGroups = new Map<string, { storeId: string | null; items: Map<string, GroceryItem> }>()
  const unassignedItems = new Map<string, GroceryItem>()

  for (const ingredient of ingredients as any[]) {
    const recipeNames = dishNameByRecipeId.get(ingredient.recipe_id) || ['Unknown Recipe']
    const groceryItem: GroceryItem = {
      ingredientName: ingredient.name || 'Unknown Ingredient',
      quantity: ingredient.quantity?.toString() || null,
      unit: ingredient.unit || null,
      recipeNames,
    }

    const itemKey = `${ingredient.name}-${ingredient.unit || ''}`.toLowerCase()

    if (ingredient.vendor_id && vendorMap.has(ingredient.vendor_id)) {
      const storeName = vendorMap.get(ingredient.vendor_id)!
      if (!storeGroups.has(storeName)) {
        storeGroups.set(storeName, { storeId: ingredient.vendor_id, items: new Map() })
      }
      const group = storeGroups.get(storeName)!
      const existing = group.items.get(itemKey)
      if (existing) {
        // Merge recipe names
        existing.recipeNames = [...new Set([...existing.recipeNames, ...recipeNames])]
      } else {
        group.items.set(itemKey, { ...groceryItem })
      }
    } else {
      const existing = unassignedItems.get(itemKey)
      if (existing) {
        existing.recipeNames = [...new Set([...existing.recipeNames, ...recipeNames])]
      } else {
        unassignedItems.set(itemKey, { ...groceryItem })
      }
    }
  }

  const stores: StoreGroup[] = Array.from(storeGroups.entries()).map(([storeName, group]) => ({
    storeName,
    storeId: group.storeId,
    items: Array.from(group.items.values()),
    itemCount: group.items.size,
  }))

  const unassigned = Array.from(unassignedItems.values())
  const totalItemCount = stores.reduce((sum, s) => sum + s.itemCount, 0) + unassigned.length

  return {
    eventId: event.id,
    eventName: event.occasion || 'Untitled Event',
    eventDate: event.event_date,
    stores: stores.sort((a, b) => b.itemCount - a.itemCount),
    unassignedItems: unassigned,
    totalItemCount,
  }
}

/**
 * Suggest an optimized store visit order.
 * Strategy: fewest stores first, then order by item count (most items first).
 * This minimizes stops while prioritizing high-value stores.
 */
export async function optimizeStoreOrder(eventId: string): Promise<OptimizedRoute> {
  const user = await requireChef()
  const route = await getGroceryRoute(eventId)

  if (route.stores.length === 0) {
    return {
      eventId,
      suggestedOrder: [],
      reasoning:
        'No stores assigned to ingredients yet. Assign vendors to recipe ingredients for route optimization.',
    }
  }

  // Sort stores by item count descending (visit the store with the most items first)
  const sorted = [...route.stores].sort((a, b) => b.itemCount - a.itemCount)

  const suggestedOrder: StoreVisitOrder[] = sorted.map((store, index) => ({
    storeName: store.storeName,
    storeId: store.storeId,
    itemCount: store.itemCount,
    priority: index + 1,
  }))

  const storeCount = suggestedOrder.length
  let reasoning: string

  if (storeCount === 1) {
    reasoning = `Only 1 store needed: ${suggestedOrder[0].storeName} (${suggestedOrder[0].itemCount} items).`
  } else if (storeCount === 2) {
    reasoning = `2 stops needed. Start at ${suggestedOrder[0].storeName} (${suggestedOrder[0].itemCount} items) then ${suggestedOrder[1].storeName} (${suggestedOrder[1].itemCount} items).`
  } else {
    reasoning = `${storeCount} stops needed. Ordered by item count to minimize backtracking. Start with ${suggestedOrder[0].storeName} (${suggestedOrder[0].itemCount} items).`
  }

  if (route.unassignedItems.length > 0) {
    reasoning += ` Note: ${route.unassignedItems.length} items have no assigned store.`
  }

  return {
    eventId,
    suggestedOrder,
    reasoning,
  }
}
