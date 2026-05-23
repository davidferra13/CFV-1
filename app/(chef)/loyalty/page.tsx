// Chef Loyalty Program Dashboard
// Overview of program stats, tier breakdown, rewards catalog, approaching milestones

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Loyalty Program' }
import {
  getLoyaltyOverview,
  getRewards,
  getClientsApproachingRewards,
  getLoyaltyConfig,
} from '@/lib/loyalty/actions'
import { getPendingRewardDeliveries } from '@/lib/loyalty/auto-award'
import { getVoucherAndGiftCards, getIncentiveStats } from '@/lib/loyalty/voucher-actions'
import { getActiveTriggers } from '@/lib/loyalty/triggers'
import {
  LOYALTY_MAX_FIXED_DISCOUNT_CENTS,
  LOYALTY_MAX_PERCENT_DISCOUNT,
  LOYALTY_REWARD_GUARDRAIL_SUMMARY,
} from '@/lib/loyalty/reward-guardrails'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import Link from 'next/link'
import { format } from 'date-fns'
import { RewardActions } from './reward-actions'
import { PendingDeliveriesPanel } from '@/components/loyalty/pending-deliveries-panel'
import { BackfillLoyaltyButton } from './backfill-button'
import { TierPerksDisplay } from '@/components/loyalty/tier-perks-display'

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-900 text-amber-800',
  silver: 'bg-stone-700 text-stone-200',
  gold: 'bg-yellow-900 text-yellow-800',
  platinum: 'bg-purple-900 text-purple-800',
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

export default async function LoyaltyDashboardPage() {
  const user = await requireChef()

  const [
    overview,
    rewards,
    approachingRewards,
    config,
    pendingDeliveries,
    incentives,
    incentiveStats,
    activeTriggers,
  ] = await Promise.all([
    getLoyaltyOverview(),
    getRewards(),
    getClientsApproachingRewards(),
    getLoyaltyConfig(),
    getPendingRewardDeliveries(),
    getVoucherAndGiftCards().catch((err) => {
      console.error('[loyalty-dashboard] Incentives failed:', err)
      return []
    }),
    getIncentiveStats().catch((err) => {
      console.error('[loyalty-dashboard] Incentive stats failed:', err)
      return {
        totalIssued: 0,
        totalRedeemed: 0,
        totalValueAppliedCents: 0,
        giftCardCount: 0,
        voucherCount: 0,
      }
    }),
    getActiveTriggers(user.tenantId!).catch((err) => {
      console.error('[loyalty-dashboard] Active triggers failed:', err)
      return []
    }),
  ])

  const isOff = overview.programMode === 'off'
  const isLite = overview.programMode === 'lite'
  const isFull = overview.programMode === 'full'

  // Subtitle varies by mode
  const subtitle = isOff
    ? 'Your loyalty program is currently disabled.'
    : isLite
      ? `Recognition tiers · ${overview.totalClients} clients enrolled`
      : `${config.points_per_guest} points per guest served · ${overview.totalClients} clients enrolled`

  const now = Date.now()
  const activeIncentives = (incentives as any[]).filter((incentive) => {
    if (!incentive.is_active) return false
    if (incentive.expires_at && new Date(incentive.expires_at).getTime() < now) return false
    return incentive.redemptions_used < incentive.max_redemptions
  })
  const expiringIncentives = activeIncentives.filter((incentive) => {
    if (!incentive.expires_at) return false
    const days = (new Date(incentive.expires_at).getTime() - now) / (1000 * 60 * 60 * 24)
    return days >= 0 && days <= 14
  })
  const activeVouchers = activeIncentives.filter((incentive) => incentive.type === 'voucher')
  const activeGiftCards = activeIncentives.filter((incentive) => incentive.type === 'gift_card')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Loyalty Program</h1>
          <p className="text-stone-400 mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          {!isOff && (
            <Link href="/loyalty/raffle">
              <Button variant="ghost">Monthly Raffle</Button>
            </Link>
          )}
          <Link href="/loyalty/learn">
            <Button variant="ghost">Learn About Loyalty</Button>
          </Link>
          <Link href="/loyalty/settings">
            <Button variant="secondary">Program Settings</Button>
          </Link>
          {isFull && (
            <Link href="/loyalty/rewards/new">
              <Button>Create Reward</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Off mode - CTA to enable */}
      {isOff && (
        <Card className="p-8 text-center">
          <p className="text-lg font-semibold text-stone-200">Ready to reward your clients?</p>
          <p className="text-sm text-stone-400 mt-2 max-w-md mx-auto">
            Enable your loyalty program to automatically recognize and reward your most loyal
            clients. Choose between a full points-based program or simple recognition tiers.
          </p>
          <div className="mt-4">
            <Link href="/loyalty/settings">
              <Button>Enable Loyalty Program</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Full mode: Pending Deliveries - shown at top so it's not missed */}
      {isFull && <PendingDeliveriesPanel deliveries={pendingDeliveries as any} />}

      {/* Overview Stats - shown for full + lite */}
      {!isOff && (
        <div className={`grid grid-cols-1 ${isFull ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-stone-500">Total Clients</p>
              <p className="text-3xl font-bold text-stone-100 mt-2">{overview.totalClients}</p>
            </CardContent>
          </Card>
          {isFull && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-stone-500">Points Outstanding</p>
                <p className="text-3xl font-bold text-stone-100 mt-2">
                  {overview.totalPointsOutstanding.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-stone-500">Gold+ Members</p>
              <p className="text-3xl font-bold text-stone-100 mt-2">
                {overview.clientsPerTier.gold + overview.clientsPerTier.platinum}
              </p>
            </CardContent>
          </Card>
          {isFull && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-stone-500">Active Rewards</p>
                <p className="text-3xl font-bold text-stone-100 mt-2">{rewards.length}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!isOff && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Retention Command Center</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Link href="/loyalty/rewards/new">
                  <Button variant="secondary" className="w-full">
                    Create Reward
                  </Button>
                </Link>
                <Link href="/clients/gift-cards">
                  <Button variant="secondary" className="w-full">
                    Send Voucher
                  </Button>
                </Link>
                <Link href="/commerce/promotions">
                  <Button variant="secondary" className="w-full">
                    Promotions
                  </Button>
                </Link>
                <Link href="/loyalty/settings">
                  <Button variant="secondary" className="w-full">
                    Configure
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
                  <p className="text-xs font-medium text-stone-500">Active Vouchers</p>
                  <p className="mt-2 text-2xl font-bold text-stone-100">{activeVouchers.length}</p>
                </div>
                <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
                  <p className="text-xs font-medium text-stone-500">Active Gift Cards</p>
                  <p className="mt-2 text-2xl font-bold text-stone-100">{activeGiftCards.length}</p>
                </div>
                <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
                  <p className="text-xs font-medium text-stone-500">Expiring in 14 Days</p>
                  <p className="mt-2 text-2xl font-bold text-stone-100">
                    {expiringIncentives.length}
                  </p>
                </div>
              </div>
              <p className="text-xs text-stone-500">
                {incentiveStats.totalRedeemed} voucher or gift-card redemption
                {incentiveStats.totalRedeemed === 1 ? '' : 's'} recorded from{' '}
                {incentiveStats.totalIssued} issued incentive
                {incentiveStats.totalIssued === 1 ? '' : 's'}.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automation Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-stone-400">Enabled triggers</span>
                <Badge variant={activeTriggers.length > 0 ? 'success' : 'default'}>
                  {activeTriggers.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-stone-400">Base event bonus</span>
                <span className="text-sm font-semibold text-stone-100">
                  {config.base_points_per_event || 0} pts
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-stone-400">Referral award</span>
                <span className="text-sm font-semibold text-stone-100">
                  {config.referral_points || 0} pts
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-stone-400">Pending deliveries</span>
                <Badge variant={pendingDeliveries.length > 0 ? 'warning' : 'success'}>
                  {pendingDeliveries.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isFull && (
        <Card>
          <CardHeader>
            <CardTitle>Reward and Discount Guardrails</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {LOYALTY_REWARD_GUARDRAIL_SUMMARY.map((item) => (
                <p key={item} className="text-sm text-stone-400">
                  {item}
                </p>
              ))}
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
              <p className="text-sm font-semibold text-stone-100">Current cash limits</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-stone-500">Fixed reward cap</dt>
                  <dd className="font-semibold text-stone-100">
                    ${LOYALTY_MAX_FIXED_DISCOUNT_CENTS / 100}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-stone-500">Percent reward cap</dt>
                  <dd className="font-semibold text-stone-100">{LOYALTY_MAX_PERCENT_DISCOUNT}%</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-stone-500">Voucher redemption limit</dt>
                  <dd className="font-semibold text-stone-100">Per voucher setting</dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier Breakdown - shown for full + lite */}
      {!isOff && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Tier Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => (
              <div key={tier} className="text-center p-4 rounded-lg bg-stone-800">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_COLORS[tier]}`}
                >
                  {TIER_LABELS[tier]}
                </span>
                <p className="text-3xl font-bold text-stone-100 mt-3">
                  {overview.clientsPerTier[tier]}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  {tier === 'bronze'
                    ? `0-${config.tier_silver_min - 1}`
                    : tier === 'silver'
                      ? `${config.tier_silver_min}-${config.tier_gold_min - 1}`
                      : tier === 'gold'
                        ? `${config.tier_gold_min}-${config.tier_platinum_min - 1}`
                        : `${config.tier_platinum_min}+`}{' '}
                  {isLite ? 'events' : 'pts'}
                </p>
              </div>
            ))}
          </div>

          {/* Tier Perks - what each tier unlocks */}
          {config.tier_perks &&
            Object.values(config.tier_perks).some((p: string[]) => p.length > 0) && (
              <div className="mt-6 pt-6 border-t border-stone-700">
                <h3 className="text-sm font-semibold text-stone-400 mb-3">
                  What Each Tier Unlocks
                </h3>
                <TierPerksDisplay tierPerks={config.tier_perks} compact />
              </div>
            )}
        </Card>
      )}

      {/* Approaching Milestones - outreach opportunities (full + lite) */}
      {!isOff &&
        (overview.clientsApproachingTierUpgrade.length > 0 || approachingRewards.length > 0) && (
          <Card className="p-6 border-brand-700 bg-brand-950">
            <h2 className="font-semibold text-brand-200 mb-4">Outreach Opportunities</h2>

            {overview.clientsApproachingTierUpgrade.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-brand-400 mb-2">
                  Approaching Tier Upgrades
                </h3>
                <div className="space-y-2">
                  {overview.clientsApproachingTierUpgrade.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between bg-stone-900 rounded-lg p-3"
                    >
                      <div>
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-stone-100 hover:text-brand-600"
                        >
                          {client.full_name}
                        </Link>
                        <p className="text-sm text-stone-500">
                          {client.pointsToNextTier} points from {client.nextTierName}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[client.loyalty_tier]}`}
                      >
                        {TIER_LABELS[client.loyalty_tier]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approachingRewards.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-brand-400 mb-2">Approaching Rewards</h3>
                <div className="space-y-2">
                  {approachingRewards.slice(0, 5).map((client: any) => (
                    <div
                      key={client.clientId}
                      className="flex items-center justify-between bg-stone-900 rounded-lg p-3"
                    >
                      <div>
                        <Link
                          href={`/clients/${client.clientId}`}
                          className="font-medium text-stone-100 hover:text-brand-600"
                        >
                          {client.clientName}
                        </Link>
                        <p className="text-sm text-stone-500">
                          {client.approachingRewards[0].pointsNeeded} pts from{' '}
                          {client.approachingRewards[0].rewardName}
                          {client.approachingRewards[0].guestsNeeded > 0 && (
                            <>
                              {' '}
                              · ~{client.approachingRewards[0].guestsNeeded} more guest
                              {client.approachingRewards[0].guestsNeeded > 1 ? 's' : ''}
                            </>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-stone-400">
                        {client.currentPoints} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

      {/* Top Clients - shown for full + lite */}
      {!isOff && overview.topClients.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Top Clients</h2>
          <div className="space-y-2">
            {overview.topClients
              .filter((c) => c.loyalty_points > 0)
              .map((client, i) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-stone-400 w-6">{i + 1}</span>
                    <div>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-stone-100 hover:text-brand-600"
                      >
                        {client.full_name}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[client.loyalty_tier]}`}
                    >
                      {TIER_LABELS[client.loyalty_tier]}
                    </span>
                    <span className="text-sm font-bold text-stone-100 w-20 text-right">
                      {client.loyalty_points.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Rewards Catalog + Recent Awards - full mode only */}
      {isFull && (
        <>
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Rewards Catalog</h2>
              <div className="flex gap-2">
                <Link href="/loyalty/rewards/new">
                  <Button variant="secondary" size="sm">
                    Add Reward
                  </Button>
                </Link>
              </div>
            </div>

            {rewards.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <p>No rewards configured yet.</p>
                <p className="text-sm mt-1">
                  Add rewards to give your clients something to work toward.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {rewards.map((reward) => (
                  <div key={reward.id} className="py-3 border-b border-stone-800 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-stone-100">{reward.name}</p>
                        <p className="text-sm text-stone-500 mt-0.5">
                          {reward.description}
                          {reward.reward_type === 'discount_fixed' && reward.reward_value_cents && (
                            <> · {formatCurrency(reward.reward_value_cents)} off</>
                          )}
                          {reward.reward_type === 'discount_percent' && reward.reward_percent && (
                            <> · {reward.reward_percent}% off</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-stone-100">
                          {reward.points_required} pts
                        </span>
                        <RewardActions reward={reward} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {overview.recentAwards.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Point Awards</h2>
              <div className="space-y-2">
                {overview.recentAwards.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                  >
                    <div>
                      <p className="text-sm text-stone-100">{tx.description}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {format(new Date(tx.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">+{tx.points}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Program Settings Summary - shown for full + lite */}
      {!isOff && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Program Settings</h2>
            <div className="flex gap-2">
              <BackfillLoyaltyButton />
              <Link href="/loyalty/settings">
                <Button variant="ghost" size="sm">
                  Edit Settings
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-stone-500">Program Mode</p>
              <p className="text-lg font-bold text-stone-100 mt-1 capitalize">
                {config.program_mode}
              </p>
            </div>
            {isFull && (
              <>
                <div>
                  <p className="text-sm font-medium text-stone-500">Earn Mode</p>
                  <p className="text-lg font-bold text-stone-100 mt-1">
                    {config.earn_mode === 'per_guest'
                      ? `${config.points_per_guest} pts/guest`
                      : config.earn_mode === 'per_dollar'
                        ? `${config.points_per_dollar} pts/$`
                        : `${config.points_per_event} pts/event`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-500">Welcome Bonus</p>
                  <p className="text-lg font-bold text-stone-100 mt-1">
                    {config.welcome_points ?? 25} pts
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-500">Large Party Bonus</p>
                  <p className="text-lg font-bold text-stone-100 mt-1">
                    {config.bonus_large_party_points || '-'}{' '}
                    {config.bonus_large_party_points
                      ? `pts (${config.bonus_large_party_threshold}+ guests)`
                      : ''}
                  </p>
                </div>
              </>
            )}
            {isLite && (
              <div>
                <p className="text-sm font-medium text-stone-500">Tier Basis</p>
                <p className="text-lg font-bold text-stone-100 mt-1">Completed events</p>
              </div>
            )}
            {isFull && config.milestone_bonuses.length > 0 && (
              <div className="col-span-2 md:col-span-4">
                <p className="text-sm font-medium text-stone-500 mb-1">Milestones</p>
                <div className="flex flex-wrap gap-2">
                  {config.milestone_bonuses.map((m) => (
                    <span
                      key={m.events}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-stone-800 text-stone-300"
                    >
                      🏆 {m.events}th dinner → +{m.bonus} pts
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
