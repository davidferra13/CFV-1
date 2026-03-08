// Client-Facing Loyalty Program About Page
// Designed to make clients excited about participating in the loyalty program.
// Warm, inviting, and aspirational — shows what they can earn and why it matters.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  normalizeLoyaltyConfig,
  sortRewards,
  type LoyaltyProgramReward,
} from '@/lib/loyalty/simulator'
import { LoyaltyAboutContent } from './loyalty-about-content'

export const metadata: Metadata = {
  title: 'About Your Rewards - ChefFlow',
}

export default async function LoyaltyAboutPage() {
  // Ensure they're authenticated as a client
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: client } = await supabase
    .from('clients')
    .select('tenant_id, loyalty_points, total_events_completed')
    .eq('id', user.entityId)
    .single()

  const tenantId = client?.tenant_id as string | undefined

  const [configResult, rewardsResult, lifetimePointsResult] = tenantId
    ? await Promise.all([
        supabase
          .from('loyalty_config')
          .select(
            'points_per_guest, bonus_large_party_threshold, bonus_large_party_points, milestone_bonuses, tier_bronze_min, tier_silver_min, tier_gold_min, tier_platinum_min, is_active, welcome_points, referral_points, program_mode, earn_mode, points_per_dollar, points_per_event'
          )
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        supabase
          .from('loyalty_rewards')
          .select(
            'id, name, description, points_required, reward_type, reward_value_cents, reward_percent, sort_order'
          )
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('points_required', { ascending: true }),
        supabase
          .from('loyalty_transactions')
          .select('points')
          .eq('client_id', user.entityId)
          .in('type', ['earned', 'bonus']),
      ])
    : [{ data: null }, { data: [] }, { data: [] }]

  const simulatorConfig = normalizeLoyaltyConfig(
    configResult.data
      ? {
          points_per_guest: Number((configResult.data as any).points_per_guest ?? 0),
          bonus_large_party_threshold:
            (configResult.data as any).bonus_large_party_threshold ?? null,
          bonus_large_party_points: (configResult.data as any).bonus_large_party_points ?? null,
          milestone_bonuses: Array.isArray((configResult.data as any).milestone_bonuses)
            ? ((configResult.data as any).milestone_bonuses as Array<{
                events: number
                bonus: number
              }>)
            : undefined,
          tier_bronze_min: Number((configResult.data as any).tier_bronze_min ?? 0),
          tier_silver_min: Number((configResult.data as any).tier_silver_min ?? 0),
          tier_gold_min: Number((configResult.data as any).tier_gold_min ?? 0),
          tier_platinum_min: Number((configResult.data as any).tier_platinum_min ?? 0),
          is_active: Boolean((configResult.data as any).is_active ?? true),
          welcome_points: Number((configResult.data as any).welcome_points ?? 0),
          referral_points: Number((configResult.data as any).referral_points ?? 0),
          program_mode: (configResult.data as any).program_mode ?? 'full',
          earn_mode: (configResult.data as any).earn_mode ?? 'per_guest',
          points_per_dollar: Number((configResult.data as any).points_per_dollar ?? 1),
          points_per_event: Number((configResult.data as any).points_per_event ?? 100),
        }
      : null
  )

  const simulatorRewards = sortRewards((rewardsResult.data ?? []) as LoyaltyProgramReward[])
  const lifetimePointsEarned = (lifetimePointsResult.data ?? []).reduce(
    (sum: number, row: { points: number | null }) => sum + (row.points ?? 0),
    0
  )

  return (
    <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
      <Link
        href="/my-rewards"
        className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
      >
        &larr; My Rewards
      </Link>

      <div className="mt-6">
        <LoyaltyAboutContent
          simulatorConfig={simulatorConfig}
          simulatorRewards={simulatorRewards}
          initialProgress={{
            startingEventsCompleted: Number(client?.total_events_completed ?? 0),
            startingPointsBalance: Number(client?.loyalty_points ?? 0),
            startingLifetimePointsEarned: lifetimePointsEarned,
          }}
        />
      </div>

      <p className="text-center text-xs text-stone-600 mt-8 pb-8">
        Questions about your rewards? Ask your chef — they&rsquo;ll be happy to help.
      </p>
    </div>
  )
}
