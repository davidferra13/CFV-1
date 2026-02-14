// Chef Dashboard - Protected by layout

import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { getClients } from '@/lib/clients/actions'
import { getTenantFinancialSummary, formatCurrency } from '@/lib/ledger/compute'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function ChefDashboard() {
  const user = await requireChef()

  // Fetch dashboard data in parallel
  const [events, clients, financials] = await Promise.all([
    getEvents(),
    getClients(),
    getTenantFinancialSummary()
  ])

  // Calculate summary stats
  const upcomingEvents = events.filter(e =>
    ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress'].includes(e.status)
  )
  const completedEvents = events.filter(e => e.status === 'completed')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back!</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">Upcoming Events</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{upcomingEvents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">Total Clients</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{clients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">Net Revenue</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {formatCurrency(financials.netRevenueCents)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">Completed</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{completedEvents.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Events</CardTitle>
            <Link href="/chef/events" className="text-sm text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No events yet.{' '}
              <Link href="/chef/events/new" className="text-blue-600 hover:text-blue-700">
                Create your first event
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {events.slice(0, 5).map((event) => (
                <Link
                  key={event.id}
                  href={`/chef/events/${event.id}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {event.client?.full_name} • {event.guest_count} guests
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(event.event_date), 'PPP')}
                      </p>
                    </div>
                    <div className="text-right">
                      <EventStatusBadge status={event.status as any} />
                      <p className="text-sm font-medium text-gray-900 mt-2">
                        {formatCurrency(event.total_amount_cents)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
