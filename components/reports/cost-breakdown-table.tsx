// Cost Breakdown Table - Category breakdown with variance highlighting

import type { CategoryCostSummary } from '@/lib/reports/event-cost-report'

interface CostBreakdownTableProps {
  categories: CategoryCostSummary[]
  totalActualCents: number
  quotedTotalCents: number
}

function cents(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  return `${sign}$${(abs / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CostBreakdownTable({
  categories,
  totalActualCents,
  quotedTotalCents,
}: CostBreakdownTableProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-stone-200 mb-3 print:text-stone-800">
        Cost Breakdown
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 print:border-stone-300 text-left">
              <th className="py-2 text-stone-400 print:text-stone-500 font-medium">Category</th>
              <th className="py-2 text-right text-stone-400 print:text-stone-500 font-medium">
                Budgeted
              </th>
              <th className="py-2 text-right text-stone-400 print:text-stone-500 font-medium">
                Actual
              </th>
              <th className="py-2 text-right text-stone-400 print:text-stone-500 font-medium">
                Variance
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const overBudget = cat.varianceCents != null && cat.varianceCents > 0
              return (
                <tr
                  key={cat.category}
                  className="border-b border-stone-800 print:border-stone-200"
                >
                  <td className="py-2 text-stone-200 print:text-stone-800">
                    {cat.label}
                    <span className="text-stone-500 ml-1 text-xs">({cat.itemCount})</span>
                  </td>
                  <td className="py-2 text-right text-stone-300 print:text-stone-700">
                    {cat.budgetedCents != null ? cents(cat.budgetedCents) : '-'}
                  </td>
                  <td className="py-2 text-right text-stone-200 print:text-stone-800 font-medium">
                    {cents(cat.actualCents)}
                  </td>
                  <td
                    className={`py-2 text-right font-medium ${
                      cat.varianceCents == null
                        ? 'text-stone-500'
                        : overBudget
                          ? 'text-red-400 print:text-red-600'
                          : 'text-green-400 print:text-green-600'
                    }`}
                  >
                    {cat.varianceCents != null ? (
                      <>
                        {overBudget ? '+' : ''}
                        {cents(cat.varianceCents)}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-stone-600 print:border-stone-400 font-semibold">
              <td className="py-3 text-stone-100 print:text-stone-900">Total</td>
              <td className="py-3 text-right text-stone-300 print:text-stone-700">
                {quotedTotalCents > 0 ? cents(quotedTotalCents) : '-'}
              </td>
              <td className="py-3 text-right text-stone-100 print:text-stone-900">
                {cents(totalActualCents)}
              </td>
              <td
                className={`py-3 text-right ${
                  quotedTotalCents > 0
                    ? totalActualCents > quotedTotalCents
                      ? 'text-red-400 print:text-red-600'
                      : 'text-green-400 print:text-green-600'
                    : 'text-stone-500'
                }`}
              >
                {quotedTotalCents > 0
                  ? `${totalActualCents > quotedTotalCents ? '+' : ''}${cents(totalActualCents - quotedTotalCents)}`
                  : '-'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
