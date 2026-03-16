// Year-over-Year Comparison Widget - revenue, events, avg value comparison

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'

interface YoYMetric {
  label: string
  currentYear: number
  previousYear: number
  changePercent: number | null
  changeDirection: 'up' | 'down' | 'flat'
}

interface YoYData {
  revenueMetric: YoYMetric
  eventCountMetric: YoYMetric
  avgEventValueMetric: YoYMetric
  currentYearLabel: string
  previousYearLabel: string
}

interface Props {
  data: YoYData
}

function ChangeIndicator({ direction, percent }: { direction: string; percent: number | null }) {
  if (percent == null) return <span className="text-xs text-stone-500">N/A</span>

  const color =
    direction === 'up' ? 'text-green-400' : direction === 'down' ? 'text-red-400' : 'text-stone-400'

  const arrow = direction === 'up' ? '+' : direction === 'down' ? '-' : ''

  return (
    <span className={`text-xs font-medium ${color}`}>
      {arrow}
      {percent.toFixed(1)}%
    </span>
  )
}

export function YoYComparisonWidget({ data }: Props) {
  const hasData = data.revenueMetric.currentYear > 0 || data.revenueMetric.previousYear > 0

  if (!hasData) return null

  const metrics = [
    {
      ...data.revenueMetric,
      currentFormatted: formatCurrency(data.revenueMetric.currentYear),
      previousFormatted: formatCurrency(data.revenueMetric.previousYear),
    },
    {
      ...data.eventCountMetric,
      currentFormatted: data.eventCountMetric.currentYear.toString(),
      previousFormatted: data.eventCountMetric.previousYear.toString(),
    },
    {
      ...data.avgEventValueMetric,
      currentFormatted: formatCurrency(data.avgEventValueMetric.currentYear),
      previousFormatted: formatCurrency(data.avgEventValueMetric.previousYear),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Year-over-Year</CardTitle>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            Analytics <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">
          {data.currentYearLabel} vs {data.previousYearLabel}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500">{metric.label}</p>
                <p className="text-sm font-semibold text-stone-200">{metric.currentFormatted}</p>
              </div>
              <div className="text-right">
                <ChangeIndicator
                  direction={metric.changeDirection}
                  percent={metric.changePercent}
                />
                <p className="text-xs text-stone-600">was {metric.previousFormatted}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
