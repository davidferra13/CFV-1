// Daily Production Sheet server actions
// Generates "What to Bake Today" lists from orders, par stock, and batches

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type ProductionItemSource = 'par_stock' | 'custom_order' | 'batch'
export type ProductionItemStatus = 'pending' | 'in_progress' | 'done' | 'skipped'

export type ProductionItem = {
  id: string
  tenant_id: string
  production_date: string
  source_type: ProductionItemSource
  source_id: string | null
  product_name: string
  planned_quantity: number
  actual_quantity: number | null
  status: ProductionItemStatus
  completed_at: string | null
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined fields
  pickup_time?: string | null
  customer_name?: string | null
}

export type ParStockItem = {
  id: string
  tenant_id: string
  product_name: string
  quantity: number
  priority: number
  recipe_id: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type DailyProductionSummary = {
  totalItems: number
  completedItems: number
  pendingItems: number
  inProgressItems: number
  skippedItems: number
  percentComplete: number
}

// --- Validation Schemas ---

const ParStockSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  priority: z.number().int().min(1).max(100).default(50),
  recipe_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
})

const UpdateParStockSchema = z.object({
  product_name: z.string().min(1).optional(),
  quantity: z.number().int().min(1).optional(),
  priority: z.number().int().min(1).max(100).optional(),
  recipe_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

const MarkCompleteSchema = z.object({
  actual_quantity: z.number().int().min(0),
})

// --- Par Stock CRUD ---

export async function getParStockItems(): Promise<{
  data: ParStockItem[] | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('bakery_par_stock')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createParStockItem(
  input: z.infer<typeof ParStockSchema>
): Promise<{ data: ParStockItem | null; error: string | null }> {
  const user = await requireChef()
  const validated = ParStockSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('bakery_par_stock')
    .insert({
      tenant_id: user.tenantId!,
      product_name: validated.product_name,
      quantity: validated.quantity,
      priority: validated.priority,
      recipe_id: validated.recipe_id ?? null,
      notes: validated.notes ?? null,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath('/bakery/production')
  return { data, error: null }
}

export async function updateParStockItem(
  id: string,
  input: z.infer<typeof UpdateParStockSchema>
): Promise<{ error: string | null }> {
  const user = await requireChef()
  const validated = UpdateParStockSchema.parse(input)
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('bakery_par_stock')
    .update(validated)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) return { error: error.message }

  revalidatePath('/bakery/production')
  return { error: null }
}

export async function deleteParStockItem(id: string): Promise<{ error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Soft delete
  const { error } = await supabase
    .from('bakery_par_stock')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) return { error: error.message }

  revalidatePath('/bakery/production')
  return { error: null }
}

// --- Daily Production Sheet Generation ---

export async function generateDailySheet(
  date: string
): Promise<{ data: ProductionItem[] | null; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Check if we already have a production log for this date
  const { data: existingLog } = await supabase
    .from('bakery_production_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('production_date', date)

  if (existingLog && existingLog.length > 0) {
    return { data: existingLog, error: null }
  }

  // Generate new production sheet from sources
  const items: Array<{
    tenant_id: string
    production_date: string
    source_type: ProductionItemSource
    source_id: string | null
    product_name: string
    planned_quantity: number
    status: ProductionItemStatus
    assigned_to: string | null
    notes: string | null
  }> = []

  // 1. Par stock items (daily production standards)
  const { data: parStock } = await supabase
    .from('bakery_par_stock')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (parStock) {
    for (const ps of parStock) {
      items.push({
        tenant_id: tenantId,
        production_date: date,
        source_type: 'par_stock',
        source_id: ps.id,
        product_name: ps.product_name,
        planned_quantity: ps.quantity,
        status: 'pending',
        assigned_to: null,
        notes: ps.notes,
      })
    }
  }

  // 2. Custom orders due on this date
  const { data: orders } = await supabase
    .from('bakery_orders')
    .select(
      'id, customer_name, order_type, size, servings, pickup_date, pickup_time, status, notes'
    )
    .eq('tenant_id', tenantId)
    .eq('pickup_date', date)
    .in('status', ['deposit_paid', 'in_production', 'decorating'])

  if (orders) {
    for (const order of orders) {
      const label = order.size
        ? `${order.order_type} (${order.size}) for ${order.customer_name}`
        : `${order.order_type} for ${order.customer_name}`
      items.push({
        tenant_id: tenantId,
        production_date: date,
        source_type: 'custom_order',
        source_id: order.id,
        product_name: label,
        planned_quantity: order.servings || 1,
        status: 'pending',
        assigned_to: null,
        notes: order.pickup_time ? `Pickup: ${order.pickup_time}` : null,
      })
    }
  }

  if (items.length === 0) {
    return { data: [], error: null }
  }

  // Insert all production items
  const { data: inserted, error } = await supabase
    .from('bakery_production_log')
    .insert(items)
    .select()

  if (error) return { data: null, error: error.message }

  revalidatePath('/bakery/production')
  return { data: inserted, error: null }
}

// --- Production Item Actions ---

export async function markProductionComplete(
  itemId: string,
  input: z.infer<typeof MarkCompleteSchema>
): Promise<{ error: string | null }> {
  const user = await requireChef()
  const validated = MarkCompleteSchema.parse(input)
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('bakery_production_log')
    .update({
      status: 'done',
      actual_quantity: validated.actual_quantity,
      completed_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)

  if (error) return { error: error.message }

  revalidatePath('/bakery/production')
  return { error: null }
}

export async function updateProductionItemStatus(
  itemId: string,
  status: ProductionItemStatus
): Promise<{ error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const update: Record<string, unknown> = { status }
  if (status === 'done') {
    update.completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('bakery_production_log')
    .update(update)
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)

  if (error) return { error: error.message }

  revalidatePath('/bakery/production')
  return { error: null }
}

export async function getDailyProductionSummary(
  date: string
): Promise<{ data: DailyProductionSummary | null; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('bakery_production_log')
    .select('status')
    .eq('tenant_id', user.tenantId!)
    .eq('production_date', date)

  if (error) return { data: null, error: error.message }
  if (!data || data.length === 0) {
    return {
      data: {
        totalItems: 0,
        completedItems: 0,
        pendingItems: 0,
        inProgressItems: 0,
        skippedItems: 0,
        percentComplete: 0,
      },
      error: null,
    }
  }

  const totalItems = data.length
  const completedItems = data.filter((i: { status: string }) => i.status === 'done').length
  const pendingItems = data.filter((i: { status: string }) => i.status === 'pending').length
  const inProgressItems = data.filter((i: { status: string }) => i.status === 'in_progress').length
  const skippedItems = data.filter((i: { status: string }) => i.status === 'skipped').length
  const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return {
    data: {
      totalItems,
      completedItems,
      pendingItems,
      inProgressItems,
      skippedItems,
      percentComplete,
    },
    error: null,
  }
}
