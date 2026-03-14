// AAR Performance Widget - after-action report stats and trends

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'

interface AARStats {
  totalReviews: number
  avgCalmRating: number
  avgPrepRating: number
  last5AvgCalm: number
  last5AvgPrep: number
  trendDirection: 'improving' | 'declining' | 'neutral'
  topForgottenItems: Array<{ item: string; count: number }>
}

interface Props {
  stats: AARStats
}

function ratingColor(rating: number): string {
  if (rating >= 4) return 'text-green-400'
  if (rating >= 3) return 'text-amber-400'
  return 'text-red-400'
}

export function AARPerformanceWidget({ stats }: Props) {
  const trendLabel =
    stats.trendDirection === 'improving'
      ? 'Improving'
      : stats.trendDirection === 'declining'
        ? 'Declining'
        : 'Steady'

  const trendColor =
    stats.trendDirection === 'improving'
      ? 'text-green-400'
      : stats.trendDirection === 'declining'
        ? 'text-amber-400'
        : 'text-stone-400'

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>AAR Performance</CardTitle>
          <Link
            href="/aar"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
          >
            All AARs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">
          {stats.totalReviews} reviews filed · Trend:{' '}
          <span className={trendColor}>{trendLabel}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-stone-500">Avg Calm Rating</p>
            <p className={`text-xl font-bold ${ratingColor(stats.avgCalmRating)}`}>
              {stats.avgCalmRating.toFixed(1)}
              <span className="text-xs text-stone-500 font-normal"> / 5</span>
            </p>
            <p className="text-xs text-stone-600">Last 5: {stats.last5AvgCalm.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Avg Prep Rating</p>
            <p className={`text-xl font-bold ${ratingColor(stats.avgPrepRating)}`}>
              {stats.avgPrepRating.toFixed(1)}
              <span className="text-xs text-stone-500 font-normal"> / 5</span>
            </p>
            <p className="text-xs text-stone-600">Last 5: {stats.last5AvgPrep.toFixed(1)}</p>
          </div>
        </div>

        {stats.topForgottenItems.length > 0 && (
          <div className="border-t border-stone-800 pt-3">
            <p className="text-xs text-stone-500 mb-2">Most Forgotten Items</p>
            <div className="flex flex-wrap gap-1.5">
              {stats.topForgottenItems.slice(0, 5).map((item) => (
                <span
                  key={item.item}
                  className="text-xs bg-stone-800 border border-stone-700 rounded px-2 py-0.5 text-stone-300"
                >
                  {item.item} ({item.count})
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
