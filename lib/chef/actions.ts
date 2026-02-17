// Chef Preferences Server Actions
// Manages chef-level configuration for scheduling, stores, and DOPs.
// Note: chef_preferences table added in Layer 5 migration.
// Type assertions used until types/database.ts is regenerated.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ChefPreferences, SpecialtyStore } from '@/lib/scheduling/types'
import { DEFAULT_PREFERENCES } from '@/lib/scheduling/types'

// ============================================
// VALIDATION
// ============================================

const SpecialtyStoreSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  notes: z.string().default(''),
})

const UpdatePreferencesSchema = z.object({
  home_address: z.string().optional().nullable(),
  home_city: z.string().optional().nullable(),
  home_state: z.string().optional().nullable(),
  home_zip: z.string().optional().nullable(),

  default_grocery_store: z.string().optional().nullable(),
  default_grocery_address: z.string().optional().nullable(),
  default_liquor_store: z.string().optional().nullable(),
  default_liquor_address: z.string().optional().nullable(),
  default_specialty_stores: z.array(SpecialtyStoreSchema).optional(),

  default_buffer_minutes: z.number().int().min(0).max(120).optional(),
  default_prep_hours: z.number().min(0.5).max(12).optional(),
  default_shopping_minutes: z.number().int().min(15).max(240).optional(),
  default_packing_minutes: z.number().int().min(10).max(120).optional(),

  target_margin_percent: z.number().min(0).max(100).optional(),

  shop_day_before: z.boolean().optional(),
})

export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>

// Type assertion helper — chef_preferences not in generated types until migration applied
function fromChefPreferences(supabase: ReturnType<typeof createServerClient>): any {
  return (supabase as any).from('chef_preferences')
}

// ============================================
// QUERIES
// ============================================

/**
 * Get chef preferences, creating defaults if none exist.
 */
export async function getChefPreferences(): Promise<ChefPreferences> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await fromChefPreferences(supabase)
    .select('*')
    .eq('chef_id', user.entityId)
    .single()

  if (error || !data) {
    return {
      id: '',
      chef_id: user.entityId,
      ...DEFAULT_PREFERENCES,
    }
  }

  const row = data as Record<string, unknown>

  return {
    id: row.id as string,
    chef_id: row.chef_id as string,
    home_address: (row.home_address as string) ?? null,
    home_city: (row.home_city as string) ?? null,
    home_state: (row.home_state as string) ?? null,
    home_zip: (row.home_zip as string) ?? null,
    default_grocery_store: (row.default_grocery_store as string) ?? null,
    default_grocery_address: (row.default_grocery_address as string) ?? null,
    default_liquor_store: (row.default_liquor_store as string) ?? null,
    default_liquor_address: (row.default_liquor_address as string) ?? null,
    default_specialty_stores: (row.default_specialty_stores as SpecialtyStore[]) ?? [],
    default_buffer_minutes: (row.default_buffer_minutes as number) ?? 30,
    default_prep_hours: Number(row.default_prep_hours ?? 3),
    default_shopping_minutes: (row.default_shopping_minutes as number) ?? 60,
    default_packing_minutes: (row.default_packing_minutes as number) ?? 30,
    target_margin_percent: Number(row.target_margin_percent ?? 60),
    shop_day_before: (row.shop_day_before as boolean) ?? true,
  }
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Update chef preferences (upsert — creates if not exists).
 */
export async function updateChefPreferences(input: UpdatePreferencesInput) {
  const user = await requireChef()
  const validated = UpdatePreferencesSchema.parse(input)

  const supabase = createServerClient()

  // Check if preferences exist
  const { data: existing } = await fromChefPreferences(supabase)
    .select('id')
    .eq('chef_id', user.entityId)
    .single()

  if (existing) {
    const { error } = await fromChefPreferences(supabase)
      .update(validated)
      .eq('chef_id', user.entityId)

    if (error) {
      console.error('[updateChefPreferences] Update error:', error)
      throw new Error('Failed to update preferences')
    }
  } else {
    const { error } = await fromChefPreferences(supabase)
      .insert({
        chef_id: user.entityId,
        tenant_id: user.tenantId!,
        ...validated,
      })

    if (error) {
      console.error('[updateChefPreferences] Insert error:', error)
      throw new Error('Failed to save preferences')
    }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true }
}
