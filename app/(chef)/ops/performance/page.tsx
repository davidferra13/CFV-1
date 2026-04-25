// Menu Performance Analytics - Boston Matrix classification, sales velocity,
// profit per unit, food cost %, waste tracking per menu item.
// Victor's "which items are profitable, which are slow, which create strain."

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getMenuPerformance, getMenuEngineering } from '@/lib/restaurant/sales-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Menu Performance' }

function QuadrantCard({
  title,
  description,
  items,
  color,
}: {
  title: string
  description: string
  items: any[]
  color: string
}) {
  const borderColor =
    color === 'emerald'
      ? 'border-emerald-800'
      : color === 'amber'
        ? 'border-amber-800'
        : color === 'sky'
          ? 'border-sky-800'
          : 'border-stone-700'
  const titleColor =
    color === 'emerald'
      ? 'text-emerald-400'
      : color === 'amber'
        ? 'text-amber-400'
        : color === 'sky'
          ? 'text-sky-400'
          : 'text-stone-400'

  return (
    <Card className={`border ${borderColor}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm ${titleColor}`}>{title}</CardTitle>
        <p className="text-xs text-stone-500">{description}</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-stone-600">No items in this quadrant yet.</p>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 8).map((item) => (
              <div key={item.menu_item_id} className="flex items-center justify-between text-sm">
                <span className="text-stone-300 truncate max-w-[60%]">{item.item_name}</span>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-stone-500">{item.total_sold}x</span>
                  <span className="text-stone-300">
                    {formatCurrency(item.profit_per_unit_cents || 0)}/ea
                  </span>
                </div>
              </div>
            ))}
            {items.length > 8 && <p className="text-xs text-stone-600">+{items.length - 8} more</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default async function MenuPerformancePage() {
  await requireChef()

  const [allItems, engineering] = await Promise.all([
    getMenuPerformance({ sortBy: 'total_revenue_cents', limit: 50 }),
    getMenuEngineering(),
  ])

  const totalRevenue = allItems.reduce((s, i) => s + (i.total_revenue_cents || 0), 0)
  const totalSold = allItems.reduce((s, i) => s + i.total_sold, 0)
  const avgFoodCost =
    allItems.length > 0
      ? Math.round(
          allItems
            .filter((i) => i.food_cost_pct != null)
            .reduce((s, i) => s + (i.food_cost_pct || 0), 0) /
            Math.max(1, allItems.filter((i) => i.food_cost_pct != null).length)
        )
      : null

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Menu Performance</h1>
          <p className="text-sm text-stone-500">
            Sales velocity, margins, and menu engineering analysis
          </p>
        </div>
        <Link href="/ops" className="text-sm text-stone-500 hover:text-stone-300">
          Back to Ops
        </Link>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
          <p className="text-xs text-stone-500 uppercase">Total Revenue</p>
          <p className="text-2xl font-bold text-stone-100 tabular-nums">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-xs text-stone-500 mt-1">{allItems.length} items tracked</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
          <p className="text-xs text-stone-500 uppercase">Total Sold</p>
          <p className="text-2xl font-bold text-stone-100 tabular-nums">{totalSold}</p>
          <p className="text-xs text-stone-500 mt-1">
            {allItems.length > 0 ? Math.round(totalSold / allItems.length) : 0} avg/item
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
          <p className="text-xs text-stone-500 uppercase">Avg Food Cost</p>
          <p
            className={`text-2xl font-bold tabular-nums ${avgFoodCost != null ? (avgFoodCost <= 30 ? 'text-emerald-400' : avgFoodCost <= 35 ? 'text-amber-400' : 'text-red-400') : 'text-stone-500'}`}
          >
            {avgFoodCost != null ? `${avgFoodCost}%` : '-'}
          </p>
          <p className="text-xs text-stone-500 mt-1">Target: 28-32%</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
          <p className="text-xs text-stone-500 uppercase">Menu Items</p>
          <p className="text-2xl font-bold text-stone-100 tabular-nums">{allItems.length}</p>
          <p className="text-xs text-stone-500 mt-1">
            {engineering.stars.length} stars, {engineering.dogs.length} dogs
          </p>
        </div>
      </div>

      {/* Boston Matrix */}
      <div>
        <h2 className="text-lg font-semibold text-stone-200 mb-3">Menu Engineering Matrix</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuadrantCard
            title="Stars"
            description="High popularity, high profit. Promote and protect."
            items={engineering.stars}
            color="emerald"
          />
          <QuadrantCard
            title="Puzzles"
            description="Low popularity, high profit. Promote harder or reposition."
            items={engineering.puzzles}
            color="sky"
          />
          <QuadrantCard
            title="Plowhorses"
            description="High popularity, low profit. Re-engineer cost or raise price."
            items={engineering.plowhorses}
            color="amber"
          />
          <QuadrantCard
            title="Dogs"
            description="Low popularity, low profit. Consider removing or reworking."
            items={engineering.dogs}
            color="stone"
          />
        </div>
      </div>

      {/* Full Item Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Items</CardTitle>
        </CardHeader>
        <CardContent>
          {allItems.length === 0 ? (
            <p className="text-sm text-stone-500">
              No sales data yet. Record sales from the Service Day page to see analytics.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-500 text-xs uppercase">
                    <th className="text-left py-2 font-medium">Item</th>
                    <th className="text-left py-2 font-medium">Category</th>
                    <th className="text-right py-2 font-medium">Sold</th>
                    <th className="text-right py-2 font-medium">Avg/Day</th>
                    <th className="text-right py-2 font-medium">Revenue</th>
                    <th className="text-right py-2 font-medium">Food Cost</th>
                    <th className="text-right py-2 font-medium">Profit/Unit</th>
                    <th className="text-right py-2 font-medium">Waste</th>
                    <th className="text-right py-2 font-medium">Ticket Time</th>
                    <th className="text-right py-2 font-medium">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.map((item) => (
                    <tr
                      key={item.menu_item_id}
                      className="border-b border-stone-900 hover:bg-stone-900/30"
                    >
                      <td className="py-2 text-stone-200 font-medium">{item.item_name}</td>
                      <td className="py-2 text-stone-400">{item.category || '-'}</td>
                      <td className="py-2 text-right text-stone-300 tabular-nums">
                        {item.total_sold}
                      </td>
                      <td className="py-2 text-right text-stone-400 tabular-nums">
                        {item.avg_daily_sold}
                      </td>
                      <td className="py-2 text-right text-stone-300 tabular-nums">
                        {formatCurrency(item.total_revenue_cents)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {item.food_cost_pct != null ? (
                          <span
                            className={
                              item.food_cost_pct <= 30
                                ? 'text-emerald-400'
                                : item.food_cost_pct <= 35
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                            }
                          >
                            {item.food_cost_pct}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {item.profit_per_unit_cents != null ? (
                          <span
                            className={
                              item.profit_per_unit_cents > 0 ? 'text-emerald-400' : 'text-red-400'
                            }
                          >
                            {formatCurrency(item.profit_per_unit_cents)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 text-right text-stone-400 tabular-nums">
                        {item.total_waste_qty > 0 ? (
                          <span className="text-amber-400">{item.total_waste_qty}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 text-right text-stone-400 tabular-nums">
                        {item.avg_ticket_time_minutes ? `${item.avg_ticket_time_minutes}m` : '-'}
                      </td>
                      <td className="py-2 text-right text-stone-500 tabular-nums">
                        {item.days_on_menu}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
