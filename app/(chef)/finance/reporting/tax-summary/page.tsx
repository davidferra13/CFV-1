import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { computeProfitAndLoss } from '@/lib/ledger/compute'
import { getExpenses } from '@/lib/expenses/actions'
import { EXPENSE_CATEGORIES } from '@/lib/constants/expense-categories'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Tax Summary' }

export default async function TaxSummaryPage() {
  await requireChef()

  const currentYear = new Date().getFullYear()
  const yearStart = `${new Date().getFullYear()}-01-01`

  const [pnl, allExpenses] = await Promise.all([
    computeProfitAndLoss(currentYear),
    getExpenses({ start_date: yearStart, is_business: true }),
  ])

  // Group by category
  const categoryTotals = new Map<string, number>()
  for (const expense of allExpenses) {
    categoryTotals.set(
      expense.category,
      (categoryTotals.get(expense.category) ?? 0) + expense.amount_cents
    )
  }

  const sortedCategories = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])

  const totalBusinessExpenses = allExpenses.reduce((s: any, e: any) => s + e.amount_cents, 0)
  const estimatedProfit = pnl.netRevenueCents - totalBusinessExpenses

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          ← Reporting
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Tax Summary {currentYear}</h1>
        <p className="text-stone-500 mt-1">
          Business income and deductible expense summary - consult your CPA for tax advice
        </p>
      </div>

      <Card className="p-4 bg-amber-950 border-amber-200">
        <p className="text-sm font-medium text-amber-800">Important disclaimer</p>
        <p className="text-sm text-amber-700 mt-1">
          This summary is for informational purposes only. ChefFlow does not provide tax advice.
          Consult a qualified CPA or tax professional before filing. Deductibility depends on your
          jurisdiction and business structure.
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(pnl.totalRevenueCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Gross income ({currentYear})</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalBusinessExpenses)}</p>
          <p className="text-sm text-stone-500 mt-1">Business expenses ({currentYear})</p>
        </Card>
        <Card className="p-4">
          <p
            className={`text-2xl font-bold ${estimatedProfit >= 0 ? 'text-stone-100' : 'text-red-600'}`}
          >
            {formatCurrency(estimatedProfit)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Est. net income</p>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-stone-100 mb-3">
          Business Expense Breakdown ({currentYear})
        </h2>

        {sortedCategories.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-stone-400 font-medium">
              No business expenses recorded for {currentYear}
            </p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Entries</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCategories.map(([cat, total]) => (
                  <TableRow key={cat}>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]?.color ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]?.label ?? cat}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {allExpenses.filter((e: any) => e.category === cat).length}
                    </TableCell>
                    <TableCell className="text-stone-100 font-semibold text-sm">
                      {formatCurrency(total)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-stone-700">
                  <TableCell className="font-bold text-stone-100">Total</TableCell>
                  <TableCell className="text-stone-400 text-sm">{allExpenses.length}</TableCell>
                  <TableCell className="font-bold text-red-600">
                    {formatCurrency(totalBusinessExpenses)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}
