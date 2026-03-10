'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// Types
// ============================================

export type MealPrepPreferences = {
  // Dietary
  dietary_restrictions: string[]
  allergies: string[]
  dislikes: string
  spice_tolerance: 'none' | 'mild' | 'medium' | 'hot'
  favorite_cuisines: string[]
  dietary_protocols: string

  // Household
  household_size: number
  adults: number
  children: number

  // Meal preferences
  meals_per_week: number
  preferred_proteins: string[]
  avoid_proteins: string[]
  carb_preference: 'normal' | 'low_carb' | 'no_carb'
  portion_size: 'small' | 'regular' | 'large'

  // Logistics
  delivery_address: string
  delivery_instructions: string
  preferred_delivery_day: number
  delivery_window: 'morning' | 'afternoon' | 'evening'
  container_preference: 'reusable' | 'disposable'

  // Budget
  weekly_budget_cents: number | null

  // Additional
  notes: string
}

// ============================================
// Validation
// ============================================

const preferencesSchema = z.object({
  dietary_restrictions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  dislikes: z.string().default(''),
  spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot']).default('medium'),
  favorite_cuisines: z.array(z.string()).default([]),
  dietary_protocols: z.string().default(''),

  household_size: z.number().int().min(1).default(1),
  adults: z.number().int().min(0).default(1),
  children: z.number().int().min(0).default(0),

  meals_per_week: z.number().int().min(1).max(21).default(5),
  preferred_proteins: z.array(z.string()).default([]),
  avoid_proteins: z.array(z.string()).default([]),
  carb_preference: z.enum(['normal', 'low_carb', 'no_carb']).default('normal'),
  portion_size: z.enum(['small', 'regular', 'large']).default('regular'),

  delivery_address: z.string().default(''),
  delivery_instructions: z.string().default(''),
  preferred_delivery_day: z.number().int().min(0).max(6).default(1),
  delivery_window: z.enum(['morning', 'afternoon', 'evening']).default('morning'),
  container_preference: z.enum(['reusable', 'disposable']).default('reusable'),

  weekly_budget_cents: z.number().int().min(0).nullable().default(null),

  notes: z.string().default(''),
})

// ============================================
// Actions
// ============================================

export async function saveClientMealPrepPreferences(
  clientId: string,
  input: Partial<MealPrepPreferences>
): Promise<{ success?: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const parsed = preferencesSchema.parse(input)

  // Upsert: insert or update if chef_id + client_id already exists
  const { error } = await supabase.from('client_meal_prep_preferences').upsert(
    {
      chef_id: user.tenantId!,
      client_id: clientId,
      ...parsed,
    },
    { onConflict: 'chef_id,client_id' }
  )

  if (error) return { error: error.message }

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/meal-prep')
  return { success: true }
}

export async function getClientMealPrepPreferences(
  clientId: string
): Promise<MealPrepPreferences | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('client_meal_prep_preferences')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null

  return {
    dietary_restrictions: data.dietary_restrictions ?? [],
    allergies: data.allergies ?? [],
    dislikes: data.dislikes ?? '',
    spice_tolerance: data.spice_tolerance ?? 'medium',
    favorite_cuisines: data.favorite_cuisines ?? [],
    dietary_protocols: data.dietary_protocols ?? '',
    household_size: data.household_size ?? 1,
    adults: data.adults ?? 1,
    children: data.children ?? 0,
    meals_per_week: data.meals_per_week ?? 5,
    preferred_proteins: data.preferred_proteins ?? [],
    avoid_proteins: data.avoid_proteins ?? [],
    carb_preference: data.carb_preference ?? 'normal',
    portion_size: data.portion_size ?? 'regular',
    delivery_address: data.delivery_address ?? '',
    delivery_instructions: data.delivery_instructions ?? '',
    preferred_delivery_day: data.preferred_delivery_day ?? 1,
    delivery_window: data.delivery_window ?? 'morning',
    container_preference: data.container_preference ?? 'reusable',
    weekly_budget_cents: data.weekly_budget_cents ?? null,
    notes: data.notes ?? '',
  }
}

export async function generatePreferenceLink(
  clientId: string
): Promise<{ link: string; error?: string }> {
  const user = await requireChef()

  // Generate a simple shareable link using the client and chef IDs
  // In the future this could use a signed token for client self-service
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const link = `${baseUrl}/meal-prep/preferences/${clientId}?chef=${user.tenantId}`

  return { link }
}
