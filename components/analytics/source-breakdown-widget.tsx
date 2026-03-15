// Source Breakdown Dashboard Widget
// Donut/pie chart using CSS conic-gradient
// Shows top 3 sources with percentages

'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { SourceBreakdownEntry } from '@/lib/analytics/channel-actions'
import { getSourceColor } from '@/lib/constants/booking-sources'

export function SourceBreakdownWidget({ data }: { data: SourceBreakdownEntry[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where Your Bookings Come From</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 py-6 text-center">No inquiry data yet</p>
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, d) => sum + d.count, 0)
  const top3 = data.slice(0, 3)

  // Build conic-gradient segments
  let accumulated = 0
  const gradientSegments: string[] = []
  for (const entry of data) {
    const pct = total > 0 ? (entry.count / total) * 100 : 0
    const color = getSourceColor(entry.source)
    gradientSegments.push(`${color} ${accumulated}% ${accumulated + pct}%`)
    accumulated += pct
  }

  // Fill any rounding gap
  if (accumulated < 100) {
    const lastColor = getSourceColor(data[data.length - 1].source)
    gradientSegments.push(`${lastColor} ${accumulated}% 100%`)
  }

  const gradient = `conic-gradient(${gradientSegments.join(', ')})`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Where Your Bookings Come From</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Donut chart */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-full" style={{ background: gradient }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <span className="text-lg font-bold text-stone-700">{total}</span>
              </div>
            </div>
          </div>

          {/* Top 3 sources */}
          <div className="flex-1 space-y-2.5">
            {top3.map((entry) => (
              <div key={entry.source} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: getSourceColor(entry.source) }}
                />
                <span className="text-sm text-stone-600 flex-1 truncate">{entry.sourceLabel}</span>
                <span className="text-sm font-medium text-stone-700">{entry.percentage}%</span>
              </div>
            ))}
            {data.length > 3 && (
              <p className="text-xs text-stone-400 pl-5">
                +{data.length - 3} more source{data.length - 3 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
