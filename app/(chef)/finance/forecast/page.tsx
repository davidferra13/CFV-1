import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireChef } from '@/lib/auth/get-user'
import { getRevenueForecast } from '@/lib/analytics/revenue-forecast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ForecastChart = dynamic(
  () => import('@/components/finance/forecast-chart').then((m) => m.ForecastChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    ),
  }
)
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { TrendingUp, TrendingDown, Minus } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Revenue Forecast - ChefFlow' }

export default async function ForecastPage() {
  await requireChef()
  const forecast = await getRevenueForecast()

  const TrendIcon =
    forecast.trend === 'up' ? TrendingUp : forecast.trend === 'down' ? TrendingDown : Minus
  const trendColor =
    forecast.trend === 'up'
      ? 'text-green-600'
      : forecast.trend === 'down'
        ? 'text-red-600'
        : 'text-stone-400'
  const trendLabel =
    forecast.trend === 'up' ? 'Growing' : forecast.trend === 'down' ? 'Declining' : 'Stable'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Revenue Forecast</h1>
        <p className="text-stone-400 mt-1">
          Projected revenue based on your historical performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-stone-500">Avg Monthly Revenue</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              {formatCurrency(forecast.avgMonthlyRevenueCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-stone-500">Projected Annual</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              {formatCurrency(forecast.projectedAnnualCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-stone-500">Trend</p>
            <div className="flex items-center gap-2 mt-1">
              <TrendIcon className={`h-5 w-5 ${trendColor}`} />
              <span className={`text-xl font-bold ${trendColor}`}>{trendLabel}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend &amp; Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ForecastChart historical={forecast.historical} forecast={forecast.forecast} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next 3 Months Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {forecast.forecast.map((m) => (
              <div key={m.month} className="bg-stone-800 rounded-lg p-4">
                <p className="text-sm text-stone-400">{m.month}</p>
                <p className="text-xl font-bold text-stone-200 mt-1">
                  {formatCurrency(m.projected || 0)}
                </p>
                <Badge variant="info">Projected</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
