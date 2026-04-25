import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getMenuPerformance } from '@/lib/menu-performance/actions'
import { Card, CardContent } from '@/components/ui/card'
import { PerformanceTable } from '@/components/stations/performance-table'

export const metadata: Metadata = { title: 'Menu Performance' }

export default async function MenuPerformancePage() {
  await requireChef()
  const performanceData = await getMenuPerformance()

  const totalItems = performanceData.length
  const totalRevenue = performanceData.reduce((sum, p) => sum + (p.total_revenue_cents ?? 0), 0)
  const avgFoodCost =
    performanceData.filter((p) => p.food_cost_pct !== null).length > 0
      ? performanceData
          .filter((p) => p.food_cost_pct !== null)
          .reduce((sum, p) => sum + (p.food_cost_pct ?? 0), 0) /
        performanceData.filter((p) => p.food_cost_pct !== null).length
      : null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Menu Performance</h1>
        <p className="mt-1 text-sm text-stone-500">How your dishes perform over time</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              Items Tracked
            </p>
            <p className="text-2xl font-bold text-stone-100 mt-1">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              Total Revenue
            </p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              $
              {(totalRevenue / 100).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              Avg Food Cost %
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${
                avgFoodCost === null
                  ? 'text-stone-500'
                  : avgFoodCost < 30
                    ? 'text-emerald-400'
                    : avgFoodCost <= 35
                      ? 'text-yellow-400'
                      : 'text-red-400'
              }`}
            >
              {avgFoodCost !== null ? `${avgFoodCost.toFixed(1)}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance table */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <PerformanceTable items={performanceData} />
        </CardContent>
      </Card>
    </div>
  )
}
