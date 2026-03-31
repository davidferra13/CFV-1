import type { Metadata } from 'next'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/currency'
import { getMobileClientEventsData } from '@/lib/mobile/mobile-service'
import { MobileNavigation } from '@/components/mobile/mobile-navigation'

export const metadata: Metadata = { title: 'Client Mobile Events' }

interface MobileClientEventsPageProps {
  params: {
    token: string
  }
}

export default async function MobileClientEventsPage({ params }: MobileClientEventsPageProps) {
  const data = await getMobileClientEventsData(params.token)

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <MobileNavigation
        items={[
          { href: `/mobile/client/${params.token}/events`, label: 'Events' },
          { href: '/my-events', label: 'Portal' },
          { href: '/my-profile', label: 'Profile' },
        ]}
      />

      <div className="space-y-4 p-4">
        <h1 className="text-xl font-semibold">My Events</h1>

        {data.events.length === 0 ? (
          <p className="rounded-lg border border-stone-700 bg-stone-900 p-3 text-sm text-stone-400">
            No events yet.
          </p>
        ) : (
          <div className="space-y-2">
            {data.events.map((event) => (
              <Link
                key={event.id}
                href={`/my-events/${event.id}`}
                className="block rounded-lg border border-stone-700 bg-stone-900 p-3"
              >
                <p className="text-sm font-medium text-stone-100">{event.occasion || 'Event'}</p>
                <p className="text-xs text-stone-400">
                  {event.eventDate} {event.serveTime ? `| ${event.serveTime}` : ''}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  {event.chefName || 'Chef'} | {event.status}
                  {typeof event.quotedPriceCents === 'number'
                    ? ` | ${formatCurrency(event.quotedPriceCents)}`
                    : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
