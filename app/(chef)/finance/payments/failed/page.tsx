import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
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

export const metadata: Metadata = { title: 'Failed Payments - ChefFlow' }

export default async function FailedPaymentsPage() {
  await requireChef()
  const events = await getEvents()

  const now = new Date()

  // Events in "accepted" state are awaiting payment - if past event date they're stalled
  const stalled = events
    .filter((e: any) => e.status === 'accepted')
    .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

  const pastDue = stalled.filter((e: any) => new Date(e.event_date) < now)
  const upcoming = stalled.filter((e: any) => new Date(e.event_date) >= now)

  const totalPastDueValue = pastDue.reduce((s: any, e: any) => s + (e.quoted_price_cents ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payments" className="text-sm text-stone-500 hover:text-stone-300">
          ← Payments
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Failed &amp; Pending Payments</h1>
          <span
            className={`text-sm px-2 py-0.5 rounded-full ${pastDue.length > 0 ? 'bg-amber-900 text-amber-700' : 'bg-stone-800 text-stone-400'}`}
          >
            {stalled.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Events in accepted state awaiting payment - past-due events may indicate stalled or failed
          payments
        </p>
      </div>

      <Card className="p-4 bg-amber-950 border-amber-200">
        <p className="text-sm text-amber-800 font-medium">Note on failed payments</p>
        <p className="text-sm text-amber-700 mt-1">
          ChefFlow records successful payment ledger entries only. For detailed Stripe failed charge
          data, check your <strong>Stripe Dashboard → Payments → Failed</strong>. Events listed here
          are in &quot;accepted&quot; state with no recorded payment yet.
        </p>
      </Card>

      {pastDue.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-stone-100">Past-Due</h2>
            <span className="bg-red-900 text-red-600 text-xs px-2 py-0.5 rounded-full">
              {pastDue.length}
            </span>
            <span className="text-sm text-stone-500">
              - event date passed, payment not recorded
            </span>
          </div>

          <Card className="p-4 bg-red-950 border-red-200">
            <p className="text-xl font-bold text-red-900">{formatCurrency(totalPastDueValue)}</p>
            <p className="text-sm text-red-700 mt-1">Value in past-due accepted events</p>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Days Past</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Occasion</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastDue.map((event: any) => {
                  const daysPast = differenceInDays(now, new Date(event.event_date))
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="text-stone-400 text-sm">
                        {format(new Date(event.event_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-red-600 font-semibold text-sm">
                        {daysPast}d
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
                      <TableCell className="text-stone-100 font-semibold text-sm">
                        {event.quoted_price_cents != null
                          ? formatCurrency(event.quoted_price_cents)
                          : '-'}
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

      {upcoming.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-stone-100">Upcoming - Awaiting Payment</h2>
            <span className="bg-amber-900 text-amber-700 text-xs px-2 py-0.5 rounded-full">
              {upcoming.length}
            </span>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Occasion</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((event: any) => (
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
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm capitalize">
                      {event.occasion?.replace(/_/g, ' ') ?? '-'}
                    </TableCell>
                    <TableCell className="text-stone-100 font-semibold text-sm">
                      {event.quoted_price_cents != null
                        ? formatCurrency(event.quoted_price_cents)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/events/${event.id}`}>
                        <span className="text-xs text-brand-600 hover:underline cursor-pointer">
                          View
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {stalled.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No stalled payments</p>
          <p className="text-stone-400 text-sm mt-1">All accepted events have recorded payments</p>
        </Card>
      )}
    </div>
  )
}
