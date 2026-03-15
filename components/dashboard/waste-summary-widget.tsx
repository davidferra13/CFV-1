import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WasteSummary, WasteInsight } from '@/lib/events/waste-tracking-actions'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Protein',
  produce: 'Produce',
  dairy: 'Dairy',
  grain: 'Grain',
  prepared_dish: 'Prepared Dish',
  other: 'Other',
}

const REASON_LABELS: Record<string, string> = {
  overproduction: 'Overproduction',
  spoilage: 'Spoilage',
  guest_no_show: 'Guest No-Show',
  dietary_change: 'Dietary Change',
  quality_issue: 'Quality Issue',
  other: 'Other',
}

function insightBadgeVariant(severity: string): 'info' | 'warning' | 'error' {
  if (severity === 'critical') return 'error'
  if (severity === 'warning') return 'warning'
  return 'info'
}

export function WasteSummaryWidget({
  summary,
  insights,
}: {
  summary: WasteSummary
  insights: WasteInsight[]
}) {
  if (summary.entryCount === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Food Waste Tracker</CardTitle>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-stone-500">
            {summary.entryCount} items across {summary.eventCount} event
            {summary.eventCount !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-400">
              {formatCents(summary.totalWasteCostCents)}
            </p>
            <p className="text-xs text-stone-500">Total Waste</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-stone-200">
              {formatCents(summary.avgWasteCostPerEventCents)}
            </p>
            <p className="text-xs text-stone-500">Avg / Event</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-stone-200">{summary.eventCount}</p>
            <p className="text-xs text-stone-500">Events Tracked</p>
          </div>
        </div>

        {/* Monthly trend (simple table) */}
        {summary.monthlyTrend.length > 1 && (
          <div>
            <h4 className="text-xs font-medium text-stone-400 mb-2">Monthly Trend</h4>
            <div className="space-y-1">
              {summary.monthlyTrend.slice(-6).map((m) => {
                const maxCents = Math.max(...summary.monthlyTrend.map((t) => t.totalCents), 1)
                const barWidth = Math.round((m.totalCents / maxCents) * 100)
                return (
                  <div key={m.month} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-stone-500 shrink-0">{m.month}</span>
                    <div className="flex-1 h-4 bg-stone-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-500/60 rounded"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-stone-400 shrink-0">
                      {formatCents(m.totalCents)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Top waste categories */}
        {summary.byCategory.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-stone-400 mb-2">By Category</h4>
            <div className="flex flex-wrap gap-2">
              {summary.byCategory.slice(0, 5).map((c) => (
                <div key={c.category} className="flex items-center gap-1 text-xs text-stone-400">
                  <span>{CATEGORY_LABELS[c.category] ?? c.category}</span>
                  <span className="text-amber-400">{formatCents(c.totalCents)}</span>
                  <span className="text-stone-600">({c.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top reasons */}
        {summary.byReason.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-stone-400 mb-2">By Reason</h4>
            <div className="flex flex-wrap gap-2">
              {summary.byReason.slice(0, 5).map((r) => (
                <div key={r.reason} className="flex items-center gap-1 text-xs text-stone-400">
                  <span>{REASON_LABELS[r.reason] ?? r.reason}</span>
                  <span className="text-amber-400">{formatCents(r.totalCents)}</span>
                  <span className="text-stone-600">({r.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-stone-400 mb-2">Insights</h4>
            <div className="space-y-2">
              {insights.map((insight, i) => (
                <div key={i} className="rounded-md border border-stone-700/50 p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={insightBadgeVariant(insight.severity)}>
                      {insight.severity}
                    </Badge>
                    <span className="text-xs text-stone-500">{insight.metric}</span>
                  </div>
                  <p className="text-xs text-stone-300">{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
