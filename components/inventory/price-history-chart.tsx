'use client'

// PriceHistoryChart - Line chart showing ingredient price trends over time.
// Displays monthly average prices with seasonal patterns.

import { useState, useEffect, useTransition } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, DollarSign } from '@/components/ui/icons'
import {
  getMonthlyPriceAverages,
  getIngredientPriceTrend,
} from '@/lib/inventory/price-history-actions'

type PriceHistoryChartProps = {
  ingredientId: string
  ingredientName: string
  months?: number
}

type ChartPoint = {
  month: string
  avgCents: number
  minCents: number
  maxCents: number
  count: number
}

type TrendInfo = {
  direction: 'rising' | 'falling' | 'stable'
  changePct: number
  recentAvgCents: number
  previousAvgCents: number
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-')
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[parseInt(m, 10) - 1]} '${year.slice(2)}`
}

function TrendBadge({ trend }: { trend: TrendInfo }) {
  if (trend.direction === 'rising') {
    return (
      <Badge variant="error">
        <TrendingUp className="h-3 w-3 mr-1" />+{trend.changePct.toFixed(1)}%
      </Badge>
    )
  }
  if (trend.direction === 'falling') {
    return (
      <Badge variant="success">
        <TrendingDown className="h-3 w-3 mr-1" />
        {trend.changePct.toFixed(1)}%
      </Badge>
    )
  }
  return (
    <Badge variant="default">
      <Minus className="h-3 w-3 mr-1" />
      Stable
    </Badge>
  )
}

export function PriceHistoryChart({
  ingredientId,
  ingredientName,
  months = 12,
}: PriceHistoryChartProps) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [trend, setTrend] = useState<TrendInfo | null>(null)
  const [loading, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const [avgData, trendData] = await Promise.all([
          getMonthlyPriceAverages(ingredientId, months),
          getIngredientPriceTrend(ingredientId),
        ])
        setData(
          avgData.map((d: any) => ({
            month: d.month,
            avgCents: d.avgPriceCents,
            minCents: d.minPriceCents,
            maxCents: d.maxPriceCents,
            count: d.entryCount,
          }))
        )
        setTrend(trendData)
      } catch {
        // Failed to load; show empty state
        setData([])
        setTrend(null)
      }
    })
  }, [ingredientId, months])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse">
            <div className="h-4 w-48 bg-stone-700 rounded mx-auto mb-4" />
            <div className="h-48 bg-stone-800 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">
            No price history for {ingredientName}. Prices are recorded automatically when purchase
            orders are received.
          </p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
    avgDollars: d.avgCents / 100,
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-stone-400" />
            Price History: {ingredientName}
          </CardTitle>
          {trend && <TrendBadge trend={trend} />}
        </div>
        {trend && (
          <p className="text-xs text-stone-500 mt-1">
            Recent avg: {formatMoney(trend.recentAvgCents)} vs previous:{' '}
            {formatMoney(trend.previousAvgCents)}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a8a29e' }} stroke="#57534e" />
            <YAxis
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              tick={{ fontSize: 11, fill: '#a8a29e' }}
              stroke="#57534e"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1c1917',
                border: '1px solid #44403c',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#d6d3d1' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Avg Price']}
            />
            <Line
              type="monotone"
              dataKey="avgDollars"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Summary row */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-2 rounded-lg bg-stone-800">
            <p className="text-xs text-stone-500">Lowest</p>
            <p className="text-sm font-semibold text-emerald-500">
              {formatMoney(Math.min(...data.map((d) => d.minCents)))}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-stone-800">
            <p className="text-xs text-stone-500">Current Avg</p>
            <p className="text-sm font-semibold text-stone-100">
              {formatMoney(data[data.length - 1].avgCents)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-stone-800">
            <p className="text-xs text-stone-500">Highest</p>
            <p className="text-sm font-semibold text-red-500">
              {formatMoney(Math.max(...data.map((d) => d.maxCents)))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
