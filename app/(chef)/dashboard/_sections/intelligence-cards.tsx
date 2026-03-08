// Dashboard Intelligence Cards - Business Health as a visible card

import { getBusinessHealthSummary } from '@/lib/intelligence/business-health-summary'
import { getProactiveAlerts } from '@/lib/intelligence/proactive-alerts'
import { getCapacityAnalysis } from '@/lib/analytics/capacity-actions'
import { CapacityWidget } from '@/components/dashboard/capacity-widget'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'
import Link from 'next/link'

type SafeResult<T> = { data: T; failed: false } | { data: T; failed: true; label: string }

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<SafeResult<T>> {
  try {
    return { data: await fn(), failed: false }
  } catch (err) {
    console.error(`[Dashboard/IntelligenceCards] ${label} failed:`, err)
    return { data: fallback, failed: true, label }
  }
}

export async function IntelligenceCards() {
  const [healthResult, alertsResult, capacityResult] = await Promise.all([
    safe('Business Health', getBusinessHealthSummary, null),
    safe('Alerts', getProactiveAlerts, null),
    safe('Capacity', () => getCapacityAnalysis(90), null),
  ])

  const health = healthResult.data
  const alerts = alertsResult.data
  const capacityData = capacityResult.data
  const failedSections = [healthResult, alertsResult, capacityResult]
    .filter((r) => r.failed)
    .map((r) => (r as { label: string }).label)

  if (!health && !alerts) {
    if (failedSections.length > 0) {
      return (
        <div className="px-4 py-3 rounded-lg bg-red-950/20 border border-red-800/20 text-xs text-red-300">
          Could not load: {failedSections.join(', ')}. Refresh to try again.
        </div>
      )
    }
    return null
  }

  const criticalAlerts = alerts?.alerts.filter((a) => a.severity === 'critical') || []
  const warningAlerts = alerts?.alerts.filter((a) => a.severity === 'warning') || []

  const scoreColor =
    health && health.scores.overall >= 70
      ? '#4ade80'
      : health && health.scores.overall >= 40
        ? '#fbbf24'
        : '#f87171'

  const subScores = health
    ? [
        { label: 'Revenue', score: health.scores.revenue },
        { label: 'Clients', score: health.scores.clients },
        { label: 'Ops', score: health.scores.operations },
        { label: 'Growth', score: health.scores.growth },
      ]
    : []

  return (
    <>
      {failedSections.length > 0 && (
        <div className="col-span-full px-4 py-2.5 rounded-lg bg-red-950/20 border border-red-800/20 text-xs text-red-300">
          Could not load: {failedSections.join(', ')}. Some intelligence cards may be missing.
        </div>
      )}

      {/* Business Health - large card */}
      {health && (
        <WidgetCardShell
          widgetId="business_health"
          title="Business Health"
          size="md"
          href="/intelligence"
        >
          <div className="space-y-3">
            {/* Overall score + sub-scores */}
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2"
                style={{
                  color: scoreColor,
                  borderColor: `${scoreColor}40`,
                  backgroundColor: `${scoreColor}15`,
                }}
              >
                {health.scores.overall}
              </div>
              <div className="flex-1 grid grid-cols-4 gap-2">
                {subScores.map(({ label, score }) => {
                  const c = score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171'
                  return (
                    <div key={label} className="text-center">
                      <div className="text-xs text-stone-500">{label}</div>
                      <div className="text-sm font-bold" style={{ color: c }}>
                        {score}
                      </div>
                      {/* Mini progress bar */}
                      <div className="h-1 rounded-full bg-stone-800 mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${score}%`, backgroundColor: c }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Critical alerts inline */}
            {criticalAlerts.length > 0 && (
              <div className="space-y-1.5">
                {criticalAlerts.slice(0, 2).map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.link || '#'}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/40 border border-red-800/30 hover:bg-red-950/60 transition-colors"
                  >
                    <span className="text-sm shrink-0">{alert.icon}</span>
                    <span className="text-xs text-red-300 truncate flex-1">{alert.title}</span>
                    <span className="text-[10px] text-red-400 shrink-0">{alert.action} &rarr;</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Warning alerts inline */}
            {warningAlerts.length > 0 && criticalAlerts.length < 2 && (
              <div className="space-y-1.5">
                {warningAlerts.slice(0, 2 - criticalAlerts.length).map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.link || '#'}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-800/20 hover:bg-amber-950/50 transition-colors"
                  >
                    <span className="text-sm shrink-0">{alert.icon}</span>
                    <span className="text-xs text-amber-300 truncate flex-1">{alert.title}</span>
                    <span className="text-[10px] text-amber-400 shrink-0">
                      {alert.action} &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Top insight */}
            {health.topInsights.length > 0 && (
              <p className="text-xs text-stone-500 border-t border-stone-800 pt-2">
                {health.topInsights[0]}
              </p>
            )}
          </div>
        </WidgetCardShell>
      )}

      {/* Capacity Planning Widget */}
      {capacityData && (
        <CapacityWidget
          utilizationPercent={capacityData.analysis.utilizationPercent}
          weeklyHoursUsed={capacityData.analysis.weeklyHoursUsed}
          weeklyHoursAvailable={capacityData.analysis.weeklyHoursAvailable}
          burnoutRisk={capacityData.analysis.burnoutRisk}
          canTakeMore={capacityData.analysis.canTakeMore}
          additionalEventsPerWeek={capacityData.analysis.additionalEventsPerWeek}
        />
      )}
    </>
  )
}
