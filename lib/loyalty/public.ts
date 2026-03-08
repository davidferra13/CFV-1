import { getChefBrand } from '@/lib/chef/brand'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DEFAULT_LOYALTY_SIMULATOR_CONFIG,
  DEFAULT_LOYALTY_SIMULATOR_REWARDS,
  normalizeLoyaltyConfig,
  sortRewards,
  type LoyaltyProgramConfig,
  type LoyaltyProgramReward,
} from '@/lib/loyalty/simulator'

export type PublicLoyaltyProgram = {
  chefId: string
  chefName: string
  logoUrl: string | null
  primaryColor: string
  backgroundColor: string
  showPoweredBy: boolean
  config: LoyaltyProgramConfig
  rewards: LoyaltyProgramReward[]
}

export async function getPublicLoyaltyProgramByChefId(
  chefId: string
): Promise<PublicLoyaltyProgram | null> {
  const supabase: any = createAdminClient()

  const { data: chef, error: chefError } = await supabase
    .from('chefs')
    .select('id, business_name, display_name, logo_url')
    .eq('id', chefId)
    .single()

  if (chefError || !chef) {
    return null
  }

  const brand = await getChefBrand(chefId)

  const [{ data: configRow }, { data: rewardRows }] = await Promise.all([
    supabase
      .from('loyalty_config')
      .select(
        'points_per_guest, bonus_large_party_threshold, bonus_large_party_points, milestone_bonuses, tier_bronze_min, tier_silver_min, tier_gold_min, tier_platinum_min, is_active, welcome_points, referral_points, program_mode, earn_mode, points_per_dollar, points_per_event'
      )
      .eq('tenant_id', chefId)
      .maybeSingle(),
    supabase
      .from('loyalty_rewards')
      .select(
        'id, name, description, points_required, reward_type, reward_value_cents, reward_percent, sort_order'
      )
      .eq('tenant_id', chefId)
      .eq('is_active', true)
      .order('points_required', { ascending: true }),
  ])

  const config = normalizeLoyaltyConfig(
    configRow
      ? {
          points_per_guest: Number((configRow as any).points_per_guest ?? 0),
          bonus_large_party_threshold: (configRow as any).bonus_large_party_threshold ?? null,
          bonus_large_party_points: (configRow as any).bonus_large_party_points ?? null,
          milestone_bonuses: Array.isArray((configRow as any).milestone_bonuses)
            ? ((configRow as any).milestone_bonuses as Array<{ events: number; bonus: number }>)
            : DEFAULT_LOYALTY_SIMULATOR_CONFIG.milestone_bonuses,
          tier_bronze_min: Number((configRow as any).tier_bronze_min ?? 0),
          tier_silver_min: Number((configRow as any).tier_silver_min ?? 0),
          tier_gold_min: Number((configRow as any).tier_gold_min ?? 0),
          tier_platinum_min: Number((configRow as any).tier_platinum_min ?? 0),
          is_active: Boolean((configRow as any).is_active ?? true),
          welcome_points: Number((configRow as any).welcome_points ?? 0),
          referral_points: Number((configRow as any).referral_points ?? 0),
          program_mode: ((configRow as any).program_mode ??
            DEFAULT_LOYALTY_SIMULATOR_CONFIG.program_mode) as LoyaltyProgramConfig['program_mode'],
          earn_mode: ((configRow as any).earn_mode ??
            DEFAULT_LOYALTY_SIMULATOR_CONFIG.earn_mode) as LoyaltyProgramConfig['earn_mode'],
          points_per_dollar: Number(
            (configRow as any).points_per_dollar ??
              DEFAULT_LOYALTY_SIMULATOR_CONFIG.points_per_dollar
          ),
          points_per_event: Number(
            (configRow as any).points_per_event ?? DEFAULT_LOYALTY_SIMULATOR_CONFIG.points_per_event
          ),
        }
      : DEFAULT_LOYALTY_SIMULATOR_CONFIG
  )

  const rewards = sortRewards(
    rewardRows && rewardRows.length > 0
      ? (rewardRows as LoyaltyProgramReward[])
      : DEFAULT_LOYALTY_SIMULATOR_REWARDS
  )

  return {
    chefId,
    chefName:
      (chef.business_name as string | null) ||
      (chef.display_name as string | null) ||
      brand.businessName,
    logoUrl: (chef.logo_url as string | null) || brand.logoUrl,
    primaryColor: brand.primaryColor,
    backgroundColor: brand.backgroundColor,
    showPoweredBy: brand.showPoweredBy,
    config,
    rewards,
  }
}
