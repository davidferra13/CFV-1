import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
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
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Labor Expenses - ChefFlow' }

export default async function LaborExpensesPage() {
  await requireChef()
  const allExpenses = await getExpenses()

  const expenses = allExpenses.filter((e: any) => e.category === 'labor')
  const totalSpend = expenses.reduce((s: any, e: any) => s + e.amount_cents, 0)
  const eventLinked = expenses.filter((e: any) => e.event_id != null).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/expenses" className="text-sm text-stone-500 hover:text-stone-300">
          ← Expenses
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Labor</h1>
          <span className="bg-orange-900 text-orange-700 text-sm px-2 py-0.5 rounded-full">
            {expenses.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Staff and labor costs</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpend)}</p>
          <p className="text-sm text-stone-500 mt-1">Total labor costs</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{expenses.length}</p>
          <p className="text-sm text-stone-500 mt-1">Labor entries</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-400">{eventLinked}</p>
          <p className="text-sm text-stone-500 mt-1">Linked to events</p>
        </Card>
      </div>

      {expenses.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No labor expenses recorded</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor / Staff</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense: any) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-stone-500 text-sm">
                    {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-stone-100 text-sm">{expense.description}</TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {expense.vendor_name ?? '-'}
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {expense.event ? (
                      <Link
                        href={`/events/${expense.event.id}`}
                        className="text-brand-600 hover:underline capitalize"
                      >
                        {expense.event.occasion?.replace(/_/g, ' ') ?? 'Event'}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 capitalize">
                      {expense.payment_method.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-100 font-semibold text-sm">
                    {formatCurrency(expense.amount_cents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
