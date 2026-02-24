'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DailyRow {
  date: string
  revenueCents: number
  purchasesCents: number
  foodCostPercent: number
}

interface FoodCostDashboardProps {
  thisWeekPercent: number
  thisMonthPercent: number
  targetPercent: number
  dailyData: DailyRow[]
}

function getCostColor(pct: number): string {
  if (pct < 30) return 'text-emerald-400'
  if (pct <= 35) return 'text-amber-400'
  return 'text-red-400'
}

function getBarColor(pct: number): string {
  if (pct < 30) return 'bg-emerald-500'
  if (pct <= 35) return 'bg-amber-500'
  return 'bg-red-500'
}

export function FoodCostDashboard({
  thisWeekPercent,
  thisMonthPercent,
  targetPercent,
  dailyData,
}: FoodCostDashboardProps) {
  const maxPercent = Math.max(...dailyData.map((d) => d.foodCostPercent), targetPercent, 50)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-wide">This Week</p>
            <p className={`text-2xl font-bold mt-1 ${getCostColor(thisWeekPercent)}`}>
              {thisWeekPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-wide">This Month</p>
            <p className={`text-2xl font-bold mt-1 ${getCostColor(thisMonthPercent)}`}>
              {thisMonthPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Target</p>
            <p className="text-2xl font-bold mt-1 text-stone-200">{targetPercent}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Food Cost %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyData.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-xs text-stone-400 w-24 shrink-0">{day.date}</span>
                  <div className="flex-1 bg-stone-800 rounded-full h-5 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getBarColor(day.foodCostPercent)}`}
                      style={{
                        width: `${Math.min((day.foodCostPercent / maxPercent) * 100, 100)}%`,
                      }}
                    />
                    {/* Target line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-stone-400"
                      style={{
                        left: `${(targetPercent / maxPercent) * 100}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium w-12 text-right ${getCostColor(day.foodCostPercent)}`}
                  >
                    {day.foodCostPercent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;30%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> 30-35%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> &gt;35%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-stone-400" /> Target
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily breakdown table */}
      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700 text-left text-stone-400">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Revenue</th>
                    <th className="pb-2 pr-4">Purchases</th>
                    <th className="pb-2">Food Cost %</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.map((day) => (
                    <tr key={day.date} className="border-b border-stone-800">
                      <td className="py-2 pr-4 text-stone-300">{day.date}</td>
                      <td className="py-2 pr-4 text-stone-200">
                        $
                        {(day.revenueCents / 100).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 pr-4 text-stone-200">
                        $
                        {(day.purchasesCents / 100).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className={`py-2 font-medium ${getCostColor(day.foodCostPercent)}`}>
                        {day.foodCostPercent.toFixed(1)}%
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
              No data yet. Enter daily revenue and log vendor invoices to see your food cost
              breakdown.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
