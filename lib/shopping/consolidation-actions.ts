// Shopping List Consolidation — Server Actions
// Merges shopping lists from multiple events within a date range into one combined view.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ShoppingItem } from './actions'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConsolidatedItem = {
  name: string
  totalQuantity: number
  unit: string | null
  category: string
  vendor: string | null
  eventSources: { eventId: string; occasion: string; quantity: number }[]
  checked: boolean
  estimatedPriceCents: number | null
}

export type EventShoppingInfo = {
  eventId: string
  occasion: string
  eventDate: string
  clientName: string | null
  hasShoppingList: boolean
  shoppingListId: string | null
  itemCount: number
}

export type ConsolidatedShoppingData = {
  startDate: string
  endDate: string
  events: EventShoppingInfo[]
  consolidatedItems: ConsolidatedItem[]
  totalEstimatedCents: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseItems(items: any): ShoppingItem[] {
  if (typeof items === 'string') {
    try {
      return JSON.parse(items)
    } catch {
      return []
    }
  }
  if (Array.isArray(items)) return items
  return []
}

/**
 * Normalize item names for matching: lowercase, trim, collapse whitespace.
 */
function normalizeItemName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Merge items with the same normalized name and unit.
 * Quantities are summed. Categories and vendors use the first occurrence.
 */
function mergeItems(
  allItems: { item: ShoppingItem; eventId: string; occasion: string }[]
): ConsolidatedItem[] {
  const merged = new Map<string, ConsolidatedItem>()

  for (const { item, eventId, occasion } of allItems) {
    const key = `${normalizeItemName(item.name)}|${(item.unit ?? '').toLowerCase()}`

    if (merged.has(key)) {
      const existing = merged.get(key)!
      existing.totalQuantity += item.quantity ?? 0
      existing.eventSources.push({
        eventId,
        occasion,
        quantity: item.quantity ?? 0,
      })
      if (item.estimated_price_cents) {
        existing.estimatedPriceCents =
          (existing.estimatedPriceCents ?? 0) + item.estimated_price_cents
      }
    } else {
      merged.set(key, {
        name: item.name,
        totalQuantity: item.quantity ?? 0,
        unit: item.unit,
        category: item.category || 'Other',
        vendor: item.vendor,
        checked: false,
        estimatedPriceCents: item.estimated_price_cents ?? null,
        eventSources: [{ eventId, occasion, quantity: item.quantity ?? 0 }],
      })
    }
  }

  // Sort by category then name
  return Array.from(merged.values()).sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category)
    if (catCmp !== 0) return catCmp
    return a.name.localeCompare(b.name)
  })
}

// ─── getConsolidatedShoppingList ────────────────────────────────────────────

/**
 * Fetches all shopping lists for events in the date range, merges matching items,
 * and returns a consolidated view grouped by category.
 */
export async function getConsolidatedShoppingList(
  startDate: string,
  endDate: string
): Promise<ConsolidatedShoppingData> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // 1. Find all events in the date range
  const { data: events, error: evError } = await supabase
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .neq('status', 'cancelled')
    .order('event_date', { ascending: true })

  if (evError) {
    console.error('[getConsolidatedShoppingList] Events query error:', evError)
    throw new Error('Failed to load events for date range')
  }

  const eventList = events ?? []
  const eventIds = eventList.map((e: any) => e.id)

  if (eventIds.length === 0) {
    return {
      startDate,
      endDate,
      events: [],
      consolidatedItems: [],
      totalEstimatedCents: 0,
    }
  }

  // 2. Fetch all shopping lists for these events
  const { data: shoppingLists, error: slError } = await supabase
    .from('shopping_lists')
    .select('id, event_id, items, total_estimated_cents')
    .eq('chef_id', user.tenantId!)
    .in('event_id', eventIds)

  if (slError) {
    console.error('[getConsolidatedShoppingList] Shopping lists query error:', slError)
    throw new Error('Failed to load shopping lists')
  }

  const listsMap = new Map<string, any>()
  for (const sl of shoppingLists ?? []) {
    listsMap.set(sl.event_id, sl)
  }

  // 3. Build event info and collect all items
  const allItems: { item: ShoppingItem; eventId: string; occasion: string }[] = []
  const eventsInfo: EventShoppingInfo[] = []

  for (const ev of eventList) {
    const sl = listsMap.get(ev.id)
    const items = sl ? parseItems(sl.items) : []
    const clientName = (ev.client as any)?.full_name ?? null

    eventsInfo.push({
      eventId: ev.id,
      occasion: ev.occasion ?? 'Untitled Event',
      eventDate: ev.event_date,
      clientName,
      hasShoppingList: !!sl,
      shoppingListId: sl?.id ?? null,
      itemCount: items.length,
    })

    for (const item of items) {
      allItems.push({
        item,
        eventId: ev.id,
        occasion: ev.occasion ?? 'Untitled Event',
      })
    }
  }

  // 4. Merge items
  const consolidatedItems = mergeItems(allItems)
  const totalEstimatedCents = consolidatedItems.reduce(
    (sum, item) => sum + (item.estimatedPriceCents ?? 0),
    0
  )

  return {
    startDate,
    endDate,
    events: eventsInfo,
    consolidatedItems,
    totalEstimatedCents,
  }
}

// ─── createConsolidatedList ──────────────────────────────────────────────────

/**
 * Creates a new shopping list containing merged items from all events in a date range.
 * This is a real shopping list saved to the DB that the chef can use in shopping mode.
 */
export async function createConsolidatedList(
  startDate: string,
  endDate: string
): Promise<{ success: true; id: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch the consolidated data
  const data = await getConsolidatedShoppingList(startDate, endDate)

  if (data.consolidatedItems.length === 0) {
    throw new Error('No shopping list items found for events in this date range')
  }

  // Convert consolidated items back to ShoppingItem format
  const items: ShoppingItem[] = data.consolidatedItems.map((ci) => ({
    name: ci.name,
    quantity: ci.totalQuantity,
    unit: ci.unit,
    category: ci.category,
    checked: false,
    estimated_price_cents: ci.estimatedPriceCents,
    actual_price_cents: null,
    vendor: ci.vendor,
    notes:
      ci.eventSources.length > 1
        ? `For: ${ci.eventSources.map((s) => s.occasion).join(', ')}`
        : null,
  }))

  const formattedStart = new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const formattedEnd = new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const listName = `Weekly Shopping: ${formattedStart} - ${formattedEnd}`

  const { data: inserted, error } = await supabase
    .from('shopping_lists')
    .insert({
      chef_id: user.tenantId!,
      name: listName,
      event_id: null,
      items: JSON.stringify(items),
      status: 'active',
      total_estimated_cents: data.totalEstimatedCents || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createConsolidatedList] Error:', error)
    throw new Error('Failed to create consolidated shopping list')
  }

  revalidatePath('/shopping')
  revalidatePath('/shopping/weekly')

  return { success: true, id: (inserted as any).id }
}
