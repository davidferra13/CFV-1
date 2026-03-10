'use client'

import type {
  DailyPerformanceMetrics,
  WeekOverWeekComparison,
} from '@/lib/commerce/analytics-actions'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowUp, ArrowDown } from '@/components/ui/icons'

interface DailyMetricsCardsProps {
  metrics: DailyPerformanceMetrics
  weekComparison: WeekOverWeekComparison[]
}

export function DailyMetricsCards({ metrics, weekComparison }: DailyMetricsCardsProps) {
  const cards = [
    {
      label: 'Total Revenue',
      value: `$${(metrics.totalRevenueCents / 100).toFixed(2)}`,
      comparison: weekComparison.find((w) => w.metric === 'Revenue'),
    },
    {
      label: 'Covers',
      value: String(metrics.covers),
      comparison: weekComparison.find((w) => w.metric === 'Covers'),
    },
    {
      label: 'Avg Check',
      value: `$${(metrics.avgCheckCents / 100).toFixed(2)}`,
      comparison: weekComparison.find((w) => w.metric === 'Avg Check'),
    },
    {
      label: 'Rev / Cover',
      value: `$${(metrics.revenuePerCover / 100).toFixed(2)}`,
      comparison: null,
    },
    {
      label: 'Tips',
      value: `$${(metrics.tipsCents / 100).toFixed(2)}`,
      comparison: null,
    },
    {
      label: 'Refunds',
      value: metrics.refundsCents > 0 ? `$${(metrics.refundsCents / 100).toFixed(2)}` : '$0.00',
      comparison: null,
      negative: metrics.refundsCents > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="py-4 text-center">
            <p className={`text-xl font-bold ${card.negative ? 'text-red-400' : 'text-stone-100'}`}>
              {card.value}
            </p>
            <p className="text-xs text-stone-500 mt-1">{card.label}</p>
            {card.comparison && (
              <div className="flex items-center justify-center gap-1 mt-1">
                {card.comparison.direction === 'up' ? (
                  <ArrowUp className="w-3 h-3 text-emerald-400" />
                ) : card.comparison.direction === 'down' ? (
                  <ArrowDown className="w-3 h-3 text-red-400" />
                ) : null}
                <span
                  className={`text-[10px] ${
                    card.comparison.direction === 'up'
                      ? 'text-emerald-400'
                      : card.comparison.direction === 'down'
                        ? 'text-red-400'
                        : 'text-stone-500'
                  }`}
                >
                  {card.comparison.changePercent}% vs last week
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
