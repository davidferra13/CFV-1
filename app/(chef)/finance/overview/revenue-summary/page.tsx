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
import { format } from 'date-fns'
import { ErrorState } from '@/components/ui/error-state'
import { FadeIn } from '@/components/ui/fade-in'

export const metadata: Metadata = { title: 'Revenue Summary' }

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-900 text-green-700',
  confirmed: 'bg-teal-900 text-teal-700',
  paid: 'bg-emerald-900 text-emerald-700',
  in_progress: 'bg-brand-900 text-brand-700',
}

export default async function RevenueSummaryPage() {
  await requireChef()

  let events
  try {
    events = await getEvents()
  } catch (err) {
    console.error('[RevenueSummary] Failed to load events:', err)
    return (
      <div className="space-y-6">
        <div>
          <Link href="/finance/overview" className="text-sm text-stone-500 hover:text-stone-300">
            ← Overview
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Revenue Summary</h1>
        </div>
        <ErrorState
          title="Could not load revenue data"
          description="Event data failed to load. Try refreshing the page."
          size="lg"
        />
      </div>
    )
  }

  const revenueEvents = events
    .filter((e: any) => ['paid', 'confirmed', 'in_progress', 'completed'].includes(e.status))
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const totalRevenue = revenueEvents.reduce(
    (sum: any, e: any) => sum + (e.quoted_price_cents ?? 0),
    0
  )
  const completedRevenue = revenueEvents
    .filter((e: any) => e.status === 'completed')
    .reduce((sum: any, e: any) => sum + (e.quoted_price_cents ?? 0), 0)

  return (
    <FadeIn as="div" className="space-y-6">
      <div>
        <Link href="/finance/overview" className="text-sm text-stone-500 hover:text-stone-300">
          ← Overview
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Revenue Summary</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {revenueEvents.length} events
          </span>
        </div>
        <p className="text-stone-500 mt-1">Revenue from confirmed and completed events</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">Total quoted revenue</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(completedRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">From completed events</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-700">
            {revenueEvents.length > 0
              ? formatCurrency(Math.round(totalRevenue / revenueEvents.length))
              : formatCurrency(0)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Average per event</p>
        </Card>
      </div>

      {revenueEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No revenue events yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Revenue appears here once events are accepted or completed
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Attribution</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueEvents.map((event: any) => (
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
                  <TableCell className="text-stone-400 text-sm">
                    {event.partner_location ? (
                      <div>
                        <p className="font-medium text-stone-200">{event.partner_location.name}</p>
                        <p className="text-xs text-stone-500">
                          {event.referral_partner?.name || 'Partner attribution'}
                        </p>
                      </div>
                    ) : event.referral_partner ? (
                      event.referral_partner.name
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {event.guest_count ?? '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[event.status] ?? 'bg-stone-800 text-stone-400'}`}
                    >
                      {event.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-stone-100 text-sm">
                    {event.quoted_price_cents != null
                      ? formatCurrency(event.quoted_price_cents)
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </FadeIn>
  )
}
