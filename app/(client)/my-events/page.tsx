// Client Events List - View all events grouped by status

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'My Events - ChefFlow' }
import { getClientEvents } from '@/lib/events/client-actions'
import { getMyLoyaltyStatus } from '@/lib/loyalty/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageChefButton } from '@/components/chat/message-chef-button'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import type { Database } from '@/types/database'

type EventStatus = Database['public']['Enums']['event_status']
type EventRow = Database['public']['Tables']['events']['Row']
type ClientEvent = EventRow & {
  client: { id: string; full_name: string; email: string }
}

// Status badge mapping
function getStatusBadge(status: EventStatus) {
  const variants: Record<EventStatus, { variant: 'default' | 'success' | 'warning' | 'error' | 'info', label: string }> = {
    draft: { variant: 'default', label: 'Draft' },
    proposed: { variant: 'warning', label: 'Pending Review' },
    accepted: { variant: 'warning', label: 'Payment Due' },
    paid: { variant: 'info', label: 'Paid' },
    confirmed: { variant: 'success', label: 'Confirmed' },
    in_progress: { variant: 'info', label: 'In Progress' },
    completed: { variant: 'default', label: 'Completed' },
    cancelled: { variant: 'error', label: 'Cancelled' }
  }

  const config = variants[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// Action button for each event status
function EventActionButton({ event }: { event: ClientEvent }) {
  const { id, status } = event
  const quotedPrice = event.quoted_price_cents ?? 0

  if (status === 'proposed') {
    return (
      <Link href={`/my-events/${id}`}>
        <Button variant="primary" size="sm">
          View & Accept
        </Button>
      </Link>
    )
  }

  if (status === 'accepted' && quotedPrice > 0) {
    return (
      <Link href={`/my-events/${id}/pay`}>
        <Button variant="primary" size="sm">
          Pay Now
        </Button>
      </Link>
    )
  }

  if (['paid', 'confirmed', 'in_progress'].includes(status)) {
    return (
      <Link href={`/my-events/${id}`}>
        <Button variant="secondary" size="sm">
          View Details
        </Button>
      </Link>
    )
  }

  if (status === 'completed') {
    return (
      <Link href={`/my-events/${id}`}>
        <Button variant="ghost" size="sm">
          View Receipt
        </Button>
      </Link>
    )
  }

  return (
    <Link href={`/my-events/${id}`}>
      <Button variant="ghost" size="sm">
        View
      </Button>
    </Link>
  )
}

// Event card component
function EventCard({ event }: { event: ClientEvent }) {
  const quotedPrice = event.quoted_price_cents ?? 0
  const location = [event.location_address, event.location_city].filter(Boolean).join(', ')

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(event.status)}
            </div>

            <h3 className="text-lg font-semibold text-stone-900 mb-2">
              {event.occasion || 'Untitled Event'}
            </h3>

            <div className="space-y-1 text-sm text-stone-600">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{format(new Date(event.event_date), 'PPP')}</span>
              </div>

              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{event.guest_count} guests</span>
              </div>

              {location && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{location}</span>
                </div>
              )}
            </div>

            {quotedPrice > 0 && ['proposed', 'accepted'].includes(event.status) && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600">
                    {event.status === 'accepted' ? 'Balance Due:' : 'Total Price:'}
                  </span>
                  <span className="text-lg font-bold text-stone-900">
                    {formatCurrency(quotedPrice)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="sm:ml-4">
            <EventActionButton event={event} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Empty state component
function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="text-stone-400 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-stone-600">{message}</p>
      </CardContent>
    </Card>
  )
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-stone-200 text-stone-800',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-purple-100 text-purple-800',
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

export default async function MyEventsPage() {
  await requireClient()

  const [events, loyaltyStatus] = await Promise.all([
    getClientEvents(),
    getMyLoyaltyStatus().catch(() => null),
  ])

  // Group events by status
  const upcoming = events.filter(e =>
    ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress'].includes(e.status)
  )
  const past = events.filter(e => e.status === 'completed')
  const cancelled = events.filter(e => e.status === 'cancelled')

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">My Events</h1>
        <p className="text-stone-600 mt-2">
          Manage your upcoming events and view past bookings
        </p>
      </div>

      {/* Loyalty Status */}
      {loyaltyStatus && (loyaltyStatus.pointsBalance > 0 || loyaltyStatus.totalEventsCompleted > 0) && (
        <Card className="mb-8 border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${TIER_COLORS[loyaltyStatus.tier]}`}>
                  {TIER_LABELS[loyaltyStatus.tier]} Member
                </span>
                <div>
                  <p className="text-lg font-bold text-purple-900">{loyaltyStatus.pointsBalance.toLocaleString()} points</p>
                  {loyaltyStatus.nextReward && (
                    <p className="text-sm text-purple-700">
                      {loyaltyStatus.nextReward.pointsNeeded} points to {loyaltyStatus.nextReward.name}
                    </p>
                  )}
                </div>
              </div>
              {loyaltyStatus.availableRewards.length > 0 && (
                <Badge variant="success">
                  {loyaltyStatus.availableRewards.length} reward{loyaltyStatus.availableRewards.length > 1 ? 's' : ''} available
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-stone-900 mb-4">
          Upcoming Events
        </h2>
        {upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map(event => (
              <EventCard key={event.id} event={event as ClientEvent} />
            ))}
          </div>
        ) : (
          <EmptyState message="No upcoming events" />
        )}
      </section>

      {/* Past Events */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-stone-900 mb-4">
          Past Events
        </h2>
        {past.length > 0 ? (
          <div className="space-y-4">
            {past.map(event => (
              <EventCard key={event.id} event={event as ClientEvent} />
            ))}
          </div>
        ) : (
          <EmptyState message="No past events yet" />
        )}
      </section>

      {/* Cancelled Events */}
      {cancelled.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold text-stone-900 mb-4">
            Cancelled Events
          </h2>
          <div className="space-y-4">
            {cancelled.map(event => (
              <EventCard key={event.id} event={event as ClientEvent} />
            ))}
          </div>
        </section>
      )}

      {/* Floating Message Chef button */}
      <MessageChefButton variant="fab" />

      <ActivityTracker
        eventType="events_list_viewed"
        metadata={{ event_count: events.length }}
      />
    </div>
  )
}
