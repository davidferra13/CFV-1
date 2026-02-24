import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { getLedgerEntries } from '@/lib/ledger/actions'
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

export const metadata: Metadata = { title: 'Reconciliation - ChefFlow' }

export default async function ReconciliationPage() {
  await requireChef()

  const [events, paymentEntries, depositEntries, installmentEntries, finalEntries] =
    await Promise.all([
      getEvents(),
      getLedgerEntries({ entryType: 'payment' }),
      getLedgerEntries({ entryType: 'deposit' }),
      getLedgerEntries({ entryType: 'installment' }),
      getLedgerEntries({ entryType: 'final_payment' }),
    ])

  // Build a map of total payments per event
  const paymentsByEvent = new Map<string, number>()
  for (const entry of [
    ...paymentEntries,
    ...depositEntries,
    ...installmentEntries,
    ...finalEntries,
  ]) {
    if (entry.event_id) {
      paymentsByEvent.set(
        entry.event_id,
        (paymentsByEvent.get(entry.event_id) ?? 0) + entry.amount_cents
      )
    }
  }

  // Paid-state events with their invoice value vs recorded payments
  const paidEvents = events.filter((e) =>
    ['paid', 'confirmed', 'in_progress', 'completed'].includes(e.status)
  )

  const reconciled = paidEvents.filter((e) => {
    const recorded = paymentsByEvent.get(e.id) ?? 0
    const invoiced = e.quoted_price_cents ?? 0
    return recorded >= invoiced
  })

  const partial = paidEvents.filter((e) => {
    const recorded = paymentsByEvent.get(e.id) ?? 0
    const invoiced = e.quoted_price_cents ?? 0
    return recorded > 0 && recorded < invoiced
  })

  const unrecorded = paidEvents.filter((e) => !paymentsByEvent.has(e.id))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payouts" className="text-sm text-stone-500 hover:text-stone-300">
          ← Payouts
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Reconciliation</h1>
        <p className="text-stone-500 mt-1">
          Compare event invoice values against recorded ledger payments
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-green-950 border-green-200">
          <p className="text-2xl font-bold text-green-700">{reconciled.length}</p>
          <p className="text-sm text-emerald-600 mt-1">Fully reconciled</p>
        </Card>
        <Card className="p-4 bg-amber-950 border-amber-200">
          <p className="text-2xl font-bold text-amber-700">{partial.length}</p>
          <p className="text-sm text-amber-600 mt-1">Partially recorded</p>
        </Card>
        <Card className="p-4 bg-stone-800 border-stone-700">
          <p className="text-2xl font-bold text-stone-400">{unrecorded.length}</p>
          <p className="text-sm text-stone-500 mt-1">No ledger entry yet</p>
        </Card>
      </div>

      {unrecorded.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-stone-100">No Payment Recorded</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Occasion</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Gap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unrecorded.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-stone-400 text-sm">
                      {format(new Date(event.event_date), 'MMM d, yyyy')}
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
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm capitalize">
                      {event.occasion?.replace(/_/g, ' ') ?? '—'}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 capitalize">
                        {event.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-100 font-semibold text-sm">
                      {formatCurrency(event.quoted_price_cents ?? 0)}
                    </TableCell>
                    <TableCell className="text-stone-500 text-sm">—</TableCell>
                    <TableCell className="text-red-600 font-semibold text-sm">
                      {formatCurrency(event.quoted_price_cents ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {partial.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-stone-100">Partially Recorded</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Gap</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partial.map((event) => {
                  const recorded = paymentsByEvent.get(event.id) ?? 0
                  const invoiced = event.quoted_price_cents ?? 0
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="text-stone-400 text-sm">
                        {format(new Date(event.event_date), 'MMM d, yyyy')}
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
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-stone-100 font-semibold text-sm">
                        {formatCurrency(invoiced)}
                      </TableCell>
                      <TableCell className="text-green-700 font-semibold text-sm">
                        {formatCurrency(recorded)}
                      </TableCell>
                      <TableCell className="text-amber-700 font-semibold text-sm">
                        {formatCurrency(invoiced - recorded)}
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
        </>
      )}

      {reconciled.length > 0 && partial.length === 0 && unrecorded.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-emerald-600 font-medium text-lg">
            All paid events are fully reconciled
          </p>
          <p className="text-stone-400 text-sm mt-1">
            Ledger entries match invoice values for all {reconciled.length} paid events
          </p>
        </Card>
      )}
    </div>
  )
}
