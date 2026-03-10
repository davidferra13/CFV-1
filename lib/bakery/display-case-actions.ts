// Display Case Management server actions
// Track what's in the retail display case: quantities, freshness, low-stock alerts

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type DisplayCaseCategory =
  | 'bread'
  | 'pastry'
  | 'cake'
  | 'cookie'
  | 'savory'
  | 'drink'
  | 'other'
export type FreshnessStatus = 'fresh' | 'getting_stale' | 'stale'

export type DisplayCaseItem = {
  id: string
  tenant_id: string
  product_name: string
  category: DisplayCaseCategory
  current_quantity: number
  par_level: number
  price_cents: number
  baked_at: string | null
  shelf_life_hours: number | null
  allergens: string[] | null
  is_active: boolean
  last_restocked: string | null
  created_at: string
  updated_at: string
  // Computed fields
  freshness_status?: FreshnessStatus
  is_low_stock?: boolean
  hours_since_baked?: number | null
}

export type DisplayCaseSummary = {
  totalItems: number
  totalQuantity: number
  lowStockCount: number
  staleCount: number
  totalValueCents: number
}

// --- Validation Schemas ---

const CreateDisplayItemSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  category: z
    .enum(['bread', 'pastry', 'cake', 'cookie', 'savory', 'drink', 'other'])
    .default('pastry'),
  current_quantity: z.number().int().min(0).default(0),
  par_level: z.number().int().min(0).default(0),
  price_cents: z.number().int().min(0),
  shelf_life_hours: z.number().int().min(1).nullable().optional(),
  allergens: z.array(z.string()).nullable().optional(),
})

const UpdateDisplayItemSchema = z.object({
  product_name: z.string().min(1).optional(),
  category: z.enum(['bread', 'pastry', 'cake', 'cookie', 'savory', 'drink', 'other']).optional(),
  par_level: z.number().int().min(0).optional(),
  price_cents: z.number().int().min(0).optional(),
  shelf_life_hours: z.number().int().min(1).nullable().optional(),
  allergens: z.array(z.string()).nullable().optional(),
  is_active: z.boolean().optional(),
})

// --- Freshness Helpers (deterministic, no AI) ---

function computeFreshness(item: { baked_at: string | null; shelf_life_hours: number | null }): {
  status: FreshnessStatus
  hoursSinceBaked: number | null
} {
  if (!item.baked_at) return { status: 'fresh', hoursSinceBaked: null }

  const bakedTime = new Date(item.baked_at).getTime()
  const now = Date.now()
  const hoursSinceBaked = (now - bakedTime) / (1000 * 60 * 60)

  if (!item.shelf_life_hours)
    return { status: 'fresh', hoursSinceBaked: Math.round(hoursSinceBaked) }

  const ratio = hoursSinceBaked / item.shelf_life_hours
  if (ratio >= 1) return { status: 'stale', hoursSinceBaked: Math.round(hoursSinceBaked) }
  if (ratio >= 0.75)
    return { status: 'getting_stale', hoursSinceBaked: Math.round(hoursSinceBaked) }
  return { status: 'fresh', hoursSinceBaked: Math.round(hoursSinceBaked) }
}

function enrichItem(item: DisplayCaseItem): DisplayCaseItem {
  const { status, hoursSinceBaked } = computeFreshness(item)
  return {
    ...item,
    freshness_status: status,
    is_low_stock: item.current_quantity < item.par_level,
    hours_since_baked: hoursSinceBaked,
  }
}

// --- CRUD ---

export async function getDisplayCase(): Promise<{
  data: DisplayCaseItem[] | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('display_case_items')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('category')
    .order('product_name')

  if (error) return { data: null, error: error.message }
  return { data: (data || []).map(enrichItem), error: null }
}

export async function createDisplayItem(
  input: z.infer<typeof CreateDisplayItemSchema>
): Promise<{ data: DisplayCaseItem | null; error: string | null }> {
  const user = await requireChef()
  const validated = CreateDisplayItemSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('display_case_items')
    .insert({
      tenant_id: user.tenantId!,
      product_name: validated.product_name,
      category: validated.category,
      current_quantity: validated.current_quantity,
      par_level: validated.par_level,
      price_cents: validated.price_cents,
      shelf_life_hours: validated.shelf_life_hours ?? null,
      allergens: validated.allergens ?? null,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath('/bakery/display-case')
  return { data: enrichItem(data), error: null }
}

export async function updateDisplayItem(
  id: string,
  input: z.infer<typeof UpdateDisplayItemSchema>
): Promise<{ error: string | null }> {
  const user = await requireChef()
  const validated = UpdateDisplayItemSchema.parse(input)
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('display_case_items')
    .update(validated)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) return { error: error.message }

  revalidatePath('/bakery/display-case')
  return { error: null }
}

export async function deleteDisplayItem(id: string): Promise<{ error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('display_case_items')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) return { error: error.message }

  revalidatePath('/bakery/display-case')
  return { error: null }
}

// --- Quick Actions ---

export async function soldOne(id: string): Promise<{ error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get current quantity first
  const { data: current, error: fetchError } = await supabase
    .from('display_case_items')
    .select('current_quantity')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError) return { error: fetchError.message }
  if (!current) return { error: 'Item not found' }

  const newQuantity = Math.max(0, current.current_quantity - 1)

  const { error } = await supabase
    .from('display_case_items')
    .update({ current_quantity: newQuantity })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) return { error: error.message }

  revalidatePath('/bakery/display-case')
  return { error: null }
}

export async function updateQuantity(
  id: string,
  quantity: number
): Promise<{ error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (quantity < 0) return { error: 'Quantity cannot be negative' }

  const { error } = await supabase
    .from('display_case_items')
    .update({ current_quantity: quantity })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) return { error: error.message }

  revalidatePath('/bakery/display-case')
  return { error: null }
}

export async function restockItem(
  id: string,
  quantity: number,
  bakedAt?: string
): Promise<{ error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (quantity < 1) return { error: 'Restock quantity must be at least 1' }

  // Get current quantity
  const { data: current, error: fetchError } = await supabase
    .from('display_case_items')
    .select('current_quantity')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError) return { error: fetchError.message }
  if (!current) return { error: 'Item not found' }

  const { error } = await supabase
    .from('display_case_items')
    .update({
      current_quantity: current.current_quantity + quantity,
      baked_at: bakedAt || new Date().toISOString(),
      last_restocked: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) return { error: error.message }

  revalidatePath('/bakery/display-case')
  return { error: null }
}

// --- Alerts ---

export async function getLowStockItems(): Promise<{
  data: DisplayCaseItem[] | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('display_case_items')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  if (error) return { data: null, error: error.message }

  const lowStock = (data || [])
    .map(enrichItem)
    .filter((item: DisplayCaseItem) => item.current_quantity < item.par_level)

  return { data: lowStock, error: null }
}

export async function getStaleItems(): Promise<{
  data: DisplayCaseItem[] | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('display_case_items')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  if (error) return { data: null, error: error.message }

  const stale = (data || [])
    .map(enrichItem)
    .filter((item: DisplayCaseItem) => item.freshness_status === 'stale')

  return { data: stale, error: null }
}

// --- Summary ---

export async function getDisplayCaseSummary(): Promise<{
  data: DisplayCaseSummary | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('display_case_items')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  if (error) return { data: null, error: error.message }

  const enriched = (data || []).map(enrichItem)

  const summary: DisplayCaseSummary = {
    totalItems: enriched.length,
    totalQuantity: enriched.reduce(
      (sum: number, i: DisplayCaseItem) => sum + i.current_quantity,
      0
    ),
    lowStockCount: enriched.filter((i: DisplayCaseItem) => i.is_low_stock).length,
    staleCount: enriched.filter((i: DisplayCaseItem) => i.freshness_status === 'stale').length,
    totalValueCents: enriched.reduce(
      (sum: number, i: DisplayCaseItem) => sum + i.current_quantity * i.price_cents,
      0
    ),
  }

  return { data: summary, error: null }
}

export async function getDailySalesFromCase(
  date: string
): Promise<{
  data: { product_name: string; estimated_sold: number }[] | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get production log for this date to see what was restocked
  const { data: production, error: prodError } = await supabase
    .from('bakery_production_log')
    .select('product_name, actual_quantity, planned_quantity')
    .eq('tenant_id', user.tenantId!)
    .eq('production_date', date)
    .eq('status', 'done')

  if (prodError) return { data: null, error: prodError.message }

  // Get current display case quantities
  const { data: displayItems, error: displayError } = await supabase
    .from('display_case_items')
    .select('product_name, current_quantity')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  if (displayError) return { data: null, error: displayError.message }

  // Estimate sales: what was produced minus what's still on display
  const displayMap = new Map<string, number>()
  for (const item of displayItems || []) {
    displayMap.set(item.product_name.toLowerCase(), item.current_quantity)
  }

  const sales = (production || []).map(
    (p: { product_name: string; actual_quantity: number | null; planned_quantity: number }) => {
      const produced = p.actual_quantity ?? p.planned_quantity
      const remaining = displayMap.get(p.product_name.toLowerCase()) ?? 0
      return {
        product_name: p.product_name,
        estimated_sold: Math.max(0, produced - remaining),
      }
    }
  )

  return { data: sales, error: null }
}
