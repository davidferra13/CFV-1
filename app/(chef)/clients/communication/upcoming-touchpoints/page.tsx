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
import { format, differenceInDays } from 'date-fns'

export const metadata: Metadata = { title: 'Upcoming Touchpoints - ChefFlow' }

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-teal-900 text-teal-700',
  paid: 'bg-emerald-900 text-emerald-700',
  in_progress: 'bg-blue-900 text-blue-700',
  accepted: 'bg-sky-900 text-sky-700',
  proposed: 'bg-amber-900 text-amber-700',
  draft: 'bg-stone-800 text-stone-400',
}

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000

export default async function UpcomingTouchpointsPage() {
  await requireChef()
  const events = await getEvents()

  const now = new Date()
  const upcoming = events
    .filter((e: any) => {
      const eventDate = new Date(e.event_date)
      return (
        eventDate >= now &&
        eventDate.getTime() - now.getTime() <= SIXTY_DAYS_MS &&
        !['completed', 'cancelled'].includes(e.status)
      )
    })
    .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

  const thisWeek = upcoming.filter((e: any) => differenceInDays(new Date(e.event_date), now) <= 7)
  const thisMonth = upcoming.filter((e: any) => {
    const d = differenceInDays(new Date(e.event_date), now)
    return d > 7 && d <= 30
  })
  const next60 = upcoming.filter((e: any) => differenceInDays(new Date(e.event_date), now) > 30)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/communication" className="text-sm text-stone-500 hover:text-stone-300">
          ← Communication
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Upcoming Touchpoints</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {upcoming.length} in next 60 days
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Scheduled events in the next 60 days - planned client touchpoints
        </p>
      </div>

      {upcoming.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-red-600">{thisWeek.length}</p>
            <p className="text-sm text-stone-500 mt-1">This week</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-700">{thisMonth.length}</p>
            <p className="text-sm text-stone-500 mt-1">This month</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-400">{next60.length}</p>
            <p className="text-sm text-stone-500 mt-1">Next 30–60 days</p>
          </Card>
        </div>
      )}

      {upcoming.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No upcoming events in the next 60 days</p>
          <p className="text-stone-400 text-sm">
            Confirmed and accepted events will appear here as your schedule fills up
          </p>
          <Link
            href="/events/upcoming"
            className="text-sm text-brand-600 hover:underline mt-2 block"
          >
            View all upcoming events
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Days Away</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.map((event: any) => {
                const daysAway = differenceInDays(new Date(event.event_date), now)
                const urgencyClass =
                  daysAway <= 7
                    ? 'text-red-600 font-semibold'
                    : daysAway <= 14
                      ? 'text-amber-700'
                      : 'text-stone-400'
                return (
                  <TableRow key={event.id}>
                    <TableCell className="text-stone-400 text-sm whitespace-nowrap">
                      {format(new Date(event.event_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className={`text-sm ${urgencyClass}`}>
                      {daysAway === 0 ? 'Today' : `${daysAway}d`}
                    </TableCell>
                    <TableCell className="font-medium">
                      {event.client ? (
                        <Link
                          href={`/clients/${event.client.id}`}
                          className="text-brand-600 hover:text-brand-300 hover:underline"
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
                      {event.guest_count ?? '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[event.status] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {event.status.replace(/_/g, ' ')}
                      </span>
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
