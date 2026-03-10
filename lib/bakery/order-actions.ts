// Bakery order management server actions
// Chef-only: manage custom cake/pastry orders

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Status workflow (linear progression)
const STATUS_WORKFLOW = [
  'inquiry',
  'quoted',
  'deposit_paid',
  'in_production',
  'decorating',
  'ready',
  'picked_up',
  'delivered',
] as const

export type BakeryOrderStatus = (typeof STATUS_WORKFLOW)[number] | 'cancelled'

export type BakeryOrder = {
  id: string
  tenant_id: string
  client_id: string | null
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  order_type: string
  size: string | null
  servings: number | null
  layers: number | null
  flavors: FlavorLayer[] | null
  frosting_type: string | null
  design_notes: string | null
  design_image_url: string | null
  colors: string[] | null
  dietary: string[] | null
  inscription: string | null
  pickup_date: string
  pickup_time: string | null
  delivery_requested: boolean
  delivery_address: string | null
  price_cents: number
  deposit_cents: number
  deposit_paid: boolean
  status: BakeryOrderStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type FlavorLayer = {
  layer: number
  cake_flavor: string
  filling: string
}

// Schemas

const FlavorLayerSchema = z.object({
  layer: z.number().int().positive(),
  cake_flavor: z.string().min(1),
  filling: z.string(),
})

const CreateOrderSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().nullable().optional(),
  customer_email: z.string().email().nullable().optional(),
  order_type: z.enum(['cake', 'cupcakes', 'pastry', 'bread', 'cookies', 'custom']),
  size: z.string().nullable().optional(),
  servings: z.number().int().positive().nullable().optional(),
  layers: z.number().int().positive().nullable().optional(),
  flavors: z.array(FlavorLayerSchema).nullable().optional(),
  frosting_type: z
    .enum(['buttercream', 'fondant', 'ganache', 'cream_cheese', 'whipped', 'naked'])
    .nullable()
    .optional(),
  design_notes: z.string().nullable().optional(),
  design_image_url: z.string().url().nullable().optional(),
  colors: z.array(z.string()).nullable().optional(),
  dietary: z.array(z.string()).nullable().optional(),
  inscription: z.string().nullable().optional(),
  pickup_date: z.string().min(1, 'Pickup date is required'),
  pickup_time: z.string().nullable().optional(),
  delivery_requested: z.boolean().default(false),
  delivery_address: z.string().nullable().optional(),
  price_cents: z.number().int().min(0).default(0),
  deposit_cents: z.number().int().min(0).default(0),
  notes: z.string().nullable().optional(),
})

const UpdateOrderSchema = CreateOrderSchema.partial()

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>

// CRUD

export async function createBakeryOrder(data: CreateOrderInput) {
  const user = await requireChef()
  const parsed = CreateOrderSchema.parse(data)
  const supabase = createServerClient()

  const { data: order, error } = await supabase
    .from('bakery_orders')
    .insert({ ...parsed, tenant_id: user.tenantId! })
    .select()
    .single()

  if (error) throw new Error(`Failed to create bakery order: ${error.message}`)

  revalidatePath('/bakery/orders')
  return order
}

export async function updateBakeryOrder(id: string, data: UpdateOrderInput) {
  const user = await requireChef()
  const parsed = UpdateOrderSchema.parse(data)
  const supabase = createServerClient()

  const { data: order, error } = await supabase
    .from('bakery_orders')
    .update(parsed)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update bakery order: ${error.message}`)

  revalidatePath('/bakery/orders')
  return order
}

export async function deleteBakeryOrder(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('bakery_orders')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete bakery order: ${error.message}`)

  revalidatePath('/bakery/orders')
  return { success: true }
}

export async function getBakeryOrder(id: string): Promise<BakeryOrder | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_orders')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) return null
  return data as BakeryOrder
}

export async function getAllBakeryOrders(): Promise<BakeryOrder[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_orders')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('pickup_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch bakery orders: ${error.message}`)
  return (data ?? []) as BakeryOrder[]
}

// Filtered queries

export async function getOrdersByStatus(status: BakeryOrderStatus): Promise<BakeryOrder[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_orders')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('status', status)
    .order('pickup_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch orders by status: ${error.message}`)
  return (data ?? []) as BakeryOrder[]
}

export async function getOrdersByDate(date: string): Promise<BakeryOrder[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_orders')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('pickup_date', date)
    .order('pickup_time', { ascending: true })

  if (error) throw new Error(`Failed to fetch orders by date: ${error.message}`)
  return (data ?? []) as BakeryOrder[]
}

export async function getUpcomingOrders(days: number = 7): Promise<BakeryOrder[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('bakery_orders')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('pickup_date', today)
    .lte('pickup_date', futureDateStr)
    .neq('status', 'cancelled')
    .neq('status', 'picked_up')
    .neq('status', 'delivered')
    .order('pickup_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch upcoming orders: ${error.message}`)
  return (data ?? []) as BakeryOrder[]
}

// Status advancement

export async function advanceOrderStatus(id: string): Promise<BakeryOrder> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get current order
  const { data: current, error: fetchError } = await supabase
    .from('bakery_orders')
    .select('status, delivery_requested')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !current) throw new Error('Order not found')

  const currentStatus = current.status as BakeryOrderStatus
  if (currentStatus === 'cancelled') throw new Error('Cannot advance a cancelled order')

  const currentIndex = STATUS_WORKFLOW.indexOf(currentStatus as (typeof STATUS_WORKFLOW)[number])
  if (currentIndex === -1 || currentIndex >= STATUS_WORKFLOW.length - 1) {
    throw new Error(`Cannot advance from status: ${currentStatus}`)
  }

  let nextStatus = STATUS_WORKFLOW[currentIndex + 1]

  // If delivery not requested, skip 'delivered' and go to 'picked_up'
  if (nextStatus === 'delivered' && !current.delivery_requested) {
    nextStatus = 'picked_up'
  }

  // If at 'ready' and delivery requested, next is 'delivered' not 'picked_up'
  if (currentStatus === 'ready' && current.delivery_requested) {
    nextStatus = 'delivered'
  } else if (currentStatus === 'ready' && !current.delivery_requested) {
    nextStatus = 'picked_up'
  }

  // Auto-set deposit_paid when advancing to deposit_paid status
  const updateData: Record<string, unknown> = { status: nextStatus }
  if (nextStatus === 'deposit_paid') {
    updateData.deposit_paid = true
  }

  const { data: updated, error: updateError } = await supabase
    .from('bakery_orders')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (updateError) throw new Error(`Failed to advance order: ${updateError.message}`)

  revalidatePath('/bakery/orders')
  return updated as BakeryOrder
}

export async function cancelBakeryOrder(id: string): Promise<BakeryOrder> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_orders')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to cancel order: ${error.message}`)

  revalidatePath('/bakery/orders')
  return data as BakeryOrder
}

// Stats (deterministic, no AI)

export async function getOrderStats(days: number = 30) {
  const user = await requireChef()
  const supabase = createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString()

  const { data, error } = await supabase
    .from('bakery_orders')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', sinceStr)

  if (error) throw new Error(`Failed to fetch order stats: ${error.message}`)

  const orders = (data ?? []) as BakeryOrder[]
  const totalOrders = orders.length
  const totalRevenueCents = orders.reduce((sum, o) => sum + o.price_cents, 0)
  const avgOrderValueCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0

  // Count order types
  const typeCounts: Record<string, number> = {}
  for (const order of orders) {
    typeCounts[order.order_type] = (typeCounts[order.order_type] || 0) + 1
  }

  // Find most popular type
  let popularType = 'none'
  let maxCount = 0
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > maxCount) {
      maxCount = count
      popularType = type
    }
  }

  // Count by status
  const statusCounts: Record<string, number> = {}
  for (const order of orders) {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
  }

  return {
    totalOrders,
    totalRevenueCents,
    avgOrderValueCents,
    popularType,
    typeCounts,
    statusCounts,
  }
}
