// Commerce Engine V1 — Sale Actions
// CRUD for sales and sale items. Handles sale creation, item management, voiding.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SaleChannel, TaxClass } from './constants'
import { canVoid } from './sale-fsm'

// ─── Types ────────────────────────────────────────────────────────

export type CreateSaleInput = {
  channel: SaleChannel
  eventId?: string
  clientId?: string
  taxZipCode?: string
  notes?: string
}

export type AddSaleItemInput = {
  saleId: string
  productProjectionId?: string
  name: string
  description?: string
  sku?: string
  category?: string
  unitPriceCents: number
  quantity: number
  discountCents?: number
  taxClass?: TaxClass
  taxCents?: number
  modifiersApplied?: Array<{ name: string; option: string; price_delta_cents: number }>
  unitCostCents?: number
}

// ─── Create Sale ──────────────────────────────────────────────────

export async function createSale(input: CreateSaleInput) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('sales')
    .insert({
      tenant_id: user.tenantId!,
      channel: input.channel,
      event_id: input.eventId ?? null,
      client_id: input.clientId ?? null,
      tax_zip_code: input.taxZipCode ?? null,
      notes: input.notes ?? null,
      status: 'draft',
      created_by: user.id,
    } as any)
    .select('id, sale_number')
    .single()

  if (error) throw new Error(`Failed to create sale: ${error.message}`)

  revalidatePath('/commerce')
  return data
}

// ─── Add Sale Item ────────────────────────────────────────────────

export async function addSaleItem(input: AddSaleItemInput) {
  const user = await requireChef()
  const supabase = createServerClient()

  if (!Number.isInteger(input.unitPriceCents) || input.unitPriceCents < 0) {
    throw new Error('Unit price must be a non-negative integer (cents)')
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error('Quantity must be a positive integer')
  }

  const discount = input.discountCents ?? 0
  const modifierTotal = (input.modifiersApplied ?? []).reduce(
    (sum, m) => sum + m.price_delta_cents * input.quantity,
    0
  )
  const lineTotalCents = input.unitPriceCents * input.quantity + modifierTotal - discount

  // Get current max sort_order for this sale
  const { data: existing } = await supabase
    .from('sale_items')
    .select('sort_order')
    .eq('sale_id', input.saleId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSort = existing && existing.length > 0 ? (existing[0] as any).sort_order + 1 : 0

  const { data, error } = await supabase
    .from('sale_items')
    .insert({
      sale_id: input.saleId,
      tenant_id: user.tenantId!,
      product_projection_id: input.productProjectionId ?? null,
      name: input.name,
      description: input.description ?? null,
      sku: input.sku ?? null,
      category: input.category ?? null,
      unit_price_cents: input.unitPriceCents,
      quantity: input.quantity,
      discount_cents: discount,
      line_total_cents: lineTotalCents,
      tax_class: input.taxClass ?? 'standard',
      tax_cents: input.taxCents ?? 0,
      modifiers_applied: input.modifiersApplied ?? [],
      unit_cost_cents: input.unitCostCents ?? null,
      sort_order: nextSort,
    } as any)
    .select('id')
    .single()

  if (error) throw new Error(`Failed to add sale item: ${error.message}`)

  // Recalculate sale totals
  await recalculateSaleTotals(input.saleId, user.tenantId!)

  revalidatePath('/commerce')
  return { id: data.id }
}

// ─── Remove Sale Item ─────────────────────────────────────────────

export async function removeSaleItem(saleId: string, itemId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('sale_items')
    .delete()
    .eq('id', itemId)
    .eq('sale_id', saleId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to remove sale item: ${error.message}`)

  await recalculateSaleTotals(saleId, user.tenantId!)
  revalidatePath('/commerce')
}

// ─── Update Sale Item Quantity ────────────────────────────────────

export async function updateSaleItemQuantity(saleId: string, itemId: string, quantity: number) {
  const user = await requireChef()
  const supabase = createServerClient()

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Quantity must be a positive integer')
  }

  // Fetch existing item to recalculate line total
  const { data: item, error: fetchErr } = await supabase
    .from('sale_items')
    .select('unit_price_cents, discount_cents, modifiers_applied')
    .eq('id', itemId)
    .eq('sale_id', saleId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !item) throw new Error('Sale item not found')

  const modifierTotal = ((item as any).modifiers_applied ?? []).reduce(
    (sum: number, m: any) => sum + (m.price_delta_cents ?? 0) * quantity,
    0
  )
  const lineTotalCents =
    (item as any).unit_price_cents * quantity + modifierTotal - ((item as any).discount_cents ?? 0)

  const { error } = await supabase
    .from('sale_items')
    .update({ quantity, line_total_cents: lineTotalCents } as any)
    .eq('id', itemId)
    .eq('sale_id', saleId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update quantity: ${error.message}`)

  await recalculateSaleTotals(saleId, user.tenantId!)
  revalidatePath('/commerce')
}

// ─── Void Sale ────────────────────────────────────────────────────

export async function voidSale(saleId: string, reason: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch current status
  const { data: sale, error: fetchErr } = await supabase
    .from('sales')
    .select('status')
    .eq('id', saleId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !sale) throw new Error('Sale not found')

  if (!canVoid((sale as any).status)) {
    throw new Error(`Cannot void a sale in ${(sale as any).status} status`)
  }

  const { error } = await supabase
    .from('sales')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      voided_by: user.id,
      void_reason: reason,
    } as any)
    .eq('id', saleId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to void sale: ${error.message}`)

  revalidatePath('/commerce')
}

// ─── Get Sale ─────────────────────────────────────────────────────

export async function getSale(saleId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: sale, error } = await supabase
    .from('sales')
    .select('*')
    .eq('id', saleId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) throw new Error(`Sale not found: ${error.message}`)

  // Fetch items
  const { data: items } = await supabase
    .from('sale_items')
    .select('*')
    .eq('sale_id', saleId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  return { sale, items: items ?? [] }
}

// ─── List Sales ───────────────────────────────────────────────────

export async function listSales(filters?: {
  status?: string
  channel?: string
  clientId?: string
  eventId?: string
  from?: string // ISO date
  to?: string // ISO date
  limit?: number
  offset?: number
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('sales')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.channel) query = query.eq('channel', filters.channel)
  if (filters?.clientId) query = query.eq('client_id', filters.clientId)
  if (filters?.eventId) query = query.eq('event_id', filters.eventId)
  if (filters?.from) query = query.gte('created_at', filters.from)
  if (filters?.to) query = query.lte('created_at', filters.to)

  if (filters?.limit) {
    const from = filters.offset ?? 0
    query = query.range(from, from + filters.limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to list sales: ${error.message}`)

  return { sales: data ?? [], total: count ?? 0 }
}

// ─── Internal: Recalculate Sale Totals ────────────────────────────

async function recalculateSaleTotals(saleId: string, tenantId: string) {
  const supabase = createServerClient()

  const { data: items } = await supabase
    .from('sale_items')
    .select('line_total_cents, tax_cents, discount_cents')
    .eq('sale_id', saleId)
    .eq('tenant_id', tenantId)

  if (!items) return

  const subtotalCents = items.reduce((sum, i) => sum + ((i as any).line_total_cents ?? 0), 0)
  const taxCents = items.reduce((sum, i) => sum + ((i as any).tax_cents ?? 0), 0)
  const discountCents = items.reduce((sum, i) => sum + ((i as any).discount_cents ?? 0), 0)
  const totalCents = subtotalCents + taxCents

  await supabase
    .from('sales')
    .update({
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      discount_cents: discountCents,
      total_cents: totalCents,
    } as any)
    .eq('id', saleId)
    .eq('tenant_id', tenantId)
}
