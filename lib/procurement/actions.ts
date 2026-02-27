'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createVendor, listVendors } from '@/lib/vendors/actions'
import {
  createPurchaseOrder,
  addPOItem,
  getPurchaseOrder,
  getPurchaseOrders,
  submitPO,
  receivePOItems,
  type PurchaseOrder,
} from '@/lib/inventory/purchase-order-actions'

const CreateSupplierSchema = z.object({
  name: z.string().min(1),
  vendorType: z.string().default('grocery'),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  isPreferred: z.boolean().optional(),
})

const CreateOrderSchema = z.object({
  vendorId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

const AddOrderItemSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  ingredientId: z.string().uuid().optional(),
  ingredientName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  estimatedUnitPriceCents: z.number().int().nonnegative().optional(),
})

export type SupplierDirectoryEntry = {
  id: string
  name: string
  vendorType: string
  phone: string | null
  email: string | null
  address: string | null
  isPreferred: boolean
  itemCount: number
  openOrderCount: number
}

export type ProcurementReferenceData = {
  suppliers: Array<{ id: string; name: string }>
  ingredients: Array<{ id: string; name: string; category: string; defaultUnit: string }>
  events: Array<{ id: string; name: string; date: string }>
}

export type ProcurementOrder = PurchaseOrder & {
  workflowStatus: 'Draft' | 'Sent' | 'Partially Fulfilled' | 'Fulfilled' | 'Cancelled'
}

function toWorkflowStatus(status: string): ProcurementOrder['workflowStatus'] {
  if (status === 'draft') return 'Draft'
  if (status === 'submitted') return 'Sent'
  if (status === 'partially_received') return 'Partially Fulfilled'
  if (status === 'received') return 'Fulfilled'
  return 'Cancelled'
}

export async function getSupplierDirectoryData(): Promise<SupplierDirectoryEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [vendors, vendorItems, poRows] = await Promise.all([
    listVendors(false),
    supabase.from('vendor_items').select('vendor_id').eq('chef_id', user.tenantId!),
    supabase
      .from('purchase_orders')
      .select('vendor_id, status')
      .eq('chef_id', user.tenantId!)
      .in('status', ['draft', 'submitted', 'partially_received']),
  ])

  const itemCountMap = new Map<string, number>()
  for (const row of vendorItems.data ?? []) {
    itemCountMap.set(row.vendor_id, (itemCountMap.get(row.vendor_id) ?? 0) + 1)
  }

  const openOrderMap = new Map<string, number>()
  for (const row of poRows.data ?? []) {
    if (!row.vendor_id) continue
    openOrderMap.set(row.vendor_id, (openOrderMap.get(row.vendor_id) ?? 0) + 1)
  }

  return (vendors as any[]).map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    vendorType: vendor.vendor_type,
    phone: vendor.phone,
    email: vendor.email,
    address: vendor.address,
    isPreferred: vendor.is_preferred,
    itemCount: itemCountMap.get(vendor.id) ?? 0,
    openOrderCount: openOrderMap.get(vendor.id) ?? 0,
  }))
}

export async function createSupplier(input: {
  name: string
  vendorType?: string
  phone?: string
  email?: string
  address?: string
  website?: string
  notes?: string
  isPreferred?: boolean
}) {
  const parsed = CreateSupplierSchema.parse(input)
  await createVendor({
    name: parsed.name,
    vendor_type: parsed.vendorType,
    phone: parsed.phone,
    email: parsed.email,
    address: parsed.address,
    website: parsed.website,
    notes: parsed.notes,
    is_preferred: parsed.isPreferred,
  })

  revalidatePath('/procurement')
  revalidatePath('/inventory')
  return { ok: true }
}

export async function getProcurementReferenceData(): Promise<ProcurementReferenceData> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [vendors, ingredients, events] = await Promise.all([
    listVendors(true),
    supabase
      .from('ingredients')
      .select('id, name, category, default_unit')
      .eq('tenant_id', user.tenantId!)
      .eq('archived', false)
      .order('name'),
    supabase
      .from('events')
      .select('id, occasion, event_date')
      .eq('tenant_id', user.tenantId!)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date')
      .limit(40),
  ])

  if (ingredients.error) throw new Error(`Failed to load ingredients: ${ingredients.error.message}`)
  if (events.error) throw new Error(`Failed to load events: ${events.error.message}`)

  return {
    suppliers: (vendors as any[]).map((vendor) => ({ id: vendor.id, name: vendor.name })),
    ingredients: (ingredients.data ?? []).map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      defaultUnit: ingredient.default_unit,
    })),
    events: (events.data ?? []).map((event) => ({
      id: event.id,
      name: event.occasion || 'Event',
      date: event.event_date,
    })),
  }
}

export async function getProcurementOrders(): Promise<ProcurementOrder[]> {
  const orders = await getPurchaseOrders({})
  return orders.map((order) => ({
    ...order,
    workflowStatus: toWorkflowStatus(order.status),
  }))
}

export async function createProcurementOrder(input: {
  vendorId?: string
  eventId?: string
  notes?: string
}) {
  const parsed = CreateOrderSchema.parse(input)
  const created = await createPurchaseOrder({
    vendorId: parsed.vendorId,
    eventId: parsed.eventId,
    notes: parsed.notes,
  })

  revalidatePath('/procurement')
  revalidatePath('/inventory/purchase-orders')
  return created
}

export async function addProcurementOrderItem(input: {
  purchaseOrderId: string
  ingredientId?: string
  ingredientName: string
  quantity: number
  unit: string
  estimatedUnitPriceCents?: number
}) {
  const parsed = AddOrderItemSchema.parse(input)

  await addPOItem(parsed.purchaseOrderId, {
    ingredientId: parsed.ingredientId,
    ingredientName: parsed.ingredientName,
    orderedQty: parsed.quantity,
    unit: parsed.unit,
    estimatedUnitPriceCents: parsed.estimatedUnitPriceCents,
  })

  revalidatePath('/procurement')
  revalidatePath('/inventory/purchase-orders')
  return { ok: true }
}

export async function sendProcurementOrder(orderId: string) {
  await submitPO(orderId)
  revalidatePath('/procurement')
  return { ok: true }
}

export async function fulfillProcurementOrder(orderId: string, autoUpdateStock = true) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { po, items } = await getPurchaseOrder(orderId)

  if (autoUpdateStock) {
    const receivePayload = items
      .map((item) => ({
        itemId: item.id,
        receivedQty: Math.max(0, item.orderedQty - (item.receivedQty ?? 0)),
        actualUnitPriceCents:
          item.actualUnitPriceCents ?? item.estimatedUnitPriceCents ?? undefined,
      }))
      .filter((item) => item.receivedQty > 0)

    if (receivePayload.length > 0) {
      await receivePOItems(orderId, receivePayload)
    }
  } else {
    // Mark as fulfilled without creating inventory transactions.
    for (const item of items) {
      await supabase
        .from('purchase_order_items')
        .update({
          received_qty: item.receivedQty ?? item.orderedQty,
          is_received: true,
          actual_unit_price_cents: item.actualUnitPriceCents ?? item.estimatedUnitPriceCents,
          actual_total_cents:
            item.actualTotalCents ??
            Math.round(
              (item.receivedQty ?? item.orderedQty) *
                (item.actualUnitPriceCents ?? item.estimatedUnitPriceCents ?? 0)
            ),
          received_at: new Date().toISOString(),
        } as any)
        .eq('id', item.id)
    }

    await supabase
      .from('purchase_orders')
      .update({
        status: 'received',
        received_at: new Date().toISOString(),
        actual_total_cents: po.actualTotalCents ?? po.estimatedTotalCents,
      } as any)
      .eq('id', orderId)
      .eq('chef_id', user.tenantId!)
  }

  revalidatePath('/procurement')
  revalidatePath('/inventory/purchase-orders')
  return { ok: true }
}
