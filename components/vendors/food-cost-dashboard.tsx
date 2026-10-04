'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { PurchaseCostDay, PurchaseCostSummary } from '@/lib/finance/purchase-cost-summary'

interface FoodCostDashboardProps {
  week: PurchaseCostSummary
  month: PurchaseCostSummary
  targetPercent: number
  targetLow?: number
  targetHigh?: number
  dailyData: PurchaseCostDay[]
}

function getCostColor(pct: number | null, low: number, high: number): string {
  if (pct === null) return 'text-stone-500'
  if (pct < low) return 'text-emerald-400'
  if (pct <= high) return 'text-amber-400'
  return 'text-red-400'
}

function getBarColor(pct: number, low: number, high: number): string {
  if (pct < low) return 'bg-emerald-500'
  if (pct <= high) return 'bg-amber-500'
  return 'bg-red-500'
}

function PurchaseSummary({
  label,
  summary,
  low,
  high,
}: {
  label: string
  summary: PurchaseCostSummary
  low: number
  high: number
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 text-center">
        <p className="text-xs text-stone-400 uppercase tracking-wide">{label}</p>
        <p
          className={`text-2xl font-bold mt-1 ${getCostColor(summary.purchasePercent, low, high)}`}
        >
          {summary.purchasePercent === null
            ? 'Revenue needed'
            : `${summary.purchasePercent.toFixed(1)}%`}
        </p>
        <p className="mt-2 text-xs text-stone-500">
          {formatCurrency(summary.purchasesCents)} purchases /{' '}
          {formatCurrency(summary.revenueCents)} revenue
        </p>
        {summary.purchasePercent === null && (
          <a
            href="#daily-revenue"
            className="mt-2 inline-block text-sm text-brand-600 hover:underline"
          >
            Record revenue
          </a>
        )}
      </CardContent>
    </Card>
  )
}

export function FoodCostDashboard({
  week,
  month,
  targetPercent,
  targetLow,
  targetHigh,
  dailyData,
}: FoodCostDashboardProps) {
  const low = targetLow ?? targetPercent
  const high = targetHigh ?? targetPercent + 5
  const maxPercent = Math.max(...dailyData.map((d) => d.purchasePercent ?? 0), targetPercent, 50)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PurchaseSummary label="This week" summary={week} low={low} high={high} />
        <PurchaseSummary label="This month" summary={month} low={low} high={high} />
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Target</p>
            <p className="text-2xl font-bold mt-1 text-stone-200">{targetPercent}%</p>
            <p className="mt-2 text-xs text-stone-500">Purchases / revenue</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-stone-500">
        This compares vendor purchases with recorded revenue. Purchases can cover future meals;
        actual food consumed also depends on opening and closing inventory.
      </p>

      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily purchases / revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyData.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-xs text-stone-400 w-24 shrink-0">{day.date}</span>
                  {day.purchasePercent === null ? (
                    <div className="flex-1 text-xs text-stone-500">
                      No positive revenue recorded
                    </div>
                  ) : (
                    <div className="flex-1 bg-stone-800 rounded-full h-5 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getBarColor(day.purchasePercent, low, high)}`}
                        style={{
                          width: `${Math.max(0, Math.min((day.purchasePercent / maxPercent) * 100, 100))}%`,
                        }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-stone-400"
                        style={{ left: `${(targetPercent / maxPercent) * 100}%` }}
                      />
                    </div>
                  )}
                  <span
                    className={`text-xs font-medium w-24 text-right ${getCostColor(day.purchasePercent, low, high)}`}
                  >
                    {day.purchasePercent === null
                      ? 'Revenue needed'
                      : `${day.purchasePercent.toFixed(1)}%`}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;{low}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> {low}-{high}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> &gt;{high}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-stone-400" /> Target
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700 text-left text-stone-400">
                    <th scope="col" className="pb-2 pr-4">
                      Date
                    </th>
                    <th scope="col" className="pb-2 pr-4">
                      Revenue
                    </th>
                    <th scope="col" className="pb-2 pr-4">
                      Purchases
                    </th>
                    <th scope="col" className="pb-2">
                      Purchases / revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.map((day) => (
                    <tr key={day.date} className="border-b border-stone-800">
                      <td className="py-2 pr-4 text-stone-300">{day.date}</td>
                      <td className="py-2 pr-4 text-stone-200">
                        {formatCurrency(day.revenueCents)}
                      </td>
                      <td className="py-2 pr-4 text-stone-200">
                        {formatCurrency(day.purchasesCents)}
                      </td>
                      <td
                        className={`py-2 font-medium ${getCostColor(day.purchasePercent, low, high)}`}
                      >
                        {day.purchasePercent === null
                          ? 'Revenue needed'
                          : `${day.purchasePercent.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {dailyData.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-stone-500">
              No data yet. Enter daily revenue and log vendor invoices to see your purchase
              spending.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
