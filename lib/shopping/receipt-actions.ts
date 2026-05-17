'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { ReceiptItem, ShoppingReceipt, ReceiptSummary, InventoryEntry } from './receipt-types'

// ============================================
// Log Receipt - capture a shopping receipt
// ============================================

export async function logReceipt(
  storeName: string,
  receiptDate: string,
  totalCents: number,
  items: ReceiptItem[],
  eventId?: string
): Promise<ShoppingReceipt> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!storeName || !storeName.trim()) {
    throw new Error('Store name cannot be empty')
  }
  if (totalCents < 0) {
    throw new Error('Total cannot be negative')
  }

  const { data, error } = await db
    .from('shopping_receipts')
    .insert({
      tenant_id: user.tenantId!,
      store_name: storeName.trim(),
      receipt_date: receiptDate,
      total_cents: totalCents,
      tax_cents: 0,
      items: JSON.stringify(items),
      event_id: eventId ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[logReceipt] Error:', error)
    throw new Error('Failed to log receipt')
  }

  revalidatePath('/dashboard')
  return data
}

// ============================================
// Get Receipts - list with optional filters
// ============================================

export async function getReceipts(
  month?: string,
  storeFilter?: string,
  limit: number = 50
): Promise<ShoppingReceipt[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('shopping_receipts')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('receipt_date', { ascending: false })
    .limit(limit)

  if (month) {
    // month format: "2026-05"
    const start = `${month}-01`
    const endDate = new Date(start)
    endDate.setMonth(endDate.getMonth() + 1)
    const end = endDate.toISOString().split('T')[0]
    query = query.gte('receipt_date', start).lt('receipt_date', end)
  }

  if (storeFilter) {
    query = query.ilike('store_name', `%${storeFilter}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getReceipts] Error:', error)
    throw new Error('Failed to fetch receipts')
  }

  return data ?? []
}

// ============================================
// Get Receipt Detail - single receipt
// ============================================

export async function getReceiptDetail(receiptId: string): Promise<ShoppingReceipt | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!receiptId) {
    throw new Error('Receipt ID is required')
  }

  const { data, error } = await db
    .from('shopping_receipts')
    .select('*')
    .eq('id', receiptId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getReceiptDetail] Error:', error)
    throw new Error('Failed to fetch receipt detail')
  }

  return data
}

// ============================================
// Get Spending Summary - aggregated view
// ============================================

export async function getSpendingSummary(
  startDate: string,
  endDate: string
): Promise<ReceiptSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: receipts, error } = await db
    .from('shopping_receipts')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('receipt_date', startDate)
    .lte('receipt_date', endDate)
    .order('receipt_date', { ascending: false })

  if (error) {
    console.error('[getSpendingSummary] Error:', error)
    throw new Error('Failed to fetch spending summary')
  }

  const rows: ShoppingReceipt[] = receipts ?? []

  const totalSpend = rows.reduce((sum, r) => sum + r.total_cents, 0)

  // Per-store breakdown
  const storeMap = new Map<string, { total_cents: number; receipt_count: number }>()
  for (const r of rows) {
    const entry = storeMap.get(r.store_name) ?? { total_cents: 0, receipt_count: 0 }
    entry.total_cents += r.total_cents
    entry.receipt_count += 1
    storeMap.set(r.store_name, entry)
  }
  const storeBreakdown = Array.from(storeMap.entries()).map(([store_name, v]) => ({
    store_name,
    ...v,
  }))

  // Per-category breakdown from line items
  const catMap = new Map<string, number>()
  for (const r of rows) {
    const items: ReceiptItem[] = typeof r.items === 'string' ? JSON.parse(r.items) : (r.items ?? [])
    for (const item of items) {
      const cat = item.category || 'uncategorized'
      catMap.set(cat, (catMap.get(cat) ?? 0) + item.price_cents)
    }
  }
  const categoryBreakdown = Array.from(catMap.entries()).map(([category, total_cents]) => ({
    category,
    total_cents,
  }))

  return {
    total_spend_cents: totalSpend,
    store_breakdown: storeBreakdown,
    category_breakdown: categoryBreakdown,
  }
}

// ============================================
// Link Receipt to Event
// ============================================

export async function linkReceiptToEvent(
  receiptId: string,
  eventId: string
): Promise<ShoppingReceipt> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!receiptId || !eventId) {
    throw new Error('Receipt ID and Event ID are required')
  }

  const { data, error } = await db
    .from('shopping_receipts')
    .update({ event_id: eventId })
    .eq('id', receiptId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[linkReceiptToEvent] Error:', error)
    throw new Error('Failed to link receipt to event')
  }

  revalidatePath('/dashboard')
  return data
}

// ============================================
// Update Inventory
// ============================================

export async function updateInventory(
  ingredientId: string,
  quantityOnHand: number,
  unit: string,
  expiryDate?: string
): Promise<InventoryEntry> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!ingredientId) {
    throw new Error('Ingredient ID is required')
  }
  if (quantityOnHand < 0) {
    throw new Error('Quantity cannot be negative')
  }

  // Upsert: update if exists, insert if not
  const { data: existing } = await db
    .from('inventory_entries')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('ingredient_id', ingredientId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await db
      .from('inventory_entries')
      .update({
        quantity_on_hand: quantityOnHand,
        unit,
        expiry_date: expiryDate ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)
      .select()
      .single()

    if (error) {
      console.error('[updateInventory] Error:', error)
      throw new Error('Failed to update inventory entry')
    }

    revalidatePath('/dashboard')
    return data
  }

  const { data, error } = await db
    .from('inventory_entries')
    .insert({
      tenant_id: user.tenantId!,
      ingredient_id: ingredientId,
      ingredient_name: ingredientId, // caller should pass real name; fallback to ID
      quantity_on_hand: quantityOnHand,
      unit,
      expiry_date: expiryDate ?? null,
      last_purchased_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[updateInventory] Error:', error)
    throw new Error('Failed to create inventory entry')
  }

  revalidatePath('/dashboard')
  return data
}

// ============================================
// Get Inventory Snapshot
// ============================================

export async function getInventorySnapshot(
  lowStockOnly?: boolean
): Promise<(InventoryEntry & { low_stock: boolean })[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('inventory_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('ingredient_name', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('[getInventorySnapshot] Error:', error)
    throw new Error('Failed to fetch inventory')
  }

  const rows: InventoryEntry[] = data ?? []

  const enriched = rows.map((entry) => ({
    ...entry,
    low_stock: entry.quantity_on_hand <= 1,
  }))

  if (lowStockOnly) {
    return enriched.filter((e) => e.low_stock)
  }

  return enriched
}
