// Wholesale/B2B account and order management
// Chef-only: manage wholesale accounts, orders, invoicing

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Types

export type WholesaleAccount = {
  id: string
  tenant_id: string
  business_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  payment_terms: 'cod' | 'net_7' | 'net_15' | 'net_30'
  discount_percent: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type WholesaleOrderItem = {
  product_name: string
  quantity: number
  unit_price_cents: number
}

export type WholesaleOrder = {
  id: string
  tenant_id: string
  account_id: string
  order_date: string
  delivery_date: string
  items: WholesaleOrderItem[]
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  status: string
  invoice_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  wholesale_accounts?: Pick<WholesaleAccount, 'business_name' | 'discount_percent'>
}

// ============================================================
// Account CRUD
// ============================================================

export async function createWholesaleAccount(data: {
  business_name: string
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  address?: string | null
  payment_terms?: string
  discount_percent?: number
  notes?: string | null
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: account, error } = await supabase
    .from('wholesale_accounts')
    .insert({
      tenant_id: user.tenantId!,
      business_name: data.business_name,
      contact_name: data.contact_name || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      address: data.address || null,
      payment_terms: data.payment_terms || 'cod',
      discount_percent: data.discount_percent || 0,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create account: ${error.message}`)

  revalidatePath('/bakery/wholesale')
  return account
}

export async function updateWholesaleAccount(
  id: string,
  data: Partial<{
    business_name: string
    contact_name: string | null
    contact_email: string | null
    contact_phone: string | null
    address: string | null
    payment_terms: string
    discount_percent: number
    notes: string | null
    is_active: boolean
  }>
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: account, error } = await supabase
    .from('wholesale_accounts')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update account: ${error.message}`)

  revalidatePath('/bakery/wholesale')
  return account
}

export async function deleteWholesaleAccount(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('wholesale_accounts')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete account: ${error.message}`)

  revalidatePath('/bakery/wholesale')
}

export async function getWholesaleAccounts() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('wholesale_accounts')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('business_name')

  if (error) throw new Error(`Failed to load accounts: ${error.message}`)
  return (data || []) as WholesaleAccount[]
}

// ============================================================
// Order CRUD
// ============================================================

export async function createWholesaleOrder(data: {
  account_id: string
  order_date: string
  delivery_date: string
  items: WholesaleOrderItem[]
  notes?: string | null
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get account for discount
  const { data: account, error: accErr } = await supabase
    .from('wholesale_accounts')
    .select('discount_percent')
    .eq('id', data.account_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (accErr || !account) throw new Error('Account not found')

  // Calculate totals
  const subtotalCents = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_cents,
    0
  )
  const discountCents = Math.round(subtotalCents * (account.discount_percent / 100))
  const totalCents = subtotalCents - discountCents

  const { data: order, error } = await supabase
    .from('wholesale_orders')
    .insert({
      tenant_id: user.tenantId!,
      account_id: data.account_id,
      order_date: data.order_date,
      delivery_date: data.delivery_date,
      items: data.items as unknown as Record<string, unknown>,
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      total_cents: totalCents,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create order: ${error.message}`)

  revalidatePath('/bakery/wholesale')
  return order
}

export async function updateWholesaleOrder(
  id: string,
  data: Partial<{
    order_date: string
    delivery_date: string
    items: WholesaleOrderItem[]
    status: string
    notes: string | null
  }>
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const updatePayload: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  // Recalculate totals if items changed
  if (data.items) {
    // Get account discount
    const { data: order } = await supabase
      .from('wholesale_orders')
      .select('account_id')
      .eq('id', id)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (order) {
      const { data: account } = await supabase
        .from('wholesale_accounts')
        .select('discount_percent')
        .eq('id', order.account_id)
        .single()

      const subtotalCents = data.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price_cents,
        0
      )
      const discountPercent = account?.discount_percent || 0
      const discountCents = Math.round(subtotalCents * (discountPercent / 100))
      updatePayload.subtotal_cents = subtotalCents
      updatePayload.discount_cents = discountCents
      updatePayload.total_cents = subtotalCents - discountCents
      updatePayload.items = data.items as unknown as Record<string, unknown>
    }
  }

  const { data: updated, error } = await supabase
    .from('wholesale_orders')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update order: ${error.message}`)

  revalidatePath('/bakery/wholesale')
  return updated
}

export async function deleteWholesaleOrder(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('wholesale_orders')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete order: ${error.message}`)

  revalidatePath('/bakery/wholesale')
}

export async function getWholesaleOrders(filters?: { account_id?: string; status?: string }) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('wholesale_orders')
    .select('*, wholesale_accounts(business_name, discount_percent)')
    .eq('tenant_id', user.tenantId!)
    .order('delivery_date', { ascending: false })

  if (filters?.account_id) query = query.eq('account_id', filters.account_id)
  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query

  if (error) throw new Error(`Failed to load orders: ${error.message}`)
  return (data || []) as WholesaleOrder[]
}

// ============================================================
// Specialized Queries
// ============================================================

export async function getOrdersByDeliveryDate(date: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('wholesale_orders')
    .select('*, wholesale_accounts(business_name)')
    .eq('tenant_id', user.tenantId!)
    .eq('delivery_date', date)
    .order('created_at')

  if (error) throw new Error(`Failed to load orders: ${error.message}`)
  return (data || []) as WholesaleOrder[]
}

export async function getAccountOrderHistory(accountId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('wholesale_orders')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('account_id', accountId)
    .order('order_date', { ascending: false })

  if (error) throw new Error(`Failed to load order history: ${error.message}`)
  return (data || []) as WholesaleOrder[]
}

export async function createStandingOrder(
  accountId: string,
  items: WholesaleOrderItem[],
  frequency: 'daily' | 'weekly'
) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get account for discount
  const { data: account, error: accErr } = await supabase
    .from('wholesale_accounts')
    .select('discount_percent')
    .eq('id', accountId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (accErr || !account) throw new Error('Account not found')

  const subtotalCents = items.reduce((sum, item) => sum + item.quantity * item.unit_price_cents, 0)
  const discountCents = Math.round(subtotalCents * (account.discount_percent / 100))
  const totalCents = subtotalCents - discountCents

  // Generate orders for the next 7 days (daily) or 4 weeks (weekly)
  const orders: Array<{
    tenant_id: string
    account_id: string
    order_date: string
    delivery_date: string
    items: unknown
    subtotal_cents: number
    discount_cents: number
    total_cents: number
    notes: string
  }> = []

  const today = new Date()
  const count = frequency === 'daily' ? 7 : 4

  for (let i = 1; i <= count; i++) {
    const deliveryDate = new Date(today)
    if (frequency === 'daily') {
      deliveryDate.setDate(today.getDate() + i)
    } else {
      deliveryDate.setDate(today.getDate() + i * 7)
    }

    orders.push({
      tenant_id: user.tenantId!,
      account_id: accountId,
      order_date: today.toISOString().split('T')[0],
      delivery_date: deliveryDate.toISOString().split('T')[0],
      items: items as unknown as Record<string, unknown>,
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      total_cents: totalCents,
      notes: `Standing order (${frequency})`,
    })
  }

  const { error } = await supabase.from('wholesale_orders').insert(orders)

  if (error) throw new Error(`Failed to create standing orders: ${error.message}`)

  revalidatePath('/bakery/wholesale')
  return { created: orders.length, frequency }
}

export async function getWeeklyWholesaleVolume() {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date()
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)

  const { data, error } = await supabase
    .from('wholesale_orders')
    .select('items, total_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('delivery_date', today.toISOString().split('T')[0])
    .lte('delivery_date', weekEnd.toISOString().split('T')[0])
    .in('status', ['pending', 'confirmed', 'producing', 'ready'])

  if (error) throw new Error(`Failed to load weekly volume: ${error.message}`)

  // Aggregate items across all orders
  const volumeByProduct: Record<string, number> = {}
  let totalRevenueCents = 0

  for (const order of data || []) {
    totalRevenueCents += order.total_cents
    const orderItems = order.items as unknown as WholesaleOrderItem[]
    if (Array.isArray(orderItems)) {
      for (const item of orderItems) {
        volumeByProduct[item.product_name] =
          (volumeByProduct[item.product_name] || 0) + item.quantity
      }
    }
  }

  return {
    orderCount: (data || []).length,
    totalRevenueCents,
    volumeByProduct,
  }
}

export async function getAccountBalances() {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get all accounts with their outstanding (non-paid) orders
  const { data: accounts, error: accErr } = await supabase
    .from('wholesale_accounts')
    .select('id, business_name, payment_terms')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('business_name')

  if (accErr) throw new Error(`Failed to load accounts: ${accErr.message}`)

  const { data: unpaidOrders, error: ordErr } = await supabase
    .from('wholesale_orders')
    .select('account_id, total_cents, status')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['delivered', 'invoiced'])

  if (ordErr) throw new Error(`Failed to load orders: ${ordErr.message}`)

  const balanceMap: Record<string, number> = {}
  for (const order of unpaidOrders || []) {
    balanceMap[order.account_id] = (balanceMap[order.account_id] || 0) + order.total_cents
  }

  return (accounts || []).map((acc) => ({
    id: acc.id,
    business_name: acc.business_name,
    payment_terms: acc.payment_terms,
    outstanding_cents: balanceMap[acc.id] || 0,
  }))
}

export async function generateInvoice(orderId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Generate invoice number: INV-YYYYMMDD-XXXX
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  const invoiceNumber = `INV-${dateStr}-${rand}`

  const { data, error } = await supabase
    .from('wholesale_orders')
    .update({
      status: 'invoiced',
      invoice_number: invoiceNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to generate invoice: ${error.message}`)

  revalidatePath('/bakery/wholesale')
  return data
}
