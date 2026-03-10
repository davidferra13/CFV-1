// Bakery seasonal item calendar management
// Chef-only: plan seasonal bakery items with date ranges

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Types

export type SeasonalItem = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  category: 'cookie' | 'pie' | 'cake' | 'bread' | 'pastry' | 'seasonal_special'
  recipe_id: string | null
  price_cents: number
  start_date: string
  end_date: string
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// CRUD
// ============================================================

export async function createSeasonalItem(data: {
  name: string
  description?: string | null
  category?: string
  recipe_id?: string | null
  price_cents?: number
  start_date: string
  end_date: string
  notes?: string | null
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: item, error } = await supabase
    .from('bakery_seasonal_items')
    .insert({
      tenant_id: user.tenantId!,
      name: data.name,
      description: data.description || null,
      category: data.category || 'seasonal_special',
      recipe_id: data.recipe_id || null,
      price_cents: data.price_cents || 0,
      start_date: data.start_date,
      end_date: data.end_date,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create seasonal item: ${error.message}`)

  revalidatePath('/bakery/seasonal')
  return item
}

export async function updateSeasonalItem(
  id: string,
  data: Partial<{
    name: string
    description: string | null
    category: string
    recipe_id: string | null
    price_cents: number
    start_date: string
    end_date: string
    is_active: boolean
    notes: string | null
  }>
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: item, error } = await supabase
    .from('bakery_seasonal_items')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update seasonal item: ${error.message}`)

  revalidatePath('/bakery/seasonal')
  return item
}

export async function deleteSeasonalItem(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('bakery_seasonal_items')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete seasonal item: ${error.message}`)

  revalidatePath('/bakery/seasonal')
}

export async function getActiveSeasonalItems() {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('bakery_seasonal_items')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('name')

  if (error) throw new Error(`Failed to load active items: ${error.message}`)
  return (data || []) as SeasonalItem[]
}

export async function getSeasonalCalendar(year: number) {
  const user = await requireChef()
  const supabase = createServerClient()

  const startOfYear = `${year}-01-01`
  const endOfYear = `${year}-12-31`

  const { data, error } = await supabase
    .from('bakery_seasonal_items')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .or(`start_date.lte.${endOfYear},end_date.gte.${startOfYear}`)
    .order('start_date')

  if (error) throw new Error(`Failed to load calendar: ${error.message}`)
  return (data || []) as SeasonalItem[]
}

export async function getUpcomingSeasonalItems(days: number = 30) {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('bakery_seasonal_items')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .gt('start_date', today)
    .lte('start_date', futureDateStr)
    .order('start_date')

  if (error) throw new Error(`Failed to load upcoming items: ${error.message}`)
  return (data || []) as SeasonalItem[]
}

export async function getAllSeasonalItems() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_seasonal_items')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('start_date')

  if (error) throw new Error(`Failed to load seasonal items: ${error.message}`)
  return (data || []) as SeasonalItem[]
}
