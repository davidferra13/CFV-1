'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────────────────

export type ShoppingHistoryItem = {
  ingredientId: string
  ingredientName: string
  unit: string
  buyQty: number | null
  purchasedQty: number | null
  purchasedCostCents: number | null
  usedQty: number | null
  leftoverQty: number | null
  purchaseVariance: number | null
}

export type ShoppingHistoryResult = {
  eventId: string
  eventDate: string
  eventLabel: string
  items: ShoppingHistoryItem[]
  totalBuyCostCents: number
  totalPurchasedCostCents: number
}

export type PastShoppingEvent = {
  id: string
  eventDate: string
  occasion: string | null
  clientName: string | null
  guestCount: number
}

// ── Get Shopping History for an Event ────────────────────────────────────

export async function getShoppingHistory(eventId: string): Promise<ShoppingHistoryResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get event info
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, event_date, occasion, client:clients(full_name)')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found')

  const clientName = Array.isArray(event.client)
    ? (event.client[0]?.full_name ?? null)
    : (event.client?.full_name ?? null)
  const eventLabel = `${event.occasion || 'Event'} ${event.event_date ?? ''}`.trim()

  // Query the lifecycle view for this event
  const { data: lifecycleRows, error: lcError } = await db
    .from('event_ingredient_lifecycle')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  if (lcError) throw new Error(`Failed to load shopping history: ${lcError.message}`)

  const items: ShoppingHistoryItem[] = ((lifecycleRows ?? []) as any[]).map((row: any) => ({
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    unit: row.unit ?? 'each',
    buyQty: row.buy_qty != null ? Number(row.buy_qty) : null,
    purchasedQty: row.purchased_qty != null ? Number(row.purchased_qty) : null,
    purchasedCostCents: row.purchased_cost_cents != null ? Number(row.purchased_cost_cents) : null,
    usedQty: row.used_qty != null ? Number(row.used_qty) : null,
    leftoverQty: row.computed_leftover_qty != null ? Number(row.computed_leftover_qty) : null,
    purchaseVariance: row.purchase_variance_qty != null ? Number(row.purchase_variance_qty) : null,
  }))

  items.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))

  const totalBuyCostCents = items.reduce((sum, i) => {
    if (i.buyQty == null) return sum
    return sum
  }, 0)

  const totalPurchasedCostCents = items.reduce((sum, i) => sum + (i.purchasedCostCents ?? 0), 0)

  return {
    eventId,
    eventDate: event.event_date,
    eventLabel,
    items,
    totalBuyCostCents,
    totalPurchasedCostCents,
  }
}

// ── Get Past Events with Shopping Data ───────────────────────────────────

export async function getPastShoppingEvents(): Promise<PastShoppingEvent[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get events that have inventory transactions (purchases)
  const { data: events, error } = await db
    .from('events')
    .select('id, event_date, occasion, guest_count, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .lte('event_date', new Date().toISOString().slice(0, 10))
    .order('event_date', { ascending: false })
    .limit(50)

  if (error) throw new Error(`Failed to load past events: ${error.message}`)

  return ((events ?? []) as any[]).map((e: any) => ({
    id: e.id,
    eventDate: e.event_date,
    occasion: e.occasion,
    clientName: Array.isArray(e.client)
      ? (e.client[0]?.full_name ?? null)
      : (e.client?.full_name ?? null),
    guestCount: Number(e.guest_count) || 0,
  }))
}

// ── Manual Purchase Entry ────────────────────────────────────────────────

export async function recordManualPurchase(input: {
  eventId: string
  ingredientId: string
  quantity: number
  unit: string
  costCents?: number
  notes?: string
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event belongs to tenant
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', input.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  // Verify ingredient belongs to tenant
  const { data: ingredient } = await db
    .from('ingredients')
    .select('id')
    .eq('id', input.ingredientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!ingredient) throw new Error('Ingredient not found')

  await db.from('inventory_transactions').insert({
    chef_id: user.tenantId!,
    ingredient_id: input.ingredientId,
    event_id: input.eventId,
    transaction_type: 'receive',
    quantity: Math.abs(input.quantity),
    unit: input.unit,
    cost_cents: input.costCents ?? null,
    notes: input.notes ?? `Manual purchase entry for event`,
  })

  revalidatePath('/culinary/prep/shopping')
}
