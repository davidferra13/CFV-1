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

export const metadata: Metadata = { title: 'Software Expenses - ChefFlow' }

export default async function SoftwareExpensesPage() {
  await requireChef()
  const allExpenses = await getExpenses()

  const expenses = allExpenses.filter((e: any) => e.category === 'subscriptions')
  const totalSpend = expenses.reduce((s: any, e: any) => s + e.amount_cents, 0)

  const vendorTotals = expenses.reduce<Record<string, number>>((acc: any, e: any) => {
    const key = e.vendor_name ?? 'Unknown'
    acc[key] = (acc[key] ?? 0) + e.amount_cents
    return acc
  }, {})
  const uniqueVendors = Object.keys(vendorTotals).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/expenses" className="text-sm text-stone-500 hover:text-stone-300">
          ← Expenses
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Software &amp; Subscriptions</h1>
          <span className="bg-violet-900 text-violet-700 text-sm px-2 py-0.5 rounded-full">
            {expenses.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">SaaS subscriptions and software tools</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpend)}</p>
          <p className="text-sm text-stone-500 mt-1">Total software spend</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{expenses.length}</p>
          <p className="text-sm text-stone-500 mt-1">Subscription entries</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-violet-700">{uniqueVendors}</p>
          <p className="text-sm text-stone-500 mt-1">Unique vendors</p>
        </Card>
      </div>

      {uniqueVendors > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-stone-300 mb-3">By Vendor</h2>
          <div className="space-y-2">
            {Object.entries(vendorTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([vendor, total]) => (
                <div
                  key={vendor}
                  className="flex items-center justify-between py-1 border-b border-stone-50 last:border-0"
                >
                  <span className="text-sm text-stone-300">{vendor}</span>
                  <span className="text-sm font-semibold text-stone-100">
                    {formatCurrency(total)}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {expenses.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No software expenses recorded</p>
        </Card>
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
                    {expense.vendor_name ?? '—'}
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
