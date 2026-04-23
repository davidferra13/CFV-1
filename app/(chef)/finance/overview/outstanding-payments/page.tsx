import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { createServerClient } from '@/lib/db/server'
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
import { format, differenceInDays } from 'date-fns'

export const metadata: Metadata = { title: 'Outstanding Payments' }

export default async function OutstandingPaymentsPage() {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch events and financial summaries in parallel
  const [events, financialResult] = await Promise.all([
    getEvents(),
    db
      .from('event_financial_summary')
      .select('event_id, outstanding_balance_cents, total_paid_cents, quoted_price_cents')
      .eq('tenant_id', user.tenantId!)
      .gt('outstanding_balance_cents', 0),
  ])

  if (financialResult.error) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/finance/overview" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Overview
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Outstanding Payments</h1>
        </div>
        <Card className="p-6 text-center">
          <p className="text-red-500">Could not load outstanding payment data</p>
        </Card>
      </div>
    )
  }

  // Build a map of event_id -> outstanding balance
  const balanceMap = new Map<string, number>()
  for (const row of financialResult.data || []) {
    if (row.outstanding_balance_cents > 0) {
      balanceMap.set(row.event_id, row.outstanding_balance_cents)
    }
  }

  const now = new Date()
  const outstanding = events
    .filter((e: any) => balanceMap.has(e.id))
    .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

  const totalOutstanding = outstanding.reduce(
    (sum: number, e: any) => sum + (balanceMap.get(e.id) ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/overview" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Overview
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Outstanding Payments</h1>
          <span
            className={`text-sm px-2 py-0.5 rounded-full ${outstanding.length > 0 ? 'bg-amber-900 text-amber-700' : 'bg-stone-800 text-stone-400'}`}
          >
            {outstanding.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Events with remaining balance owed</p>
      </div>

      {outstanding.length > 0 && (
        <Card className="p-4 bg-amber-950 border-amber-200">
          <p className="text-2xl font-bold text-amber-900">{formatCurrency(totalOutstanding)}</p>
          <p className="text-sm text-amber-700 mt-1">
            Total outstanding across {outstanding.length} events
          </p>
        </Card>
      )}

      {outstanding.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No outstanding payments</p>
          <p className="text-stone-400 text-sm mt-1">All events are fully paid</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Date</TableHead>
                <TableHead>Days Since</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance Due</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outstanding.map((event: any) => {
                const daysOver = differenceInDays(now, new Date(event.event_date))
                const balance = balanceMap.get(event.id) ?? 0
                return (
                  <TableRow key={event.id}>
                    <TableCell className="text-stone-400 text-sm">
                      {format(new Date(event.event_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell
                      className={`text-sm font-semibold ${daysOver > 30 ? 'text-red-600' : 'text-amber-700'}`}
                    >
                      {daysOver}d
                    </TableCell>
                    <TableCell className="font-medium">
                      {event.client ? (
                        <Link
                          href={`/clients/${event.client.id}`}
                          className="text-brand-600 hover:underline"
                        >
                          {event.client.full_name}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm capitalize">
                      {event.occasion?.replace(/_/g, ' ') ?? '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 capitalize">
                        {event.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-100 font-semibold text-sm">
                      {formatCurrency(balance)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/events/${event.id}`}>
                        <span className="text-xs text-brand-600 hover:underline cursor-pointer">
                          View
                        </span>
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
