// Chef Loyalty Program Dashboard
// Overview of program stats, tier breakdown, rewards catalog, approaching milestones

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Loyalty Program - ChefFlow' }
import { getLoyaltyOverview, getRewards, getClientsApproachingRewards, getLoyaltyConfig } from '@/lib/loyalty/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import Link from 'next/link'
import { format } from 'date-fns'
import { RewardActions } from './reward-actions'

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-stone-200 text-stone-800',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-purple-100 text-purple-800',
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

export default async function LoyaltyDashboardPage() {
  await requireChef()

  const [overview, rewards, approachingRewards, config] = await Promise.all([
    getLoyaltyOverview(),
    getRewards(),
    getClientsApproachingRewards(),
    getLoyaltyConfig(),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Loyalty Program</h1>
          <p className="text-stone-600 mt-1">
            {config.points_per_guest} points per guest served · {overview.totalClients} clients enrolled
          </p>
        </div>
        <Link href="/loyalty/rewards/new">
          <Button>Create Reward</Button>
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <dt className="text-sm font-medium text-stone-500">Total Clients</dt>
            <dd className="text-3xl font-bold text-stone-900 mt-2">{overview.totalClients}</dd>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <dt className="text-sm font-medium text-stone-500">Points Outstanding</dt>
            <dd className="text-3xl font-bold text-stone-900 mt-2">{overview.totalPointsOutstanding.toLocaleString()}</dd>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <dt className="text-sm font-medium text-stone-500">Gold+ Members</dt>
            <dd className="text-3xl font-bold text-stone-900 mt-2">
              {overview.clientsPerTier.gold + overview.clientsPerTier.platinum}
            </dd>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <dt className="text-sm font-medium text-stone-500">Active Rewards</dt>
            <dd className="text-3xl font-bold text-stone-900 mt-2">{rewards.length}</dd>
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Tier Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => (
            <div key={tier} className="text-center p-4 rounded-lg bg-stone-50">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_COLORS[tier]}`}>
                {TIER_LABELS[tier]}
              </span>
              <p className="text-3xl font-bold text-stone-900 mt-3">{overview.clientsPerTier[tier]}</p>
              <p className="text-xs text-stone-500 mt-1">
                {tier === 'bronze' ? `0-${config.tier_silver_min - 1}` :
                 tier === 'silver' ? `${config.tier_silver_min}-${config.tier_gold_min - 1}` :
                 tier === 'gold' ? `${config.tier_gold_min}-${config.tier_platinum_min - 1}` :
                 `${config.tier_platinum_min}+`} pts
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Approaching Milestones — outreach opportunities */}
      {(overview.clientsApproachingTierUpgrade.length > 0 || approachingRewards.length > 0) && (
        <Card className="p-6 border-brand-200 bg-brand-50">
          <h2 className="font-semibold text-brand-900 mb-4">Outreach Opportunities</h2>

          {overview.clientsApproachingTierUpgrade.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-brand-700 mb-2">Approaching Tier Upgrades</h3>
              <div className="space-y-2">
                {overview.clientsApproachingTierUpgrade.map((client) => (
                  <div key={client.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div>
                      <Link href={`/clients/${client.id}`} className="font-medium text-stone-900 hover:text-brand-600">
                        {client.full_name}
                      </Link>
                      <p className="text-sm text-stone-500">
                        {client.pointsToNextTier} points from {client.nextTierName}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[client.loyalty_tier]}`}>
                      {TIER_LABELS[client.loyalty_tier]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {approachingRewards.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-brand-700 mb-2">Approaching Rewards</h3>
              <div className="space-y-2">
                {approachingRewards.slice(0, 5).map((client) => (
                  <div key={client.clientId} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div>
                      <Link href={`/clients/${client.clientId}`} className="font-medium text-stone-900 hover:text-brand-600">
                        {client.clientName}
                      </Link>
                      <p className="text-sm text-stone-500">
                        {client.approachingRewards[0].pointsNeeded} pts from {client.approachingRewards[0].rewardName}
                        {client.approachingRewards[0].guestsNeeded > 0 && (
                          <> · ~{client.approachingRewards[0].guestsNeeded} more guest{client.approachingRewards[0].guestsNeeded > 1 ? 's' : ''}</>
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-stone-600">{client.currentPoints} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Top Clients */}
      {overview.topClients.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Top Clients</h2>
          <div className="space-y-2">
            {overview.topClients.filter(c => c.loyalty_points > 0).map((client, i) => (
              <div key={client.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-stone-400 w-6">{i + 1}</span>
                  <div>
                    <Link href={`/clients/${client.id}`} className="font-medium text-stone-900 hover:text-brand-600">
                      {client.full_name}
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[client.loyalty_tier]}`}>
                    {TIER_LABELS[client.loyalty_tier]}
                  </span>
                  <span className="text-sm font-bold text-stone-900 w-20 text-right">{client.loyalty_points.toLocaleString()} pts</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Rewards Catalog */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Rewards Catalog</h2>
          <Link href="/loyalty/rewards/new">
            <Button variant="secondary" size="sm">Add Reward</Button>
          </Link>
        </div>

        {rewards.length === 0 ? (
          <div className="text-center py-8 text-stone-500">
            <p>No rewards configured yet.</p>
            <p className="text-sm mt-1">Add rewards to give your clients something to work toward.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-stone-900">{reward.name}</p>
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
                  <span className="text-sm font-bold text-stone-900">{reward.points_required} pts</span>
                  <RewardActions rewardId={reward.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Awards */}
      {overview.recentAwards.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Point Awards</h2>
          <div className="space-y-2">
            {overview.recentAwards.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                <div>
                  <p className="text-sm text-stone-900">{tx.description}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {format(new Date(tx.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className="text-sm font-bold text-green-600">+{tx.points}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Program Settings Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Program Settings</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <dt className="text-sm font-medium text-stone-500">Points per Guest</dt>
            <dd className="text-lg font-bold text-stone-900 mt-1">{config.points_per_guest}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Large Party Bonus</dt>
            <dd className="text-lg font-bold text-stone-900 mt-1">
              {config.bonus_large_party_points || 0} pts ({config.bonus_large_party_threshold}+ guests)
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Milestones</dt>
            <dd className="text-sm text-stone-900 mt-1">
              {config.milestone_bonuses.map(m => `${m.events}th event: +${m.bonus}`).join(', ')}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Program Status</dt>
            <dd className="mt-1">
              <Badge variant={config.is_active ? 'success' : 'default'}>
                {config.is_active ? 'Active' : 'Paused'}
              </Badge>
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
