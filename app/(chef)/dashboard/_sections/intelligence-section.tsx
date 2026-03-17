// Dashboard Intelligence Section - streams in with business health + proactive alerts
// Powered by the 25-engine intelligence system. Zero AI dependency.

import { getBusinessHealthSummary } from '@/lib/intelligence/business-health-summary'
import { getProactiveAlerts } from '@/lib/intelligence/proactive-alerts'
import { getDashboardWorkSurface } from '@/lib/workflow/actions'
import { CollapsibleWidget } from '@/components/dashboard/collapsible-widget'
import { DashboardWorkSurfaceView } from '@/components/dashboard/work-surface'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import type { DashboardWidgetId } from '@/lib/scheduling/types'
import { widgetGridClass } from '@/lib/scheduling/types'
import type { DashboardWorkSurface } from '@/lib/workflow/types'

// Safe wrapper
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/Intelligence] ${label} failed:`, err)
    return fallback
  }
}

interface IntelligenceSectionProps {
  widgetEnabled: Record<string, boolean>
  widgetOrder: Record<string, number>
}

export async function IntelligenceSection({
  widgetEnabled,
  widgetOrder,
}: IntelligenceSectionProps) {
  const isEnabled = (id: DashboardWidgetId) => widgetEnabled[id] ?? true
  const getOrder = (id: DashboardWidgetId) => widgetOrder[id] ?? Number.MAX_SAFE_INTEGER

  const [health, alerts, workSurface] = await Promise.all([
    isEnabled('business_health' as DashboardWidgetId)
      ? safe('health', getBusinessHealthSummary, null)
      : Promise.resolve(null),
    isEnabled('business_health' as DashboardWidgetId)
      ? safe('alerts', getProactiveAlerts, null)
      : Promise.resolve(null),
    isEnabled('work_surface')
      ? safe('workSurface', getDashboardWorkSurface, null as DashboardWorkSurface | null)
      : Promise.resolve(null),
  ])

  if (!health && !alerts && !workSurface) return null

  const criticalAlerts = alerts?.alerts.filter((a) => a.severity === 'critical') || []
  const warningAlerts = alerts?.alerts.filter((a) => a.severity === 'warning') || []
  const opportunities = alerts?.alerts.filter((a) => a.severity === 'opportunity') || []

  return (
    <>
      {isEnabled('work_surface') && workSurface && workSurface.summary.totalActiveEvents > 0 && (
        <section
          className={widgetGridClass('work_surface')}
          style={{ order: getOrder('work_surface') }}
        >
          <CollapsibleWidget widgetId="work_surface" title="Work Surface">
            <DashboardWorkSurfaceView surface={workSurface} />
          </CollapsibleWidget>
        </section>
      )}

      {isEnabled('business_health' as DashboardWidgetId) && (health || alerts) && (
        <section
          className={widgetGridClass('business_health')}
          style={{ order: getOrder('business_health' as DashboardWidgetId) }}
        >
          <CollapsibleWidget
            widgetId={'business_health' as DashboardWidgetId}
            title="Business Intelligence"
          >
            <div className="space-y-4">
              {/* Health Score Bar */}
              {health && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        health.scores.overall >= 70
                          ? 'bg-green-900/40 text-green-400 border border-green-700/50'
                          : health.scores.overall >= 40
                            ? 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
                            : 'bg-red-900/40 text-red-400 border border-red-700/50'
                      }`}
                    >
                      {health.scores.overall}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-200">Business Health</p>
                      <p className="text-xs text-stone-400">
                        {health.scores.overall >= 70
                          ? 'Looking strong'
                          : health.scores.overall >= 40
                            ? 'Needs attention'
                            : 'Action required'}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-2 ml-4">
                    {(
                      [
                        ['Revenue', health.scores.revenue],
                        ['Clients', health.scores.clients],
                        ['Ops', health.scores.operations],
                        ['Growth', health.scores.growth],
                      ] as const
                    ).map(([label, score]) => (
                      <div key={label} className="text-center">
                        <div className="text-xs text-stone-500">{label}</div>
                        <div
                          className={`text-sm font-semibold ${
                            score >= 70
                              ? 'text-green-400'
                              : score >= 40
                                ? 'text-amber-400'
                                : 'text-red-400'
                          }`}
                        >
                          {score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Critical Alerts */}
              {criticalAlerts.length > 0 && (
                <div className="space-y-2">
                  {criticalAlerts.map((alert) => (
                    <Link key={alert.id} href={alert.link || '/dashboard'} className="block">
                      <Card className="border-red-800/60 bg-red-950/30 hover:bg-red-950/50 transition-colors">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            <span className="text-lg shrink-0">{alert.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-red-300">{alert.title}</p>
                              <p className="text-xs text-red-400/70 mt-0.5">{alert.detail}</p>
                            </div>
                            <span className="text-xs text-red-400 shrink-0 mt-0.5">
                              {alert.action} →
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {/* Warning Alerts */}
              {warningAlerts.length > 0 && (
                <div className="space-y-2">
                  {warningAlerts.slice(0, 3).map((alert) => (
                    <Link key={alert.id} href={alert.link || '/dashboard'} className="block">
                      <Card className="border-amber-800/40 bg-amber-950/20 hover:bg-amber-950/40 transition-colors">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            <span className="text-lg shrink-0">{alert.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-amber-300">{alert.title}</p>
                              <p className="text-xs text-amber-400/60 mt-0.5">{alert.detail}</p>
                            </div>
                            <span className="text-xs text-amber-400 shrink-0 mt-0.5">
                              {alert.action} →
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {/* Opportunities */}
              {opportunities.length > 0 && (
                <div className="space-y-2">
                  {opportunities.slice(0, 2).map((alert) => (
                    <Link key={alert.id} href={alert.link || '/dashboard'} className="block">
                      <Card className="border-brand-800/40 bg-brand-950/20 hover:bg-brand-950/40 transition-colors">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            <span className="text-lg shrink-0">{alert.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-brand-300">{alert.title}</p>
                              <p className="text-xs text-brand-400/60 mt-0.5">{alert.detail}</p>
                            </div>
                            <span className="text-xs text-brand-400 shrink-0 mt-0.5">
                              {alert.action} →
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {/* Top Insights */}
              {health && health.topInsights.length > 0 && (
                <div className="border-t border-stone-800 pt-3">
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">
                    Key Insights
                  </p>
                  <ul className="space-y-1">
                    {health.topInsights.map((insight, i) => (
                      <li key={i} className="text-sm text-stone-300 flex items-start gap-2">
                        <span className="text-stone-500 mt-1 shrink-0">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Intelligence Hub Link */}
              <div className="flex justify-end pt-1">
                <Link
                  href="/intelligence"
                  className="text-xs text-brand-500 hover:text-brand-400 font-medium"
                >
                  Full Intelligence Hub →
                </Link>
              </div>
            </div>
          </CollapsibleWidget>
        </section>
      )}
    </>
  )
}
