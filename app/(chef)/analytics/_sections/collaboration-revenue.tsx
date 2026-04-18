// Collaboration Revenue Card - surfaces co-hosted vs solo revenue distinction
// Server component, streamed via Suspense

import { getCollaborationRevenueStats } from '@/lib/analytics/collaboration-analytics'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export async function CollaborationRevenueCard() {
  const stats = await getCollaborationRevenueStats()

  const hasActivity =
    stats.coHostedEventCount > 0 ||
    stats.subcontractIncomeCents > 0 ||
    stats.subcontractExpenseCents > 0 ||
    stats.referralHandoffsSent > 0

  if (!hasActivity) return null

  return (
    <Card className="p-5 border-brand-800/30">
      <h3 className="text-sm font-semibold text-brand-200 mb-3">Network Collaboration</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-stone-400">Solo Events</p>
          <p className="text-lg font-bold text-stone-100">{stats.soloEventCount}</p>
          <p className="text-xs text-stone-500">{formatCurrency(stats.soloRevenueCents)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Co-hosted Events</p>
          <p className="text-lg font-bold text-brand-300">{stats.coHostedEventCount}</p>
          <p className="text-xs text-stone-500">{formatCurrency(stats.coHostedRevenueCents)}</p>
        </div>
        {(stats.subcontractIncomeCents > 0 || stats.subcontractExpenseCents > 0) && (
          <div>
            <p className="text-xs text-stone-400">Subcontract</p>
            {stats.subcontractIncomeCents > 0 && (
              <p className="text-sm text-green-400">
                +{formatCurrency(stats.subcontractIncomeCents)} earned
              </p>
            )}
            {stats.subcontractExpenseCents > 0 && (
              <p className="text-sm text-amber-400">
                -{formatCurrency(stats.subcontractExpenseCents)} spent
              </p>
            )}
          </div>
        )}
        {stats.referralHandoffsSent > 0 && (
          <div>
            <p className="text-xs text-stone-400">Referrals</p>
            <p className="text-lg font-bold text-stone-100">{stats.referralHandoffsSent} sent</p>
            <p className="text-xs text-stone-500">{stats.referralHandoffsConverted} converted</p>
          </div>
        )}
      </div>
    </Card>
  )
}
