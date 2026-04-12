// Grocery Splitting - Server Actions
// Manages grocery trips, line items, and multi-client cost splitting.
// All split calculations are deterministic math (Formula > AI).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateTripSchema = z.object({
  store_name: z.string().optional(),
  trip_date: z.string().optional(), // ISO date string
  notes: z.string().optional(),
})

const AddItemSchema = z.object({
  item_name: z.string().min(1, 'Item name required'),
  quantity: z.number().positive().default(1),
  unit: z.string().optional(),
  price_cents: z.number().int().min(0),
  category: z
    .enum(['produce', 'protein', 'dairy', 'pantry', 'frozen', 'bakery', 'beverage', 'other'])
    .optional(),
})

const UpdateItemSchema = AddItemSchema.partial()

export type CreateTripInput = z.infer<typeof CreateTripSchema>
export type AddItemInput = z.infer<typeof AddItemSchema>
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>

// ============================================
// TRIP CRUD
// ============================================

export async function createGroceryTrip(input: CreateTripInput) {
  const user = await requireChef()
  const validated = CreateTripSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('grocery_trips')
    .insert({
      chef_id: user.tenantId!,
      store_name: validated.store_name || null,
      trip_date:
        validated.trip_date ||
        ((_d) =>
          `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(
          new Date()
        ),
      notes: validated.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createGroceryTrip] Error:', error)
    throw new Error('Failed to create grocery trip')
  }

  revalidatePath('/grocery')
  return data
}

export async function getGroceryTrips(dateRange?: { from: string; to: string }) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = (db as any)
    .from('grocery_trips')
    .select('*, grocery_trip_splits(client_id)')
    .eq('chef_id', user.tenantId!)
    .order('trip_date', { ascending: false })

  if (dateRange?.from) {
    query = query.gte('trip_date', dateRange.from)
  }
  if (dateRange?.to) {
    query = query.lte('trip_date', dateRange.to)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getGroceryTrips] Error:', error)
    throw new Error('Failed to load grocery trips')
  }

  return data ?? []
}

export async function getGroceryTrip(tripId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('grocery_trips')
    .select(
      `
      *,
      grocery_trip_items(*),
      grocery_trip_splits(*, clients:client_id(id, name))
    `
    )
    .eq('id', tripId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getGroceryTrip] Error:', error)
    throw new Error('Failed to load grocery trip')
  }

  return data
}

export async function deleteGroceryTrip(tripId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await (db as any)
    .from('grocery_trips')
    .delete()
    .eq('id', tripId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteGroceryTrip] Error:', error)
    throw new Error('Failed to delete grocery trip')
  }

  revalidatePath('/grocery')
}

// ============================================
// ITEM CRUD
// ============================================

export async function addTripItem(tripId: string, input: AddItemInput) {
  const user = await requireChef()
  const validated = AddItemSchema.parse(input)
  const db: any = createServerClient()

  // Verify trip belongs to this chef
  const { data: trip } = await (db as any)
    .from('grocery_trips')
    .select('id')
    .eq('id', tripId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!trip) throw new Error('Trip not found')

  const { data, error } = await (db as any)
    .from('grocery_trip_items')
    .insert({
      trip_id: tripId,
      item_name: validated.item_name,
      quantity: validated.quantity,
      unit: validated.unit || null,
      price_cents: validated.price_cents,
      category: validated.category || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[addTripItem] Error:', error)
    throw new Error('Failed to add item')
  }

  // Recalculate trip total
  await recalcTripTotal(db, tripId)

  revalidatePath('/grocery')
  return data
}

export async function updateTripItem(itemId: string, input: UpdateItemInput) {
  const user = await requireChef()
  const validated = UpdateItemSchema.parse(input)
  const db: any = createServerClient()

  // Get item with trip ownership check
  const { data: item } = await (db as any)
    .from('grocery_trip_items')
    .select('trip_id, grocery_trips!inner(chef_id)')
    .eq('id', itemId)
    .single()

  if (!item || item.grocery_trips?.chef_id !== user.tenantId!) {
    throw new Error('Item not found')
  }

  const updates: Record<string, unknown> = {}
  if (validated.item_name !== undefined) updates.item_name = validated.item_name
  if (validated.quantity !== undefined) updates.quantity = validated.quantity
  if (validated.unit !== undefined) updates.unit = validated.unit || null
  if (validated.price_cents !== undefined) updates.price_cents = validated.price_cents
  if (validated.category !== undefined) updates.category = validated.category || null

  const { data, error } = await (db as any)
    .from('grocery_trip_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    console.error('[updateTripItem] Error:', error)
    throw new Error('Failed to update item')
  }

  await recalcTripTotal(db, item.trip_id)

  revalidatePath('/grocery')
  return data
}

export async function removeTripItem(itemId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get item with trip ownership check
  const { data: item } = await (db as any)
    .from('grocery_trip_items')
    .select('trip_id, grocery_trips!inner(chef_id)')
    .eq('id', itemId)
    .single()

  if (!item || item.grocery_trips?.chef_id !== user.tenantId!) {
    throw new Error('Item not found')
  }

  const { error } = await (db as any).from('grocery_trip_items').delete().eq('id', itemId)

  if (error) {
    console.error('[removeTripItem] Error:', error)
    throw new Error('Failed to remove item')
  }

  await recalcTripTotal(db, item.trip_id)

  revalidatePath('/grocery')
}

// ============================================
// SPLITTING LOGIC (all deterministic math)
// ============================================

export async function splitEquallyAcrossClients(tripId: string, clientIds: string[]) {
  const user = await requireChef()
  if (clientIds.length === 0) throw new Error('At least one client required')
  const db: any = createServerClient()

  // Verify trip and get total
  const { data: trip } = await (db as any)
    .from('grocery_trips')
    .select('id, total_cents')
    .eq('id', tripId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!trip) throw new Error('Trip not found')

  // Clear existing splits
  await (db as any).from('grocery_trip_splits').delete().eq('trip_id', tripId)

  // Equal split with remainder going to first client
  const perClient = Math.floor(trip.total_cents / clientIds.length)
  const remainder = trip.total_cents - perClient * clientIds.length

  const splits = clientIds.map((clientId, i) => ({
    trip_id: tripId,
    client_id: clientId,
    amount_cents: perClient + (i === 0 ? remainder : 0),
    split_method: 'equal',
  }))

  const { error } = await (db as any).from('grocery_trip_splits').insert(splits)

  if (error) {
    console.error('[splitEquallyAcrossClients] Error:', error)
    throw new Error('Failed to split costs')
  }

  revalidatePath('/grocery')
}

export async function splitProportionally(
  tripId: string,
  clientWeights: { clientId: string; weight: number }[]
) {
  const user = await requireChef()
  if (clientWeights.length === 0) throw new Error('At least one client required')
  const db: any = createServerClient()

  const { data: trip } = await (db as any)
    .from('grocery_trips')
    .select('id, total_cents')
    .eq('id', tripId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!trip) throw new Error('Trip not found')

  // Clear existing splits
  await (db as any).from('grocery_trip_splits').delete().eq('trip_id', tripId)

  const totalWeight = clientWeights.reduce((sum, cw) => sum + cw.weight, 0)
  if (totalWeight <= 0) throw new Error('Total weight must be positive')

  // Proportional split: floor each share, assign remainder to largest-weight client
  let allocated = 0
  const splits = clientWeights.map((cw) => {
    const share = Math.floor((cw.weight / totalWeight) * trip.total_cents)
    allocated += share
    return {
      trip_id: tripId,
      client_id: cw.clientId,
      amount_cents: share,
      split_method: 'proportional' as const,
    }
  })

  // Assign leftover cents to the first client (largest remainder method simplified)
  const leftover = trip.total_cents - allocated
  if (leftover > 0) {
    splits[0].amount_cents += leftover
  }

  const { error } = await (db as any).from('grocery_trip_splits').insert(splits)

  if (error) {
    console.error('[splitProportionally] Error:', error)
    throw new Error('Failed to split costs proportionally')
  }

  revalidatePath('/grocery')
}

export async function assignItemToClient(itemId: string, clientId: string, eventId?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify item ownership
  const { data: item } = await (db as any)
    .from('grocery_trip_items')
    .select('id, trip_id, price_cents, grocery_trips!inner(chef_id)')
    .eq('id', itemId)
    .single()

  if (!item || item.grocery_trips?.chef_id !== user.tenantId!) {
    throw new Error('Item not found')
  }

  // Remove any existing split for this item
  await (db as any).from('grocery_trip_splits').delete().eq('item_id', itemId)

  const { error } = await (db as any).from('grocery_trip_splits').insert({
    trip_id: item.trip_id,
    item_id: itemId,
    client_id: clientId,
    event_id: eventId || null,
    amount_cents: item.price_cents,
    split_method: 'full',
  })

  if (error) {
    console.error('[assignItemToClient] Error:', error)
    throw new Error('Failed to assign item to client')
  }

  revalidatePath('/grocery')
}

export async function autoSplitByEvent(tripId: string, eventIds: string[]) {
  const user = await requireChef()
  if (eventIds.length === 0) throw new Error('At least one event required')
  const db: any = createServerClient()

  // Verify trip
  const { data: trip } = await (db as any)
    .from('grocery_trips')
    .select('id, total_cents')
    .eq('id', tripId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!trip) throw new Error('Trip not found')

  // Get events with guest counts
  const { data: events } = await (db as any)
    .from('events')
    .select('id, client_id, guest_count')
    .in('id', eventIds)
    .eq('tenant_id', user.tenantId!)

  if (!events || events.length === 0) throw new Error('No matching events found')

  // Clear existing splits
  await (db as any).from('grocery_trip_splits').delete().eq('trip_id', tripId)

  // Use guest_count as weight; default to 1 if not set
  const totalGuests = events.reduce(
    (sum: number, e: { guest_count: number | null }) => sum + (e.guest_count || 1),
    0
  )

  let allocated = 0
  const splits = events.map(
    (event: { id: string; client_id: string; guest_count: number | null }) => {
      const guests = event.guest_count || 1
      const share = Math.floor((guests / totalGuests) * trip.total_cents)
      allocated += share
      return {
        trip_id: tripId,
        client_id: event.client_id,
        event_id: event.id,
        amount_cents: share,
        split_method: 'proportional' as const,
      }
    }
  )

  // Assign leftover cents to first event
  const leftover = trip.total_cents - allocated
  if (leftover > 0) {
    splits[0].amount_cents += leftover
  }

  const { error } = await (db as any).from('grocery_trip_splits').insert(splits)

  if (error) {
    console.error('[autoSplitByEvent] Error:', error)
    throw new Error('Failed to auto-split by event')
  }

  revalidatePath('/grocery')
}

export async function getTripSplitSummary(tripId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify trip ownership
  const { data: trip } = await (db as any)
    .from('grocery_trips')
    .select('id, total_cents')
    .eq('id', tripId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!trip) throw new Error('Trip not found')

  const { data: splits, error } = await (db as any)
    .from('grocery_trip_splits')
    .select('client_id, amount_cents, split_method, clients:client_id(id, name)')
    .eq('trip_id', tripId)

  if (error) {
    console.error('[getTripSplitSummary] Error:', error)
    throw new Error('Failed to load split summary')
  }

  // Aggregate per client
  const clientTotals = new Map<
    string,
    {
      clientId: string
      clientName: string
      totalCents: number
      splitMethod: string
    }
  >()

  for (const split of splits ?? []) {
    const existing = clientTotals.get(split.client_id)
    if (existing) {
      existing.totalCents += split.amount_cents
    } else {
      clientTotals.set(split.client_id, {
        clientId: split.client_id,
        clientName: split.clients?.name ?? 'Unknown',
        totalCents: split.amount_cents,
        splitMethod: split.split_method ?? 'manual',
      })
    }
  }

  return {
    tripTotal: trip.total_cents,
    allocatedTotal: Array.from(clientTotals.values()).reduce((s, c) => s + c.totalCents, 0),
    clients: Array.from(clientTotals.values()),
  }
}

// ============================================
// INTERNAL HELPERS
// ============================================

async function recalcTripTotal(db: any, tripId: string) {
  const { data: items } = await db
    .from('grocery_trip_items')
    .select('price_cents')
    .eq('trip_id', tripId)

  const total = (items ?? []).reduce(
    (sum: number, item: { price_cents: number }) => sum + item.price_cents,
    0
  )

  await db.from('grocery_trips').update({ total_cents: total }).eq('id', tripId)
}
