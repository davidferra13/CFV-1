// Tenant-explicit loyalty config helpers for API v2 routes.
// Accepts tenantId directly instead of calling requireChef().

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { LoyaltyConfig } from './actions'

// Default rewards seeded on first config creation
const DEFAULT_REWARDS = [
  {
    name: 'Complimentary appetizer course',
    points_required: 50,
    reward_type: 'free_course',
    description: 'A bonus appetizer course added to your next dinner',
  },
  {
    name: 'Complimentary dessert course',
    points_required: 75,
    reward_type: 'free_course',
    description: 'A bonus dessert course added to your next dinner',
  },
  {
    name: '$25 off your next dinner',
    points_required: 100,
    reward_type: 'discount_fixed',
    reward_value_cents: 2500,
    description: '$25 discount on your next booking',
  },
  {
    name: '15% off dinner for two',
    points_required: 150,
    reward_type: 'discount_percent',
    reward_percent: 15,
    description: '15% discount on a dinner for two',
  },
  {
    name: "Chef's tasting menu experience",
    points_required: 200,
    reward_type: 'upgrade',
    description: 'Bonus courses and elevated presentation on your next dinner',
  },
  {
    name: '50% off a dinner for two',
    points_required: 250,
    reward_type: 'discount_percent',
    reward_percent: 50,
    description: 'Half-price dinner for two',
  },
]

const UpdateLoyaltyConfigSchema = z.object({
  points_per_guest: z.number().int().positive().optional(),
  bonus_large_party_threshold: z.number().int().positive().optional(),
  bonus_large_party_points: z.number().int().nonnegative().optional(),
  milestone_bonuses: z
    .array(z.object({ events: z.number().int().positive(), bonus: z.number().int().positive() }))
    .optional(),
  tier_silver_min: z.number().int().positive().optional(),
  tier_gold_min: z.number().int().positive().optional(),
  tier_platinum_min: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
  welcome_points: z.number().int().nonnegative().optional(),
  referral_points: z.number().int().nonnegative().optional(),
  program_mode: z.enum(['full', 'lite', 'off']).optional(),
  earn_mode: z.enum(['per_guest', 'per_dollar', 'per_event']).optional(),
  points_per_dollar: z.coerce.number().positive().optional(),
  points_per_event: z.coerce.number().int().positive().optional(),
  tier_perks: z.record(z.string(), z.array(z.string())).optional(),
  guest_milestones: z
    .array(z.object({ guests: z.number().int().positive(), bonus: z.number().int().positive() }))
    .optional(),
  base_points_per_event: z.number().int().nonnegative().optional(),
  trigger_config: z
    .record(z.string(), z.object({ enabled: z.boolean(), points: z.number() }))
    .optional(),
})

function castConfig(raw: any): LoyaltyConfig {
  return {
    ...raw,
    milestone_bonuses: raw.milestone_bonuses as { events: number; bonus: number }[],
    welcome_points: raw.welcome_points ?? 0,
    referral_points: raw.referral_points ?? 0,
    tier_perks: (raw.tier_perks ?? {}) as Record<string, string[]>,
    guest_milestones: (raw.guest_milestones ?? []) as { guests: number; bonus: number }[],
    base_points_per_event: raw.base_points_per_event ?? 0,
    trigger_config: (raw.trigger_config ?? {}) as Record<
      string,
      { enabled: boolean; points: number }
    >,
  }
}

/**
 * Get loyalty config for a tenant. Creates default config + seeds rewards if none exists.
 * The createdBy param is the auth_user_id to attribute seed rewards to.
 */
export async function getLoyaltyConfigForTenant(
  tenantId: string,
  createdBy?: string
): Promise<LoyaltyConfig> {
  const db: any = createServerClient({ admin: true })

  const { data: config, error } = await db
    .from('loyalty_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !config) {
    const { data: newConfig, error: createError } = await db
      .from('loyalty_config')
      .insert({ tenant_id: tenantId })
      .select()
      .single()

    if (createError || !newConfig) {
      console.error('[store.getLoyaltyConfigForTenant] Error creating default config:', createError)
      throw new Error('Failed to initialize loyalty program')
    }

    // Seed default rewards
    const rewardsToInsert = DEFAULT_REWARDS.map((r, i) => ({
      tenant_id: tenantId,
      name: r.name,
      description: r.description || null,
      points_required: r.points_required,
      reward_type: r.reward_type,
      reward_value_cents: (r as any).reward_value_cents || null,
      reward_percent: (r as any).reward_percent || null,
      sort_order: i,
      created_by: createdBy ?? tenantId,
      updated_by: createdBy ?? tenantId,
    }))

    await db.from('loyalty_rewards').insert(rewardsToInsert)
    return castConfig(newConfig)
  }

  return castConfig(config)
}

/**
 * Update loyalty config for a tenant. Validates input, handles trigger_config,
 * and recalculates tiers if thresholds changed.
 */
export async function updateLoyaltyConfigForTenant(
  tenantId: string,
  input: unknown
): Promise<{ success: boolean; config?: LoyaltyConfig; error?: string }> {
  const parsed = UpdateLoyaltyConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.message }
  }

  const validated = parsed.data
  const db: any = createServerClient({ admin: true })

  // Validate trigger_config keys against the registry
  if (validated.trigger_config) {
    const { validateTriggerConfig } = await import('@/lib/loyalty/triggers')
    ;(validated as any).trigger_config = validateTriggerConfig(validated.trigger_config)
  }

  // Ensure config exists
  await getLoyaltyConfigForTenant(tenantId)

  const { data: config, error } = await db
    .from('loyalty_config')
    .update(validated)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    return { success: false, error: 'Failed to update loyalty configuration' }
  }

  return { success: true, config: castConfig(config) }
}
