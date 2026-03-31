import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
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
import { format, startOfMonth, subMonths } from 'date-fns'

export const metadata: Metadata = { title: 'Cash Flow' }

export default async function CashFlowPage() {
  await requireChef()
  const now = new Date()
  const startDate = subMonths(startOfMonth(now), 11).toISOString()

  const [entries, expenses] = await Promise.all([
    getLedgerEntries({ startDate }),
    getExpenses({ start_date: startDate.split('T')[0] }),
  ])

  const months: { key: string; label: string; revenue: number; expenses: number; net: number }[] =
    []
  for (let i = 11; i >= 0; i--) {
    const month = subMonths(now, i)
    months.push({
      key: format(month, 'yyyy-MM'),
      label: format(month, 'MMM yyyy'),
      revenue: 0,
      expenses: 0,
      net: 0,
    })
  }

  for (const entry of entries) {
    const key = format(new Date(entry.created_at), 'yyyy-MM')
    const bucket = months.find((m) => m.key === key)
    if (!bucket) continue
    if (entry.is_refund || entry.entry_type === 'refund') {
      bucket.revenue -= Math.abs(entry.amount_cents)
    } else if (entry.entry_type !== 'tip') {
      bucket.revenue += entry.amount_cents
    }
  }

  for (const expense of expenses) {
    const key = format(new Date(expense.expense_date), 'yyyy-MM')
    const bucket = months.find((m) => m.key === key)
    if (bucket) bucket.expenses += expense.amount_cents
  }

  for (const bucket of months) {
    bucket.net = bucket.revenue - bucket.expenses
  }

  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0)
  const totalExpenses = months.reduce((s, m) => s + m.expenses, 0)
  const netCashFlow = totalRevenue - totalExpenses

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/overview" className="text-sm text-stone-500 hover:text-stone-300">
          ← Overview
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Cash Flow</h1>
        <p className="text-stone-500 mt-1">Revenue vs. expenses over the last 12 months</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">Total revenue (12 months)</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          <p className="text-sm text-stone-500 mt-1">Total expenses (12 months)</p>
        </Card>
        <Card className="p-4">
          <p
            className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-stone-100' : 'text-red-700'}`}
          >
            {formatCurrency(netCashFlow)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Net cash flow</p>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Expenses</TableHead>
              <TableHead>Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...months].reverse().map((m) => (
              <TableRow key={m.key}>
                <TableCell className="font-medium text-stone-300">{m.label}</TableCell>
                <TableCell className="text-green-700 text-sm">
                  {m.revenue > 0 ? formatCurrency(m.revenue) : '-'}
                </TableCell>
                <TableCell className="text-red-600 text-sm">
                  {m.expenses > 0 ? formatCurrency(m.expenses) : '-'}
                </TableCell>
                <TableCell
                  className={`text-sm font-semibold ${m.net > 0 ? 'text-stone-100' : m.net < 0 ? 'text-red-700' : 'text-stone-400'}`}
                >
                  {m.net !== 0 ? formatCurrency(m.net) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
