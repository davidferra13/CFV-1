'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/send'
import { PurchaseOrderEmail } from '@/lib/email/templates/purchase-order'

// ============================================
// TYPES
// ============================================

export type PurchaseOrder = {
  id: string
  chef_id: string
  vendor_id: string
  po_number: string
  status: 'draft' | 'sent' | 'acknowledged' | 'partially_received' | 'received' | 'cancelled'
  order_date: string
  expected_delivery_date: string | null
  notes: string | null
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  sent_at: string | null
  received_at: string | null
  created_at: string
  updated_at: string
  vendor?: {
    id: string
    name: string
    email: string | null
    contact_name: string | null
    phone: string | null
  }
}

export type PurchaseOrderItem = {
  id: string
  po_id: string
  chef_id: string
  item_name: string
  quantity: number
  unit: string
  unit_cost_cents: number | null
  total_cost_cents: number | null
  received_quantity: number
  notes: string | null
  created_at: string
}

type AddItemInput = {
  itemName: string
  quantity: number
  unit: string
  unitCostCents?: number
}

type UpdateItemInput = {
  itemName?: string
  quantity?: number
  unit?: string
  unitCostCents?: number
  notes?: string
}

type POFilters = {
  status?: string
  vendorId?: string
  startDate?: string
  endDate?: string
}

type ReceivedItem = {
  itemId: string
  receivedQuantity: number
}

// ============================================
// HELPERS
// ============================================

function generatePONumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(10000 + Math.random() * 90000)
  return `PO-${year}-${String(rand).padStart(5, '0')}`
}

async function recalcPOTotals(supabase: any, poId: string, chefId: string) {
  const { data: items } = await supabase
    .from('purchase_order_items')
    .select('total_cost_cents')
    .eq('po_id', poId)
    .eq('chef_id', chefId)

  const subtotal = (items || []).reduce(
    (sum: number, i: { total_cost_cents: number | null }) => sum + (i.total_cost_cents || 0),
    0
  )

  await supabase
    .from('purchase_orders')
    .update({ subtotal_cents: subtotal, total_cents: subtotal })
    .eq('id', poId)
    .eq('chef_id', chefId)
}

// ============================================
// CRUD
// ============================================

export async function createPurchaseOrder(vendorId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const poNumber = generatePONumber()

  const { data, error } = await supabase
    .from('purchase_orders')
    .insert({
      chef_id: user.tenantId!,
      vendor_id: vendorId,
      po_number: poNumber,
      status: 'draft',
      order_date: new Date().toISOString().split('T')[0],
    })
    .select('*, vendor:vendors(id, name, email, contact_name, phone)')
    .single()

  if (error) {
    console.error('[purchase-orders] createPurchaseOrder error:', error)
    throw new Error('Failed to create purchase order')
  }

  revalidatePath('/commerce/purchase-orders')
  return data as PurchaseOrder
}

export async function addItemToPO(poId: string, input: AddItemInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const totalCost = input.unitCostCents ? Math.round(input.quantity * input.unitCostCents) : null

  const { data, error } = await supabase
    .from('purchase_order_items')
    .insert({
      po_id: poId,
      chef_id: user.tenantId!,
      item_name: input.itemName,
      quantity: input.quantity,
      unit: input.unit,
      unit_cost_cents: input.unitCostCents || null,
      total_cost_cents: totalCost,
    })
    .select()
    .single()

  if (error) {
    console.error('[purchase-orders] addItemToPO error:', error)
    throw new Error('Failed to add item to purchase order')
  }

  await recalcPOTotals(supabase, poId, user.tenantId!)
  revalidatePath('/commerce/purchase-orders')
  revalidatePath(`/commerce/purchase-orders/${poId}`)
  return data as PurchaseOrderItem
}

export async function removeItemFromPO(poId: string, itemId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('purchase_order_items')
    .delete()
    .eq('id', itemId)
    .eq('po_id', poId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[purchase-orders] removeItemFromPO error:', error)
    throw new Error('Failed to remove item')
  }

  await recalcPOTotals(supabase, poId, user.tenantId!)
  revalidatePath('/commerce/purchase-orders')
  revalidatePath(`/commerce/purchase-orders/${poId}`)
}

export async function updatePOItem(itemId: string, input: UpdateItemInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get current item to find po_id
  const { data: existing } = await supabase
    .from('purchase_order_items')
    .select('po_id, quantity, unit_cost_cents')
    .eq('id', itemId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!existing) throw new Error('Item not found')

  const qty = input.quantity ?? existing.quantity
  const unitCost = input.unitCostCents ?? existing.unit_cost_cents
  const totalCost = unitCost ? Math.round(qty * unitCost) : null

  const updates: Record<string, unknown> = {}
  if (input.itemName !== undefined) updates.item_name = input.itemName
  if (input.quantity !== undefined) updates.quantity = input.quantity
  if (input.unit !== undefined) updates.unit = input.unit
  if (input.unitCostCents !== undefined) updates.unit_cost_cents = input.unitCostCents
  if (input.notes !== undefined) updates.notes = input.notes
  updates.total_cost_cents = totalCost

  const { error } = await supabase
    .from('purchase_order_items')
    .update(updates)
    .eq('id', itemId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[purchase-orders] updatePOItem error:', error)
    throw new Error('Failed to update item')
  }

  await recalcPOTotals(supabase, existing.po_id, user.tenantId!)
  revalidatePath('/commerce/purchase-orders')
  revalidatePath(`/commerce/purchase-orders/${existing.po_id}`)
}

export async function sendPurchaseOrder(poId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get PO with vendor and items
  const { data: po } = await supabase
    .from('purchase_orders')
    .select('*, vendor:vendors(id, name, email, contact_name, phone)')
    .eq('id', poId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!po) throw new Error('Purchase order not found')
  if (po.status !== 'draft') throw new Error('Only draft POs can be sent')

  const { data: items } = await supabase
    .from('purchase_order_items')
    .select('*')
    .eq('po_id', poId)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (!items || items.length === 0) throw new Error('Cannot send a PO with no items')

  // Update status
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', poId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[purchase-orders] sendPurchaseOrder error:', error)
    throw new Error('Failed to send purchase order')
  }

  // Get chef info for the email
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, phone, email')
    .eq('id', user.tenantId!)
    .single()

  // Send email to vendor (non-blocking)
  if (po.vendor?.email) {
    try {
      await sendEmail({
        to: po.vendor.email,
        subject: `Purchase Order ${po.po_number}`,
        react: PurchaseOrderEmail({
          poNumber: po.po_number,
          vendorName: po.vendor.contact_name || po.vendor.name,
          orderDate: new Date(po.order_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          expectedDeliveryDate: po.expected_delivery_date
            ? new Date(po.expected_delivery_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : null,
          items: (items || []).map((i: PurchaseOrderItem) => ({
            name: i.item_name,
            quantity: i.quantity,
            unit: i.unit,
            unitCostFormatted: i.unit_cost_cents
              ? `$${(i.unit_cost_cents / 100).toFixed(2)}`
              : null,
            totalFormatted: i.total_cost_cents ? `$${(i.total_cost_cents / 100).toFixed(2)}` : null,
          })),
          subtotalFormatted: `$${(po.subtotal_cents / 100).toFixed(2)}`,
          totalFormatted: `$${(po.total_cents / 100).toFixed(2)}`,
          notes: po.notes,
          businessName: chef?.business_name || 'ChefFlow',
          businessPhone: chef?.phone || null,
          businessEmail: chef?.email || user.email,
        }),
      })
    } catch (err) {
      console.error('[non-blocking] PO email failed:', err)
    }
  }

  revalidatePath('/commerce/purchase-orders')
  revalidatePath(`/commerce/purchase-orders/${poId}`)
  return { success: true }
}

export async function receivePurchaseOrder(poId: string, items: ReceivedItem[]) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Update each item's received quantity
  for (const item of items) {
    await supabase
      .from('purchase_order_items')
      .update({ received_quantity: item.receivedQuantity })
      .eq('id', item.itemId)
      .eq('chef_id', user.tenantId!)
  }

  // Check if all items fully received
  const { data: allItems } = await supabase
    .from('purchase_order_items')
    .select('quantity, received_quantity')
    .eq('po_id', poId)
    .eq('chef_id', user.tenantId!)

  const allReceived = (allItems || []).every(
    (i: { quantity: number; received_quantity: number }) => i.received_quantity >= i.quantity
  )
  const someReceived = (allItems || []).some(
    (i: { quantity: number; received_quantity: number }) => i.received_quantity > 0
  )

  let newStatus: string
  if (allReceived) {
    newStatus = 'received'
  } else if (someReceived) {
    newStatus = 'partially_received'
  } else {
    newStatus = 'sent'
  }

  const updates: Record<string, unknown> = { status: newStatus }
  if (allReceived) updates.received_at = new Date().toISOString()

  await supabase
    .from('purchase_orders')
    .update(updates)
    .eq('id', poId)
    .eq('chef_id', user.tenantId!)

  revalidatePath('/commerce/purchase-orders')
  revalidatePath(`/commerce/purchase-orders/${poId}`)
  return { status: newStatus }
}

export async function getPurchaseOrders(filters?: POFilters) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('purchase_orders')
    .select('*, vendor:vendors(id, name, email, contact_name)')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.vendorId) {
    query = query.eq('vendor_id', filters.vendorId)
  }
  if (filters?.startDate) {
    query = query.gte('order_date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('order_date', filters.endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('[purchase-orders] getPurchaseOrders error:', error)
    throw new Error('Failed to load purchase orders')
  }

  return (data || []) as PurchaseOrder[]
}

export async function getPurchaseOrder(poId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select('*, vendor:vendors(id, name, email, contact_name, phone)')
    .eq('id', poId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !po) {
    console.error('[purchase-orders] getPurchaseOrder error:', error)
    throw new Error('Purchase order not found')
  }

  const { data: items } = await supabase
    .from('purchase_order_items')
    .select('*')
    .eq('po_id', poId)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: true })

  return { po: po as PurchaseOrder, items: (items || []) as PurchaseOrderItem[] }
}

export async function cancelPurchaseOrder(poId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: po } = await supabase
    .from('purchase_orders')
    .select('status')
    .eq('id', poId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!po) throw new Error('Purchase order not found')
  if (po.status === 'received') throw new Error('Cannot cancel a received PO')

  const { error } = await supabase
    .from('purchase_orders')
    .update({ status: 'cancelled' })
    .eq('id', poId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[purchase-orders] cancelPurchaseOrder error:', error)
    throw new Error('Failed to cancel purchase order')
  }

  revalidatePath('/commerce/purchase-orders')
  revalidatePath(`/commerce/purchase-orders/${poId}`)
}

export async function generatePOFromParLevels() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get station components with par levels
  const { data: components } = await supabase
    .from('station_components')
    .select(
      `
      id, name, par_level, par_unit,
      station:stations(id, name)
    `
    )
    .eq('chef_id', user.tenantId!)
    .gt('par_level', 0)

  if (!components || components.length === 0) {
    return { items: [], message: 'No station components with par levels found' }
  }

  // Get clipboard entries for on-hand quantities
  const { data: clipboard } = await supabase
    .from('clipboard_entries')
    .select('component_id, on_hand')
    .eq('chef_id', user.tenantId!)

  const onHandMap = new Map<string, number>()
  for (const entry of clipboard || []) {
    onHandMap.set(entry.component_id, entry.on_hand || 0)
  }

  // Find items below par
  const belowPar = components.filter((c: any) => {
    const onHand = onHandMap.get(c.id) || 0
    return onHand < c.par_level
  })

  const items = belowPar.map((c: any) => {
    const onHand = onHandMap.get(c.id) || 0
    const needed = c.par_level - onHand
    return {
      itemName: c.name,
      quantity: needed,
      unit: c.par_unit || 'each',
      stationName: c.station?.name || 'Unknown',
      parLevel: c.par_level,
      onHand,
    }
  })

  return { items, message: `${items.length} items below par level` }
}

export async function updatePurchaseOrder(
  poId: string,
  input: { notes?: string; expectedDeliveryDate?: string; taxCents?: number }
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updates: Record<string, unknown> = {}
  if (input.notes !== undefined) updates.notes = input.notes
  if (input.expectedDeliveryDate !== undefined)
    updates.expected_delivery_date = input.expectedDeliveryDate || null
  if (input.taxCents !== undefined) {
    updates.tax_cents = input.taxCents
    // Recalc total
    const { data: po } = await supabase
      .from('purchase_orders')
      .select('subtotal_cents')
      .eq('id', poId)
      .eq('chef_id', user.tenantId!)
      .single()
    if (po) {
      updates.total_cents = po.subtotal_cents + input.taxCents
    }
  }

  const { error } = await supabase
    .from('purchase_orders')
    .update(updates)
    .eq('id', poId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[purchase-orders] updatePurchaseOrder error:', error)
    throw new Error('Failed to update purchase order')
  }

  revalidatePath('/commerce/purchase-orders')
  revalidatePath(`/commerce/purchase-orders/${poId}`)
}
