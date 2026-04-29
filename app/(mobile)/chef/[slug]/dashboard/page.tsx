import type { Metadata } from 'next'
import Link from 'next/link'
import { getMobileChefDashboardData } from '@/lib/mobile/mobile-service'
import { MobileNavigation } from '@/components/mobile/mobile-navigation'

export const metadata: Metadata = { title: 'Chef Mobile Dashboard' }

const RUN_MODE_STATUSES = new Set(['confirmed', 'in_progress'])

interface MobileChefDashboardPageProps {
  params: {
    slug: string
  }
}

export default async function MobileChefDashboardPage({ params }: MobileChefDashboardPageProps) {
  const data = await getMobileChefDashboardData(params.slug)

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <MobileNavigation
        items={[
          { href: `/mobile/chef/${params.slug}/dashboard`, label: 'Dashboard' },
          { href: '/schedule', label: 'Calendar' },
          { href: '/events', label: 'Events' },
          { href: '/notifications', label: 'Alerts' },
        ]}
      />

      <div className="space-y-4 p-4">
        <h1 className="text-xl font-semibold">Chef Dashboard</h1>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-stone-700 bg-stone-900 p-3">
            <p className="text-xs text-stone-400">Unread</p>
            <p className="text-lg font-semibold">{data.metrics.unreadNotifications}</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900 p-3">
            <p className="text-xs text-stone-400">Upcoming</p>
            <p className="text-lg font-semibold">{data.metrics.upcomingEventCount}</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900 p-3">
            <p className="text-xs text-stone-400">Confirmed</p>
            <p className="text-lg font-semibold">{data.metrics.confirmedEventCount}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-stone-300">Upcoming events</h2>
          {data.upcomingEvents.length === 0 ? (
            <p className="rounded-lg border border-stone-700 bg-stone-900 p-3 text-sm text-stone-400">
              No upcoming events.
            </p>
          ) : (
            data.upcomingEvents.map((event) => {
              const canRun = RUN_MODE_STATUSES.has(event.status)

              return (
                <div key={event.id} className="rounded-lg border border-stone-700 bg-stone-900 p-3">
                  <p className="text-sm font-medium text-stone-100">{event.occasion || 'Event'}</p>
                  <p className="text-xs text-stone-400">
                    {event.eventDate} {event.serveTime ? `| ${event.serveTime}` : ''} |{' '}
                    {event.clientName || 'Client'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {canRun && (
                      <Link
                        href={`/events/${event.id}/dop/mobile`}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white"
                      >
                        Run
                      </Link>
                    )}
                    <Link
                      href={`/events/${event.id}`}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-stone-600 px-3 text-sm font-medium text-stone-200"
                    >
                      View
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
