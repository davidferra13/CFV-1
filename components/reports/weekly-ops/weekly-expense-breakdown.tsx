import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { WeeklyOpsExpenseCategory } from '@/lib/reports/weekly-ops'

export function WeeklyExpenseBreakdown({
  categories,
  totalCents,
}: {
  categories: WeeklyOpsExpenseCategory[]
  totalCents: number
}) {
  if (categories.length === 0) {
    return (
      <Card className="print:shadow-none print:border-stone-300">
        <CardHeader>
          <CardTitle className="text-base print:text-stone-900">Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">No expenses logged this week.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="print:shadow-none print:border-stone-300">
      <CardHeader>
        <CardTitle className="text-base print:text-stone-900">Expense Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((cat) => {
          const pct = totalCents > 0 ? Math.round((cat.totalCents / totalCents) * 100) : 0
          return (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-stone-300 print:text-stone-700 capitalize">
                  {cat.category.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-500">{cat.count} items</span>
                  <span className="text-sm font-medium text-stone-200 print:text-stone-800">
                    {formatCurrency(cat.totalCents)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-stone-800 print:bg-stone-200 rounded-full h-2">
                <div
                  className="bg-brand-500 print:bg-stone-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
            </div>
          )
        })}
        <div className="pt-2 border-t border-stone-800 print:border-stone-300 flex justify-between">
          <span className="text-sm font-semibold text-stone-300 print:text-stone-700">Total</span>
          <span className="text-sm font-bold text-stone-100 print:text-stone-900">
            {formatCurrency(totalCents)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
