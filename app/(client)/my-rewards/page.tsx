import type { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getMyLoyaltyStatus, type LoyaltyReward } from '@/lib/loyalty/actions'
import { getVoucherAndGiftCards } from '@/lib/loyalty/voucher-actions'
import { getMyPendingRedemptions } from '@/lib/loyalty/auto-award'
import { getActiveRaffle } from '@/lib/raffle/actions'
import { RaffleSection } from './raffle-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { RewardCard } from './reward-card'
import { ClientIncentiveList } from '@/components/incentives/client-incentive-list'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { HowToEarnPanel } from '@/components/loyalty/how-to-earn-panel'

export const metadata: Metadata = { title: 'My Rewards - ChefFlow' }

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'] as const

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

const TIER_BADGE: Record<string, string> = {
  bronze: 'bg-amber-900 text-amber-800',
  silver: 'bg-stone-700 text-stone-200',
  gold: 'bg-yellow-900 text-yellow-800',
  platinum: 'bg-indigo-900 text-indigo-800',
}

type TierKey = (typeof TIER_ORDER)[number]

function getTierProgress(
  tier: TierKey,
  points: number,
  config: {
    tier_silver_min: number
    tier_gold_min: number
    tier_platinum_min: number
  } | null
) {
  const thresholds = {
    bronze: 0,
    silver: config?.tier_silver_min ?? 100,
    gold: config?.tier_gold_min ?? 250,
    platinum: config?.tier_platinum_min ?? 500,
  }

  if (tier === 'platinum') {
    return { percent: 100, label: 'Top tier reached' }
  }

  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1]
  const currentMin = thresholds[tier]
  const nextMin = thresholds[nextTier]
  const span = Math.max(nextMin - currentMin, 1)
  const progress = Math.min(Math.max(points - currentMin, 0), span)
  const percent = Math.round((progress / span) * 100)
  const pointsNeeded = Math.max(nextMin - points, 0)

  return {
    percent,
    label: `${pointsNeeded} points to ${TIER_LABELS[nextTier]}`,
  }
}

export default async function MyRewardsPage() {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const status = await getMyLoyaltyStatus()
  if (!status) {
    return (
      <div className="max-w-5xl mx-auto">
        <Alert variant="warning">Unable to load your rewards account.</Alert>
      </div>
    )
  }

  // Program is disabled - show minimal page
  if (status.programMode === 'off') {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-stone-100">Rewards</h1>
        <Alert variant="info">
          Your chef hasn&rsquo;t enabled a loyalty program yet. Check back later!
        </Alert>
        <ActivityTracker eventType="rewards_viewed" metadata={{ program_mode: 'off' }} />
      </div>
    )
  }

  const { data: client } = await supabase
    .from('clients')
    .select('tenant_id')
    .eq('id', user.entityId)
    .single()

  const [incentives, rewardsResult, configResult, pendingRedemptions, raffleData] =
    await Promise.all([
      getVoucherAndGiftCards(),
      supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('tenant_id', client?.tenant_id || '')
        .eq('is_active', true)
        .order('points_required', { ascending: true }),
      supabase
        .from('loyalty_config')
        .select(
          'tier_silver_min, tier_gold_min, tier_platinum_min, points_per_guest, bonus_large_party_threshold, bonus_large_party_points, milestone_bonuses, earn_mode, points_per_dollar, points_per_event'
        )
        .eq('tenant_id', client?.tenant_id || '')
        .maybeSingle(),
      getMyPendingRedemptions(),
      getActiveRaffle().catch(() => null),
    ])

  const allRewards = (rewardsResult.data || []) as LoyaltyReward[]
  const configData = (configResult as any)?.data ?? null
  const progress = getTierProgress(status.tier as TierKey, status.pointsBalance, configData)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Rewards</h1>
          <p className="text-stone-400 mt-1">
            Track your points, see your progress, and redeem available rewards.
          </p>
        </div>
        <Link
          href="/my-rewards/about"
          className="text-sm text-brand-500 hover:text-brand-400 transition-colors whitespace-nowrap"
        >
          How It Works &rarr;
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${TIER_BADGE[status.tier]}`}
                >
                  {TIER_LABELS[status.tier]} Member
                </span>
                {status.programMode === 'full' && (
                  <p className="text-2xl font-bold text-stone-100">
                    {status.pointsBalance.toLocaleString()} points
                  </p>
                )}
              </div>
              <p className="text-sm text-stone-400">
                {status.totalEventsCompleted} completed event
                {status.totalEventsCompleted !== 1 ? 's' : ''}
              </p>
            </div>
            <Badge variant="info">{status.totalGuestsServed} guests served</Badge>
          </div>

          <div className="mt-5">
            <div className="h-2.5 w-full bg-stone-800 rounded-full overflow-hidden">
              {/* eslint-disable-next-line react/forbid-dom-props */}
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-sm text-stone-400 mt-2">{progress.label}</p>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Raffle - game-based entries, anonymous leaderboard */}
      {raffleData && (
        <RaffleSection
          round={raffleData.round}
          myEntries={raffleData.myEntries}
          myAlias={raffleData.myAlias}
          hasEntryToday={raffleData.hasEntryToday}
          totalEntries={raffleData.totalEntries}
          leaderboard={raffleData.leaderboard}
          lastDrawReceipt={raffleData.lastDrawReceipt}
        />
      )}

      {/* Full mode only: rewards catalog + pending deliveries */}
      {status.programMode === 'full' && (
        <>
          {status.availableRewards.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Available to Redeem</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {status.availableRewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    pointsBalance={status.pointsBalance}
                  />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Alert variant="info">
              No rewards are currently redeemable. Keep earning points to unlock your first reward.
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Rewards</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allRewards.map((reward) => (
                <RewardCard key={reward.id} reward={reward} pointsBalance={status.pointsBalance} />
              ))}
            </CardContent>
          </Card>

          {pendingRedemptions.length > 0 && (
            <Card className="border-amber-200 bg-amber-950/30">
              <CardHeader>
                <CardTitle className="text-amber-900">Pending Rewards</CardTitle>
                <p className="text-sm text-amber-700 mt-1">
                  You have redeemed these rewards. Your chef will honour them at your next event.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingRedemptions.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start justify-between gap-3 py-3 border-b border-amber-100 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-stone-100">{r.reward_name}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Redeemed {format(new Date(r.created_at), 'MMM d, yyyy')} · {r.points_spent}{' '}
                        pts spent
                      </p>
                    </div>
                    <Badge
                      variant={
                        r.delivery_status === 'delivered'
                          ? 'success'
                          : r.delivery_status === 'cancelled'
                            ? 'error'
                            : 'warning'
                      }
                    >
                      {r.delivery_status === 'delivered'
                        ? 'Delivered'
                        : r.delivery_status === 'cancelled'
                          ? 'Cancelled'
                          : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Gift Cards & Vouchers */}
      <Card>
        <CardHeader>
          <CardTitle>Gift Cards & Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientIncentiveList incentives={incentives as any} />
        </CardContent>
      </Card>

      {/* Full mode only: how to earn + points activity */}
      {status.programMode === 'full' && (
        <>
          {configData && (
            <HowToEarnPanel
              config={{
                points_per_guest: configData.points_per_guest ?? 10,
                bonus_large_party_threshold: configData.bonus_large_party_threshold ?? null,
                bonus_large_party_points: configData.bonus_large_party_points ?? null,
                milestone_bonuses: (configData.milestone_bonuses ?? []) as {
                  events: number
                  bonus: number
                }[],
                welcome_points: configData.welcome_points ?? 25,
                earn_mode: configData.earn_mode ?? 'per_guest',
                points_per_dollar: configData.points_per_dollar ?? 1,
                points_per_event: configData.points_per_event ?? 100,
              }}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Points Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {status.recentTransactions.length === 0 ? (
                <p className="text-sm text-stone-400">No points activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {status.recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2 border-b border-stone-800 last:border-b-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-100">{tx.description}</p>
                        <p className="text-xs text-stone-500">
                          {format(new Date(tx.created_at), 'PPP')}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${tx.points >= 0 ? 'text-emerald-700' : 'text-stone-300'}`}
                      >
                        {tx.points >= 0 ? '+' : ''}
                        {tx.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <ActivityTracker
        eventType="rewards_viewed"
        metadata={{
          points_balance: status.pointsBalance,
          tier: status.tier,
          available_rewards_count: status.availableRewards.length,
        }}
      />
    </div>
  )
}
