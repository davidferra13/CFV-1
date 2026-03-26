// Chef Expense Overview Page
// Shows expense summary and filterable list

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getExpenses } from '@/lib/expenses/actions'

export const metadata: Metadata = { title: 'Expenses - ChefFlow' }
import { getMonthlyFinancialSummary } from '@/lib/expenses/actions'
import { Button } from '@/components/ui/button'
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
import {
  EXPENSE_CATEGORY_GROUPS,
  getCategoryLabel,
  getCategoryColor,
} from '@/lib/constants/expense-categories'
import { ExpensesExportButton } from '@/components/exports/expenses-export-button'
import { format } from 'date-fns'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { category?: string; event_id?: string; business?: string }
}) {
  await requireChef()

  const now = new Date()
  const [expenses, monthlySummary] = await Promise.all([
    getExpenses({
      category: searchParams.category,
      event_id: searchParams.event_id,
      is_business:
        searchParams.business === 'true'
          ? true
          : searchParams.business === 'false'
            ? false
            : undefined,
    }),
    getMonthlyFinancialSummary(now.getFullYear(), now.getMonth() + 1),
  ])

  // Group expenses by event
  const grouped = new Map<
    string,
    { occasion: string; eventDate: string; clientName: string; expenses: typeof expenses }
  >()
  const ungrouped: typeof expenses = []

  for (const exp of expenses) {
    const event = (exp as any).event
    if (event && exp.event_id) {
      if (!grouped.has(exp.event_id)) {
        grouped.set(exp.event_id, {
          occasion: event.occasion || 'Untitled',
          eventDate: event.event_date,
          clientName: event.client?.full_name || 'Unknown',
          expenses: [],
        })
      }
      grouped.get(exp.event_id)!.expenses.push(exp)
    } else {
      ungrouped.push(exp)
    }
  }

  // Compute category totals for this month
  const categoryTotals: Record<string, number> = {}
  let totalThisMonth = 0
  for (const exp of expenses) {
    if (exp.is_business) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount_cents
      totalThisMonth += exp.amount_cents
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-stone-100">Expenses</h1>
        <div className="flex gap-2">
          <ExpensesExportButton
            filters={{
              category: searchParams.category,
              event_id: searchParams.event_id,
              is_business:
                searchParams.business === 'true'
                  ? true
                  : searchParams.business === 'false'
                    ? false
                    : undefined,
            }}
          />
          <Link href="/expenses/new?mode=scan">
            <Button variant="secondary">Scan Receipt</Button>
          </Link>
          <Link href="/expenses/new">
            <Button>Add Expense</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm font-medium text-stone-500">This Month</p>
          <p className="text-2xl font-bold text-stone-100 mt-1">{formatCurrency(totalThisMonth)}</p>
          <p className="text-xs text-stone-500 mt-1">Business expenses only</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium text-stone-500">Monthly Revenue</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatCurrency(monthlySummary.totalRevenueCents)}
          </p>
          <p className="text-xs text-stone-500 mt-1">{monthlySummary.eventCount} events</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium text-stone-500">Monthly Profit</p>
          <p className="text-2xl font-bold text-stone-100 mt-1">
            {formatCurrency(monthlySummary.totalProfitCents)}
          </p>
          <p className="text-xs text-stone-500 mt-1">After business expenses</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium text-stone-500">Avg Food Cost</p>
          <p className="text-2xl font-bold text-stone-100 mt-1">
            {monthlySummary.averageFoodCostPercent}%
          </p>
          <p className="text-xs text-stone-500 mt-1">Across tracked events</p>
        </Card>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-medium text-stone-500 mb-3">By Category</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(categoryTotals)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, total]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(cat)}`}
                  >
                    {getCategoryLabel(cat)}
                  </span>
                  <span className="text-sm font-medium text-stone-300">
                    {formatCurrency(total)}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Filter Bar - Grouped */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <Link href="/expenses">
            <Button variant={!searchParams.category ? 'primary' : 'secondary'} size="sm">
              All
            </Button>
          </Link>
        </div>
        {EXPENSE_CATEGORY_GROUPS.map((group) => (
          <div
            key={group.label}
            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"
          >
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider sm:w-32 shrink-0">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {group.categories.map((cat) => (
                <Link key={cat.value} href={`/expenses?category=${cat.value}`}>
                  <Button
                    variant={searchParams.category === cat.value ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    {cat.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Expense Table */}
      {expenses.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-stone-500">No expenses recorded yet.</p>
          <Link
            href="/expenses/new"
            className="text-brand-600 hover:underline text-sm mt-2 inline-block"
          >
            Add your first expense
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense: any) => {
                const event = (expense as any).event
                return (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.expense_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {event ? (
                        <Link
                          href={`/events/${expense.event_id}`}
                          className="text-brand-600 hover:underline"
                        >
                          {event.occasion || 'Untitled'}
                        </Link>
                      ) : (
                        <span className="text-stone-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{expense.description}</span>
                        {expense.vendor_name && (
                          <span className="text-stone-500 text-xs ml-1">
                            at {expense.vendor_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(expense.category)}`}
                      >
                        {getCategoryLabel(expense.category)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(expense.amount_cents)}
                    </TableCell>
                    <TableCell>
                      {expense.is_business ? (
                        <span className="text-xs text-stone-400">Business</span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">Personal</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/expenses/${expense.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
