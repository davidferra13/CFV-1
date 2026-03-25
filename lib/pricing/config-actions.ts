'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { PricingConfig, PricingConfigInput } from './config-types'

// Zod schema for validating pricing config updates
const pricingConfigSchema = z.object({
  couples_rate_3_course: z.number().int().min(0).optional(),
  couples_rate_4_course: z.number().int().min(0).optional(),
  couples_rate_5_course: z.number().int().min(0).optional(),
  group_rate_3_course: z.number().int().min(0).optional(),
  group_rate_4_course: z.number().int().min(0).optional(),
  group_rate_5_course: z.number().int().min(0).optional(),
  weekly_standard_min: z.number().int().min(0).optional(),
  weekly_standard_max: z.number().int().min(0).optional(),
  weekly_commit_min: z.number().int().min(0).optional(),
  weekly_commit_max: z.number().int().min(0).optional(),
  cook_and_leave_rate: z.number().int().min(0).optional(),
  pizza_rate: z.number().int().min(0).optional(),
  multi_night_packages: z.record(z.string(), z.number().int().min(0)).optional(),
  deposit_percentage: z.number().int().min(0).max(100).optional(),
  minimum_booking_cents: z.number().int().min(0).optional(),
  balance_due_hours: z.number().int().min(0).optional(),
  mileage_rate_cents: z.number().int().min(0).optional(),
  weekend_premium_pct: z.number().int().min(0).max(100).optional(),
  weekend_premium_on: z.boolean().optional(),
  holiday_tier1_pct: z.number().int().min(0).max(100).optional(),
  holiday_tier2_pct: z.number().int().min(0).max(100).optional(),
  holiday_tier3_pct: z.number().int().min(0).max(100).optional(),
  holiday_proximity_days: z.number().int().min(0).optional(),
  large_group_min: z.number().int().min(1).optional(),
  large_group_max: z.number().int().min(1).optional(),
  add_on_catalog: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        type: z.enum(['per_person', 'flat']),
        perPersonCents: z.number().int().min(0).optional(),
        flatCents: z.number().int().min(0).optional(),
      })
    )
    .optional(),
})

/**
 * Get the chef's pricing config. If none exists, creates one with defaults (upsert).
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  const user = await requireChef()
  const chefId = user.entityId
  const db: any = createServerClient()

  // Try to fetch existing config
  const { data, error } = await db
    .from('chef_pricing_config')
    .select('*')
    .eq('chef_id', chefId)
    .single()

  if (data && !error) {
    return data as unknown as PricingConfig
  }

  // No config exists yet, create one with defaults
  const { data: created, error: insertError } = await db
    .from('chef_pricing_config')
    .insert({ chef_id: chefId })
    .select('*')
    .single()

  if (insertError) {
    // Handle race condition: another request created it between our select and insert
    if (insertError.code === '23505') {
      const { data: retry } = await db
        .from('chef_pricing_config')
        .select('*')
        .eq('chef_id', chefId)
        .single()
      if (retry) return retry as unknown as PricingConfig
    }
    throw new Error(`Failed to create pricing config: ${insertError.message}`)
  }

  return created as unknown as PricingConfig
}

/**
 * Update the chef's pricing config. Only updates provided fields.
 * Validates input with Zod before writing.
 */
export async function updatePricingConfig(
  updates: PricingConfigInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId

  // Validate input
  const parsed = pricingConfigSchema.safeParse(updates)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e: any) => e.message).join(', ') }
  }

  const validUpdates = parsed.data

  // Strip undefined values so we only update provided fields
  const cleanUpdates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(validUpdates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value
    }
  }

  if (Object.keys(cleanUpdates).length === 0) {
    return { success: true } // Nothing to update
  }

  const db: any = createServerClient()

  // Ensure config row exists (upsert pattern)
  await db
    .from('chef_pricing_config')
    .upsert({ chef_id: chefId }, { onConflict: 'chef_id' })
    .select('id')
    .single()

  // Update only the provided fields
  const { error } = await db.from('chef_pricing_config').update(cleanUpdates).eq('chef_id', chefId)

  if (error) {
    console.error('[updatePricingConfig] Update failed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/pricing')

  return { success: true }
}
