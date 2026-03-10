// Commerce Engine V1 - Daily Specials Calendar
// Schedule and display daily specials with seasonal menu planning.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// TYPES
// ============================================

export type SpecialCategory = 'appetizer' | 'entree' | 'dessert' | 'drink' | 'side'

export type DailySpecial = {
  id: string
  chefId: string
  specialDate: string
  name: string
  description: string | null
  priceCents: number
  category: SpecialCategory
  productId: string | null
  isRecurring: boolean
  recurringDay: number | null
  available: boolean
  imageUrl: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

function toSpecial(row: any): DailySpecial {
  return {
    id: String(row.id),
    chefId: String(row.chef_id),
    specialDate: String(row.special_date),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    priceCents: Number(row.price_cents ?? 0),
    category: String(row.category ?? 'entree') as SpecialCategory,
    productId: row.product_id ? String(row.product_id) : null,
    isRecurring: Boolean(row.is_recurring),
    recurringDay: row.recurring_day != null ? Number(row.recurring_day) : null,
    available: row.available !== false,
    imageUrl: row.image_url ? String(row.image_url) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  }
}

// ============================================
// SCHEMAS
// ============================================

const CreateSpecialSchema = z.object({
  specialDate: z.string().min(1, 'Date is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  priceCents: z.number().int().min(0),
  category: z.enum(['appetizer', 'entree', 'dessert', 'drink', 'side']),
  productId: z.string().uuid().optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().int().min(0).max(6).optional(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateSpecialInput = z.infer<typeof CreateSpecialSchema>

const UpdateSpecialSchema = CreateSpecialSchema.partial()
export type UpdateSpecialInput = z.infer<typeof UpdateSpecialSchema>

// ============================================
// CREATE
// ============================================

export async function createSpecial(input: CreateSpecialInput): Promise<DailySpecial> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()
  const data = CreateSpecialSchema.parse(input)

  const { data: special, error } = await (supabase
    .from('daily_specials' as any)
    .insert({
      chef_id: user.tenantId!,
      special_date: data.specialDate,
      name: data.name,
      description: data.description || null,
      price_cents: data.priceCents,
      category: data.category,
      product_id: data.productId || null,
      is_recurring: data.isRecurring ?? false,
      recurring_day: data.recurringDay ?? null,
      image_url: data.imageUrl || null,
      notes: data.notes || null,
    } as any)
    .select()
    .single() as any)

  if (error) {
    console.error('[daily-specials] create error:', error)
    throw new Error('Failed to create special')
  }

  revalidatePath('/commerce/specials')
  return toSpecial(special)
}

// ============================================
// UPDATE
// ============================================

export async function updateSpecial(id: string, input: UpdateSpecialInput): Promise<void> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()
  const data = UpdateSpecialSchema.parse(input)

  const updateData: Record<string, unknown> = {}
  if (data.specialDate !== undefined) updateData.special_date = data.specialDate
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.priceCents !== undefined) updateData.price_cents = data.priceCents
  if (data.category !== undefined) updateData.category = data.category
  if (data.productId !== undefined) updateData.product_id = data.productId || null
  if (data.isRecurring !== undefined) updateData.is_recurring = data.isRecurring
  if (data.recurringDay !== undefined) updateData.recurring_day = data.recurringDay
  if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl || null
  if (data.notes !== undefined) updateData.notes = data.notes || null

  const { error } = await (supabase
    .from('daily_specials' as any)
    .update(updateData as any)
    .eq('id', id)
    .eq('chef_id', user.tenantId!) as any)

  if (error) {
    console.error('[daily-specials] update error:', error)
    throw new Error('Failed to update special')
  }

  revalidatePath('/commerce/specials')
}

// ============================================
// DELETE
// ============================================

export async function deleteSpecial(id: string): Promise<void> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { error } = await (supabase
    .from('daily_specials' as any)
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!) as any)

  if (error) {
    console.error('[daily-specials] delete error:', error)
    throw new Error('Failed to delete special')
  }

  revalidatePath('/commerce/specials')
}

// ============================================
// GET SPECIALS FOR DATE
// ============================================

/**
 * Get specials for a specific date, including recurring ones
 * that match the day of week.
 */
export async function getSpecialsForDate(date: string): Promise<DailySpecial[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const dayOfWeek = new Date(date + 'T12:00:00Z').getDay() // 0=Sun, 6=Sat

  // Get specials for this exact date + recurring specials for this day of week
  const [exactRes, recurringRes] = await Promise.all([
    supabase
      .from('daily_specials' as any)
      .select('*')
      .eq('chef_id', user.tenantId!)
      .eq('special_date', date)
      .eq('is_recurring', false)
      .order('category', { ascending: true }),
    supabase
      .from('daily_specials' as any)
      .select('*')
      .eq('chef_id', user.tenantId!)
      .eq('is_recurring', true)
      .eq('recurring_day', dayOfWeek)
      .order('category', { ascending: true }),
  ])

  const exact = (exactRes.data ?? []).map(toSpecial)
  const recurring = (recurringRes.data ?? []).map(toSpecial)

  // Merge, dedup by name (exact date overrides recurring)
  const byName = new Map<string, DailySpecial>()
  for (const r of recurring) byName.set(r.name, r)
  for (const e of exact) byName.set(e.name, e) // override recurring

  return Array.from(byName.values()).sort((a, b) => {
    const catOrder = ['appetizer', 'entree', 'side', 'dessert', 'drink']
    return catOrder.indexOf(a.category) - catOrder.indexOf(b.category)
  })
}

// ============================================
// GET SPECIALS CALENDAR (date range)
// ============================================

export async function getSpecialsCalendar(
  startDate: string,
  endDate: string
): Promise<DailySpecial[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data, error } = await (supabase
    .from('daily_specials' as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .gte('special_date', startDate)
    .lte('special_date', endDate)
    .order('special_date', { ascending: true })
    .order('category', { ascending: true }) as any)

  if (error) {
    console.error('[daily-specials] getCalendar error:', error)
    throw new Error('Failed to load specials calendar')
  }

  return (data ?? []).map(toSpecial)
}

// ============================================
// GET RECURRING SPECIALS
// ============================================

export async function getRecurringSpecials(): Promise<DailySpecial[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data, error } = await (supabase
    .from('daily_specials' as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('is_recurring', true)
    .order('recurring_day', { ascending: true })
    .order('category', { ascending: true }) as any)

  if (error) {
    console.error('[daily-specials] getRecurring error:', error)
    throw new Error('Failed to load recurring specials')
  }

  return (data ?? []).map(toSpecial)
}

// ============================================
// TOGGLE AVAILABILITY
// ============================================

export async function toggleSpecialAvailability(id: string): Promise<boolean> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Get current state
  const { data: current, error: fetchErr } = await (supabase
    .from('daily_specials' as any)
    .select('available')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single() as any)

  if (fetchErr || !current) throw new Error('Special not found')

  const newState = !(current as any).available

  const { error } = await (supabase
    .from('daily_specials' as any)
    .update({ available: newState } as any)
    .eq('id', id)
    .eq('chef_id', user.tenantId!) as any)

  if (error) {
    console.error('[daily-specials] toggle error:', error)
    throw new Error('Failed to toggle availability')
  }

  revalidatePath('/commerce/specials')
  return newState
}
