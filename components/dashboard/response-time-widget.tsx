// Response Time SLA Widget - shows urgency counts + avg response time
// Sits on the dashboard to surface "you have N inquiries waiting"

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, AlertTriangle, CheckCircle } from '@/components/ui/icons'
import type { ResponseTimeSummary } from '@/lib/analytics/response-time-actions'

interface ResponseTimeWidgetProps {
  summary: ResponseTimeSummary
}

export function ResponseTimeWidget({ summary }: ResponseTimeWidgetProps) {
  const needsAttention = summary.overdue + summary.urgent

  if (needsAttention === 0 && summary.ok === 0) return null

  return (
    <Link href="/inquiries?status=new" className="block">
      <Card
        className={`transition-colors hover:opacity-90 ${
          summary.overdue > 0
            ? 'border-red-800 bg-red-950/30'
            : summary.urgent > 0
              ? 'border-amber-800 bg-amber-950/30'
              : 'border-stone-700'
        }`}
      >
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  summary.overdue > 0
                    ? 'bg-red-900'
                    : summary.urgent > 0
                      ? 'bg-amber-900'
                      : 'bg-stone-800'
                }`}
              >
                {summary.overdue > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                ) : summary.urgent > 0 ? (
                  <Clock className="h-4 w-4 text-amber-400" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-100">
                  {needsAttention > 0
                    ? `${needsAttention} inquiry${needsAttention !== 1 ? 'ies' : ''} awaiting response`
                    : summary.ok > 0
                      ? `${summary.ok} new inquiry${summary.ok !== 1 ? 'ies' : ''} - all fresh`
                      : 'All inquiries responded to'}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                  {summary.overdue > 0 && (
                    <span className="text-red-400 font-medium">
                      {summary.overdue} overdue (24h+)
                    </span>
                  )}
                  {summary.urgent > 0 && (
                    <span className="text-amber-400 font-medium">
                      {summary.urgent} urgent (4h+)
                    </span>
                  )}
                  {summary.ok > 0 && <span className="text-emerald-400">{summary.ok} fresh</span>}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              {summary.avgResponseTimeHours !== null && (
                <div>
                  <p className="text-lg font-bold text-stone-100">
                    {summary.avgResponseTimeHours < 1
                      ? `${Math.round(summary.avgResponseTimeHours * 60)}m`
                      : `${summary.avgResponseTimeHours}h`}
                  </p>
                  <p className="text-[10px] text-stone-500">avg response</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
