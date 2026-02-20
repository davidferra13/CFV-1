import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getExpenses } from '@/lib/expenses/actions'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_GROUPS } from '@/lib/constants/expense-categories'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Expense by Category - ChefFlow' }

export default async function ExpenseByCategoryPage() {
  await requireChef()
  const expenses = await getExpenses()

  const totalSpend = expenses.reduce((s, e) => s + e.amount_cents, 0)

  // Compute totals per category
  const categoryTotals = new Map<string, number>()
  for (const expense of expenses) {
    categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? 0) + expense.amount_cents)
  }

  // Group by category group
  const groupData = EXPENSE_CATEGORY_GROUPS.map(group => ({
    label: group.label,
    total: group.categories.reduce((s, c) => s + (categoryTotals.get(c.value) ?? 0), 0),
    categories: group.categories.map(c => ({
      value: c.value,
      label: c.label,
      color: c.color,
      total: categoryTotals.get(c.value) ?? 0,
      count: expenses.filter(e => e.category === c.value).length,
    })).filter(c => c.count > 0),
  })).filter(g => g.total > 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-700">← Reporting</Link>
        <h1 className="text-3xl font-bold text-stone-900 mt-1">Expense by Category</h1>
        <p className="text-stone-500 mt-1">Total spend broken down by expense category</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpend)}</p>
          <p className="text-sm text-stone-500 mt-1">Total spend ({expenses.length} entries)</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-900">{categoryTotals.size}</p>
          <p className="text-sm text-stone-500 mt-1">Active categories</p>
        </Card>
      </div>

      {groupData.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium">No expenses recorded</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupData.map(group => (
            <div key={group.label}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{group.label}</h2>
                <span className="text-sm font-bold text-stone-900">{formatCurrency(group.total)}</span>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>% of All Spend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.categories.sort((a, b) => b.total - a.total).map(cat => (
                      <TableRow key={cat.value}>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
                        </TableCell>
                        <TableCell className="text-stone-600 text-sm">{cat.count}</TableCell>
                        <TableCell className="text-stone-900 font-semibold text-sm">{formatCurrency(cat.total)}</TableCell>
                        <TableCell className="text-stone-500 text-sm">
                          {totalSpend > 0 ? `${Math.round((cat.total / totalSpend) * 100)}%` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
