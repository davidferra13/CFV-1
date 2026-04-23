import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
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

export const metadata: Metadata = { title: 'Profit by Event' }

export default async function ProfitByEventPage() {
  await requireChef()

  const [events, expenses] = await Promise.all([getEvents(), getExpenses()])

  // Build expense total per event
  const expensesByEvent = new Map<string, number>()
  for (const expense of expenses) {
    if (expense.event_id) {
      expensesByEvent.set(
        expense.event_id,
        (expensesByEvent.get(expense.event_id) ?? 0) + expense.amount_cents
      )
    }
  }

  const rows = events
    .filter((e: any) => (e.quoted_price_cents ?? 0) > 0 || expensesByEvent.has(e.id))
    .map((e: any) => ({
      ...e,
      revenue: e.quoted_price_cents ?? 0,
      directExpenses: expensesByEvent.get(e.id) ?? 0,
      profit: (e.quoted_price_cents ?? 0) - (expensesByEvent.get(e.id) ?? 0),
    }))
    .sort((a: any, b: any) => b.profit - a.profit)

  const totalRevenue = rows.reduce((s: any, r: any) => s + r.revenue, 0)
  const totalExpenses = rows.reduce((s: any, r: any) => s + r.directExpenses, 0)
  const totalProfit = rows.reduce((s: any, r: any) => s + r.profit, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          ← Reporting
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Profit by Event</h1>
        <p className="text-stone-500 mt-1">
          Invoice revenue minus directly linked expense entries per event
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">Total invoiced</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          <p className="text-sm text-stone-500 mt-1">Direct event expenses</p>
        </Card>
        <Card className="p-4">
          <p
            className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-stone-100' : 'text-red-600'}`}
          >
            {formatCurrency(totalProfit)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Net profit</p>
        </Card>
      </div>

      <p className="text-xs text-stone-400">
        Note: Only expenses directly linked to an event are included in this calculation. Overhead
        expenses (software, insurance, etc.) appear in the expense reports.
      </p>

      {rows.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No events with revenue data</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Invoiced</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row: any) => {
                const margin =
                  row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : null
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-stone-400 text-sm">
                      {format(new Date(row.event_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.client ? (
                        <Link
                          href={`/clients/${row.client.id}`}
                          className="text-brand-600 hover:underline"
                        >
                          {row.client.full_name}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm capitalize">
                      {row.occasion?.replace(/_/g, ' ') ?? '-'}
                    </TableCell>
                    <TableCell className="text-green-700 font-semibold text-sm">
                      <Link href={`/events/${row.id}`} className="hover:underline">
                        {formatCurrency(row.revenue)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-red-600 text-sm">
                      {row.directExpenses > 0 ? formatCurrency(row.directExpenses) : '-'}
                    </TableCell>
                    <TableCell
                      className={`font-semibold text-sm ${row.profit >= 0 ? 'text-stone-100' : 'text-red-600'}`}
                    >
                      {formatCurrency(row.profit)}
                    </TableCell>
                    <TableCell className="text-stone-500 text-sm">
                      {margin !== null ? `${margin}%` : '-'}
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
