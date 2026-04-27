import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getExpenses } from '@/lib/expenses/actions'
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
import { Megaphone } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Marketing Expenses' }

export default async function MarketingExpensesPage() {
  await requireChef()
  const allExpenses = await getExpenses()

  const expenses = allExpenses.filter((e: any) => e.category === 'marketing')
  const totalSpend = expenses.reduce((s: any, e: any) => s + e.amount_cents, 0)

  const vendorTotals = expenses.reduce((acc: any, e: any) => {
    const key = e.vendor_name ?? 'Unknown'
    acc[key] = (acc[key] ?? 0) + e.amount_cents
    return acc
  }, {})
  const topVendor = Object.entries(vendorTotals).sort((a: any, b: any) => b[1] - a[1])[0]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/expenses" className="text-sm text-stone-500 hover:text-stone-300">
          ← Expenses
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Marketing</h1>
          <span className="bg-pink-900 text-pink-700 text-sm px-2 py-0.5 rounded-full">
            {expenses.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Advertising and marketing spend</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpend)}</p>
          <p className="text-sm text-stone-500 mt-1">Total marketing spend</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{expenses.length}</p>
          <p className="text-sm text-stone-500 mt-1">Marketing expenses</p>
        </Card>
        <Card className="p-4">
          <p className="text-lg font-bold text-stone-100 truncate">
            {topVendor ? topVendor[0] : '-'}
          </p>
          <p className="text-sm text-stone-500 mt-1">
            {topVendor ? `Top vendor (${formatCurrency(topVendor[1] as number)})` : 'No vendors'}
          </p>
        </Card>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Megaphone className="mx-auto h-12 w-12 mb-4 text-stone-500" />
          <p className="text-lg font-medium text-stone-300">No marketing expenses yet</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Track advertising spend, social media promotions, and other marketing costs here.
          </p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
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
