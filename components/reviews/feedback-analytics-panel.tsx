'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { FeedbackAnalytics } from '@/lib/reviews/feedback-analytics'

const TREND_CONFIG = {
  improving: { label: 'Improving', variant: 'success' as const },
  stable: { label: 'Stable', variant: 'warning' as const },
  declining: { label: 'Declining', variant: 'error' as const },
  insufficient: { label: 'Need more reviews', variant: 'default' as const },
}

export function FeedbackAnalyticsPanel({ data }: { data: FeedbackAnalytics }) {
  if (data.totalReviews === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-stone-400">
          <p className="text-sm">
            No client reviews yet. Analytics will appear after your first review.
          </p>
        </CardContent>
      </Card>
    )
  }

  const trend = TREND_CONFIG[data.recentTrend]

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-stone-500">Overall Rating</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              {data.averageRating.toFixed(1)}/5
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-stone-500">Total Reviews</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">{data.totalReviews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-stone-500">Would Book Again</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">{data.wouldBookAgainPct}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-stone-500">Trend</p>
            <div className="mt-1">
              <Badge variant={trend.variant}>{trend.label}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dimension breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rating Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.dimensions
            .filter((d) => d.count > 0)
            .map((d) => (
              <div key={d.dimension} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">{d.label}</span>
                  <span className="text-stone-400">{d.avg.toFixed(1)}/5</span>
                </div>
                <div className="w-full bg-stone-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      d.avg >= 4.5 ? 'bg-green-600' : d.avg >= 3.5 ? 'bg-amber-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${(d.avg / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Insights */}
      {(data.topStrength || data.topWeakness) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.topStrength && (
              <p className="text-stone-300">
                <span className="text-green-500 font-medium">Top strength:</span> {data.topStrength}
              </p>
            )}
            {data.topWeakness && data.topWeakness !== data.topStrength && (
              <p className="text-stone-300">
                <span className="text-amber-500 font-medium">Area to improve:</span>{' '}
                {data.topWeakness}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
