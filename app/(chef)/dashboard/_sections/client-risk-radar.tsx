// Client Risk Radar - dashboard widget (server component)
// Shows a compact summary of clients at risk of churning.

import { getClientRiskRadar } from '@/lib/intelligence/client-risk-actions'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error('[Dashboard/ClientRiskRadar] Failed:', err)
    return fallback
  }
}

export async function ClientRiskRadarWidget() {
  const result = await safe(getClientRiskRadar, null)

  if (!result || result.reports.length === 0) return null

  const { summary } = result
  const urgentCount = summary.criticalCount + summary.highCount

  if (urgentCount === 0 && summary.mediumCount === 0) return null

  const topRisk = result.reports.find((r) => !r.dismissed)
  const revenueAtRisk = summary.totalRevenueAtRiskCents
  const revenueStr = revenueAtRisk > 0
    ? `$${(revenueAtRisk / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : null

  return (
    <WidgetCardShell
      widgetId="client_risk_radar"
      title="Client Risk Radar"
      size="md"
      href="/analytics/intelligence/client-risk"
    >
      <div className="space-y-3">
        {/* Risk counts */}
        <div className="flex items-center gap-3">
          {summary.criticalCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm text-red-400 font-medium">{summary.criticalCount} critical</span>
            </div>
          )}
          {summary.highCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-sm text-orange-400 font-medium">{summary.highCount} high</span>
            </div>
          )}
          {summary.mediumCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-sm text-amber-400 font-medium">{summary.mediumCount} medium</span>
            </div>
          )}
        </div>

        {/* Revenue at risk */}
        {revenueStr && (
          <p className="text-xs text-stone-400">
            <span className="text-red-400 font-medium">{revenueStr}</span> in revenue at risk
          </p>
        )}

        {/* Top at-risk client */}
        {topRisk && (
          <div className="rounded-md border border-stone-700 bg-stone-800/40 px-3 py-2">
            <p className="text-sm text-stone-200 font-medium truncate">{topRisk.clientName}</p>
            <p className="text-xs text-stone-400 mt-0.5 truncate">
              {topRisk.factors[0]?.description ?? `${topRisk.daysSinceContact} days silent`}
            </p>
          </div>
        )}
      </div>
    </WidgetCardShell>
  )
}
