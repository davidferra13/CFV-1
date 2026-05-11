// Contract Analytics Card - Server Component
// Displays aggregate contract metrics on the contracts dashboard.

import { getContractAnalytics } from '@/lib/contracts/analytics-actions'
import { Card, CardContent } from '@/components/ui/card'
import {
  FileText,
  Check,
  Clock,
  XCircle,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from '@/components/ui/icons'

export async function ContractAnalytics() {
  let analytics
  let fetchError = false

  try {
    analytics = await getContractAnalytics()
  } catch (err) {
    console.error('[ContractAnalytics] Failed to load:', err)
    fetchError = true
  }

  if (fetchError || !analytics) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-red-300 text-sm">Could not load contract analytics</p>
        </CardContent>
      </Card>
    )
  }

  const monthDiff = analytics.thisMonth - analytics.lastMonth
  const monthTrend = monthDiff > 0 ? 'up' : monthDiff < 0 ? 'down' : 'flat'

  return (
    <Card>
      <CardContent className="py-5 px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-stone-400">
              <FileText size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Total</span>
            </div>
            <p className="text-2xl font-bold text-stone-100">{analytics.total}</p>
          </div>

          {/* Signed */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Check size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Signed</span>
            </div>
            <p className="text-2xl font-bold text-stone-100">{analytics.signed}</p>
          </div>

          {/* Pending */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Clock size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Pending</span>
            </div>
            <p className="text-2xl font-bold text-stone-100">{analytics.pending}</p>
          </div>

          {/* Voided */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-red-400">
              <XCircle size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Voided</span>
            </div>
            <p className="text-2xl font-bold text-stone-100">{analytics.voided}</p>
          </div>

          {/* Avg Time to Sign */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-stone-400">
              <TrendingUp size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Avg Sign</span>
            </div>
            <p className="text-2xl font-bold text-stone-100">
              {analytics.avgDaysToSign !== null ? `${analytics.avgDaysToSign} days` : '-'}
            </p>
          </div>

          {/* Acceptance Rate */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-stone-400">
              <Check size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Accept %</span>
            </div>
            <p className="text-2xl font-bold text-stone-100">
              {analytics.acceptanceRate !== null ? `${analytics.acceptanceRate}%` : '-'}
            </p>
          </div>
        </div>

        {/* Month comparison */}
        <div className="mt-4 pt-4 border-t border-stone-800 flex items-center gap-2 text-sm">
          {monthTrend === 'up' && <ArrowUp size={14} className="text-emerald-400" />}
          {monthTrend === 'down' && <ArrowDown size={14} className="text-red-400" />}
          <span className="text-stone-400">
            This month: <span className="text-stone-200 font-medium">{analytics.thisMonth}</span>
            {' / '}
            Last month: <span className="text-stone-200 font-medium">{analytics.lastMonth}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
