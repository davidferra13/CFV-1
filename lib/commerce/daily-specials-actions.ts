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
  recipeId: string | null
  isRecurring: boolean
  recurringDay: number | null
  available: boolean
  imageUrl: string | null
  notes: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type RecipeSuggestion = {
  id: string
  name: string
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
    recipeId: row.recipe_id ? String(row.recipe_id) : null,
    isRecurring: Boolean(row.is_recurring),
    recurringDay: row.recurring_day != null ? Number(row.recurring_day) : null,
    available: row.available !== false,
    imageUrl: row.image_url ? String(row.image_url) : null,
    notes: row.notes ? String(row.notes) : null,
    sortOrder: Number(row.sort_order ?? 0),
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
  recipeId: z.string().uuid().optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().int().min(0).max(6).optional(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
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
      recipe_id: data.recipeId || null,
      is_recurring: data.isRecurring ?? false,
      recurring_day: data.recurringDay ?? null,
      image_url: data.imageUrl || null,
      notes: data.notes || null,
      sort_order: data.sortOrder ?? 0,
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
  if (data.recipeId !== undefined) updateData.recipe_id = data.recipeId || null
  if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl || null
  if (data.notes !== undefined) updateData.notes = data.notes || null
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder

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

// ============================================
// GET SPECIALS FOR WEEK (convenience wrapper)
// ============================================

/**
 * Get all specials for a 7-day range starting from weekStart (ISO date string).
 */
export async function getSpecialsForWeek(weekStart: string): Promise<DailySpecial[]> {
  const start = new Date(weekStart + 'T12:00:00Z')
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const endDate = end.toISOString().substring(0, 10)
  return getSpecialsCalendar(weekStart, endDate)
}

// ============================================
// COPY SPECIALS TO DATE
// ============================================

/**
 * Copy all specials from one date to another date.
 * Skips duplicates (same name already exists on the target date).
 */
export async function copySpecialsToDate(
  fromDate: string,
  toDate: string
): Promise<{ copied: number }> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Fetch source specials (non-recurring only)
  const { data: sourceSpecials, error: fetchErr } = await (supabase
    .from('daily_specials' as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('special_date', fromDate)
    .eq('is_recurring', false) as any)

  if (fetchErr) {
    console.error('[daily-specials] copySpecials fetch error:', fetchErr)
    throw new Error('Failed to load specials for copying')
  }

  if (!sourceSpecials || sourceSpecials.length === 0) {
    return { copied: 0 }
  }

  // Check which names already exist on the target date
  const { data: existingOnTarget } = await (supabase
    .from('daily_specials' as any)
    .select('name')
    .eq('chef_id', user.tenantId!)
    .eq('special_date', toDate) as any)

  const existingNames = new Set((existingOnTarget ?? []).map((r: any) => String(r.name)))

  // Build insert rows, skipping duplicates
  const toInsert = (sourceSpecials as any[])
    .filter((s: any) => !existingNames.has(String(s.name)))
    .map((s: any) => ({
      chef_id: user.tenantId!,
      special_date: toDate,
      name: s.name,
      description: s.description,
      price_cents: s.price_cents,
      category: s.category,
      product_id: s.product_id,
      recipe_id: s.recipe_id,
      is_recurring: false,
      recurring_day: null,
      available: true,
      image_url: s.image_url,
      notes: s.notes,
      sort_order: s.sort_order ?? 0,
    }))

  if (toInsert.length === 0) {
    return { copied: 0 }
  }

  const { error: insertErr } = await (supabase
    .from('daily_specials' as any)
    .insert(toInsert as any) as any)

  if (insertErr) {
    console.error('[daily-specials] copySpecials insert error:', insertErr)
    throw new Error('Failed to copy specials')
  }

  revalidatePath('/commerce/specials')
  return { copied: toInsert.length }
}

// ============================================
// GET RECIPE SUGGESTIONS
// ============================================

/**
 * List the chef's recipes that could be used as daily specials.
 * Returns id and name only (lightweight query).
 */
export async function getRecipeSuggestions(): Promise<RecipeSuggestion[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('recipes')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)
    .order('name', { ascending: true })

  if (error) {
    console.error('[daily-specials] getRecipeSuggestions error:', error)
    return []
  }

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    name: String(r.name),
  }))
}
