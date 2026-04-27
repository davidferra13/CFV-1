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
import { Car } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Travel Expenses' }

const CATEGORIES = ['gas_mileage', 'vehicle'] as const

export default async function TravelExpensesPage() {
  await requireChef()
  const allExpenses = await getExpenses()

  const expenses = allExpenses.filter((e: any) =>
    CATEGORIES.includes(e.category as (typeof CATEGORIES)[number])
  )

  const totalSpend = expenses.reduce((s: any, e: any) => s + e.amount_cents, 0)
  const mileageEntries = expenses.filter((e: any) => e.category === 'gas_mileage')
  const vehicleEntries = expenses.filter((e: any) => e.category === 'vehicle')
  const totalMiles = mileageEntries.reduce((s: any, e: any) => s + (e.mileage_miles ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/expenses" className="text-sm text-stone-500 hover:text-stone-300">
          ← Expenses
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Travel</h1>
          <span className="bg-brand-900 text-brand-700 text-sm px-2 py-0.5 rounded-full">
            {expenses.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Gas, mileage, and vehicle costs</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpend)}</p>
          <p className="text-sm text-stone-500 mt-1">Total travel costs</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">
            {formatCurrency(mileageEntries.reduce((s: any, e: any) => s + e.amount_cents, 0))}
          </p>
          <p className="text-sm text-stone-500 mt-1">Gas/mileage ({mileageEntries.length})</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">
            {formatCurrency(vehicleEntries.reduce((s: any, e: any) => s + e.amount_cents, 0))}
          </p>
          <p className="text-sm text-stone-500 mt-1">Vehicle ({vehicleEntries.length})</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-300">
            {totalMiles > 0 ? `${totalMiles.toFixed(0)} mi` : '-'}
          </p>
          <p className="text-sm text-stone-500 mt-1">Total miles logged</p>
        </Card>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Car className="mx-auto h-12 w-12 mb-4 text-stone-500" />
          <p className="text-lg font-medium text-stone-300">No travel expenses yet</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Track mileage, gas, and vehicle costs for event travel. These are tax-deductible business expenses.
          </p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Miles</TableHead>
                <TableHead>Event</TableHead>
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
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES]?.color ?? 'bg-stone-800 text-stone-400'}`}
                    >
                      {EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES]
                        ?.label ?? expense.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {expense.mileage_miles ? `${expense.mileage_miles} mi` : '-'}
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
