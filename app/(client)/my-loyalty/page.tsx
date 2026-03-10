// Loyalty Dashboard - Client Portal
// Shows tier, points, progress, available rewards, and transaction history.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getClientLoyaltyStatus } from '@/lib/client-portal/portal-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoyaltyCard } from '@/components/client-portal/loyalty-card'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = { title: 'My Loyalty - ChefFlow' }

const TX_TYPE_LABELS: Record<
  string,
  { label: string; variant: 'success' | 'error' | 'info' | 'default' }
> = {
  earned: { label: 'Earned', variant: 'success' },
  bonus: { label: 'Bonus', variant: 'success' },
  welcome: { label: 'Welcome', variant: 'info' },
  referral: { label: 'Referral', variant: 'info' },
  redeemed: { label: 'Redeemed', variant: 'error' },
  adjustment: { label: 'Adjustment', variant: 'default' },
  milestone: { label: 'Milestone', variant: 'success' },
}

export default async function MyLoyaltyPage() {
  await requireClient()

  const loyalty = await getClientLoyaltyStatus()

  if (!loyalty) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Loyalty</h1>
          <p className="text-stone-400 mt-1">Your loyalty program status</p>
        </div>
        <Card className="p-8 text-center">
          <p className="text-stone-500">No loyalty program is active for your account yet.</p>
        </Card>
        <ActivityTracker eventType="loyalty_page_viewed" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Loyalty</h1>
        <p className="text-stone-400 mt-1">Track your points and rewards</p>
      </div>

      {/* Loyalty Card */}
      <LoyaltyCard
        tier={loyalty.tier}
        points={loyalty.points}
        nextTier={loyalty.nextTier}
        nextTierThreshold={loyalty.nextTierThreshold}
        progressPercent={loyalty.progressPercent}
      />

      {/* Available Rewards */}
      {loyalty.availableRewards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-100">Available Rewards</h2>
            <Link href="/my-rewards" className="text-sm text-brand-400 hover:text-brand-300">
              View all rewards
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {loyalty.availableRewards.slice(0, 4).map((reward) => (
              <Card key={reward.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-stone-100">{reward.name}</p>
                    {reward.description && (
                      <p className="text-sm text-stone-500 mt-0.5">{reward.description}</p>
                    )}
                  </div>
                  <Badge variant="info">{reward.points_required} pts</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      {loyalty.transactions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Recent Activity</h2>
          <div className="space-y-2">
            {loyalty.transactions.map((tx) => {
              const display = TX_TYPE_LABELS[tx.type] || TX_TYPE_LABELS.adjustment
              const isPositive = tx.points > 0
              return (
                <Card key={tx.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant={display.variant}>{display.label}</Badge>
                      <span className="text-sm text-stone-300">{tx.description}</span>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          isPositive ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {tx.points}
                      </p>
                      <p className="text-xs text-stone-600">
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <ActivityTracker eventType="loyalty_page_viewed" />
    </div>
  )
}
