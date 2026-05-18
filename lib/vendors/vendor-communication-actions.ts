'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { draftVendorOrders } from '@/lib/vendors/vendor-order-draft'
import type {
  RecordVendorOrderInput,
  ShoppingListItemForVendorDraft,
  VendorCommunicationChannel,
  VendorCommunicationPreference,
  VendorOrderDraft,
  VendorOrderItemRecord,
  VendorOrderRecord,
  VendorProfileSummary,
} from '@/lib/vendors/vendor-communication-types'

const channelSchema = z.enum(['email', 'phone', 'sms', 'portal', 'in_person'])
const orderStatusSchema = z.enum([
  'draft',
  'ready_to_send',
  'sent',
  'confirmed',
  'received',
  'cancelled',
])

const shoppingListItemSchema = z.object({
  ingredientName: z.string().min(1).max(240),
  ingredientCategory: z.string().max(120).nullable().optional(),
  quantity: z.number().finite().nonnegative(),
  unit: z.string().min(1).max(80),
  notes: z.string().max(500).nullable().optional(),
  preferredVendorId: z.string().uuid().nullable().optional(),
  estimatedUnitCostCents: z.number().int().nonnegative().nullable().optional(),
})

const recordOrderSchema = z.object({
  vendorId: z.string().uuid().nullable().optional(),
  eventId: z.string().uuid().nullable().optional(),
  status: orderStatusSchema.optional(),
  channel: channelSchema.optional(),
  orderSummary: z.string().min(1).max(8000),
  estimatedTotalCents: z.number().int().nonnegative().nullable().optional(),
  items: z.array(shoppingListItemSchema).min(1).max(500),
})

function mapVendor(row: any): VendorProfileSummary {
  return {
    id: row.id,
    chefId: row.chef_id,
    name: row.name,
    category: row.category ?? null,
    vendorType: row.vendor_type ?? null,
    contactName: row.contact_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    isPreferred: Boolean(row.is_preferred),
    minimumOrderCents: row.minimum_order_cents ?? null,
    reliabilityScore:
      typeof row.reliability_score === 'number'
        ? row.reliability_score
        : (row.reliability_score ?? null),
  }
}

function mapPreference(row: any): VendorCommunicationPreference {
  return {
    id: row.id,
    chefId: row.chef_id,
    vendorId: row.vendor_id,
    preferredChannel: row.preferred_channel,
    orderCutoffTime: row.order_cutoff_time ?? null,
    leadTimeHours: row.lead_time_hours ?? null,
    minimumOrderCents: row.minimum_order_cents ?? null,
    ingredientCategories: row.ingredient_categories ?? [],
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapOrder(row: any): VendorOrderRecord {
  return {
    id: row.id,
    chefId: row.chef_id,
    vendorId: row.vendor_id ?? null,
    eventId: row.event_id ?? null,
    status: row.status,
    channel: row.channel,
    orderSummary: row.order_summary,
    estimatedTotalCents: row.estimated_total_cents ?? null,
    sentAt: row.sent_at ?? null,
    confirmedAt: row.confirmed_at ?? null,
    receivedAt: row.received_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapOrderItem(row: any): VendorOrderItemRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    chefId: row.chef_id,
    ingredientName: row.ingredient_name,
    ingredientCategory: row.ingredient_category ?? null,
    quantity: Number(row.quantity ?? 0),
    unit: row.unit,
    estimatedUnitCostCents: row.estimated_unit_cost_cents ?? null,
    estimatedTotalCents: row.estimated_total_cents ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
  }
}

async function loadVendorPreferences(chefId: string): Promise<VendorCommunicationPreference[]> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from('vendor_communication_preferences')
    .select('*')
    .eq('chef_id', chefId)

  if (error) {
    throw new Error(`Failed to load vendor communication preferences: ${error.message}`)
  }

  return (data ?? []).map(mapPreference)
}

export async function getVendorCommunicationVendors(): Promise<VendorProfileSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('vendors')
    .select(
      'id, chef_id, name, category, vendor_type, contact_name, email, phone, is_preferred, minimum_order_cents, reliability_score'
    )
    .eq('chef_id', user.tenantId!)
    .order('is_preferred', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to load vendors for communication: ${error.message}`)
  }

  return (data ?? []).map(mapVendor)
}

export async function getVendors(): Promise<VendorProfileSummary[]> {
  return getVendorCommunicationVendors()
}

export async function getVendorCommunicationHistory(input?: {
  vendorId?: string
  limit?: number
}): Promise<Array<VendorOrderRecord & { items: VendorOrderItemRecord[] }>> {
  const user = await requireChef()
  const db: any = createServerClient()
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200)

  let query = db
    .from('vendor_orders')
    .select('*, vendor_order_items(*)')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (input?.vendorId) query = query.eq('vendor_id', input.vendorId)

  const { data, error } = await query
  if (error) {
    throw new Error(`Failed to load vendor order history: ${error.message}`)
  }

  return (data ?? []).map((row: any) => ({
    ...mapOrder(row),
    items: (row.vendor_order_items ?? []).map(mapOrderItem),
  }))
}

export async function getVendorHistory(input?: {
  vendorId?: string
  limit?: number
}): Promise<Array<VendorOrderRecord & { items: VendorOrderItemRecord[] }>> {
  return getVendorCommunicationHistory(input)
}

export async function getPreferredCommunicationVendor(
  ingredientCategory: string
): Promise<VendorProfileSummary | null> {
  const user = await requireChef()
  const vendors = await getVendorCommunicationVendors()
  const preferences = await loadVendorPreferences(user.tenantId!)
  const normalized = ingredientCategory.trim().toLowerCase()

  const preference = preferences.find((pref) =>
    pref.ingredientCategories.map((item) => item.trim().toLowerCase()).includes(normalized)
  )

  if (preference) {
    return vendors.find((vendor) => vendor.id === preference.vendorId) ?? null
  }

  return (
    vendors.find((vendor) => {
      const category = (vendor.category ?? vendor.vendorType ?? '').trim().toLowerCase()
      return vendor.isPreferred && category === normalized
    }) ??
    vendors.find((vendor) => vendor.isPreferred) ??
    null
  )
}

export async function getPreferredVendor(
  ingredientCategory: string
): Promise<VendorProfileSummary | null> {
  return getPreferredCommunicationVendor(ingredientCategory)
}

export async function draftVendorCommunicationOrders(input: {
  eventId?: string | null
  items: ShoppingListItemForVendorDraft[]
}): Promise<VendorOrderDraft> {
  const user = await requireChef()
  const items = z
    .array(shoppingListItemSchema)
    .parse(input.items) as ShoppingListItemForVendorDraft[]
  const [vendors, preferences] = await Promise.all([
    getVendorCommunicationVendors(),
    loadVendorPreferences(user.tenantId!),
  ])

  return draftVendorOrders({
    chefId: user.tenantId!,
    eventId: input.eventId ?? null,
    items,
    vendors,
    preferences,
  })
}

export async function recordVendorCommunicationOrder(
  input: RecordVendorOrderInput
): Promise<VendorOrderRecord & { items: VendorOrderItemRecord[] }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const parsed = recordOrderSchema.parse(input)
  const channel: VendorCommunicationChannel = parsed.channel ?? 'email'
  const status = parsed.status ?? 'draft'

  if (parsed.vendorId) {
    const { data: vendor, error: vendorError } = await db
      .from('vendors')
      .select('id')
      .eq('id', parsed.vendorId)
      .eq('chef_id', user.tenantId!)
      .maybeSingle()

    if (vendorError || !vendor) {
      throw new Error('Vendor not found for this chef.')
    }
  }

  const now = new Date().toISOString()
  const { data: order, error: orderError } = await db
    .from('vendor_orders')
    .insert({
      chef_id: user.tenantId!,
      vendor_id: parsed.vendorId ?? null,
      event_id: parsed.eventId ?? null,
      status,
      channel,
      order_summary: parsed.orderSummary,
      estimated_total_cents: parsed.estimatedTotalCents ?? null,
      sent_at: status === 'sent' ? now : null,
      confirmed_at: status === 'confirmed' ? now : null,
      received_at: status === 'received' ? now : null,
    })
    .select('*')
    .single()

  if (orderError || !order) {
    throw new Error(`Failed to record vendor order: ${orderError?.message ?? 'Unknown error'}`)
  }

  const itemPayload = parsed.items.map((item) => {
    const unitCost = item.estimatedUnitCostCents ?? null
    const estimatedTotal =
      unitCost == null ? null : Math.max(0, Math.round(unitCost * item.quantity))

    return {
      order_id: order.id,
      chef_id: user.tenantId!,
      ingredient_name: item.ingredientName,
      ingredient_category: item.ingredientCategory ?? null,
      quantity: item.quantity,
      unit: item.unit,
      estimated_unit_cost_cents: unitCost,
      estimated_total_cents: estimatedTotal,
      notes: item.notes ?? null,
    }
  })

  const { data: items, error: itemError } = await db
    .from('vendor_order_items')
    .insert(itemPayload)
    .select('*')

  if (itemError) {
    throw new Error(`Failed to record vendor order items: ${itemError.message}`)
  }

  return {
    ...mapOrder(order),
    items: (items ?? []).map(mapOrderItem),
  }
}

export async function recordVendorOrder(
  input: RecordVendorOrderInput
): Promise<VendorOrderRecord & { items: VendorOrderItemRecord[] }> {
  return recordVendorCommunicationOrder(input)
}
