// Client-Facing Event Detail Portal
// Authenticated view for clients to see event details, menu, financials, and timeline

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getClientEventById } from '@/lib/events/client-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import type { Database } from '@/types/database'

type EventStatus = Database['public']['Enums']['event_status']

// Status badge mapping (client-friendly labels)
function getStatusBadge(status: EventStatus) {
  const variants: Record<
    EventStatus,
    { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string }
  > = {
    draft: { variant: 'default', label: 'Draft' },
    proposed: { variant: 'warning', label: 'Pending Review' },
    accepted: { variant: 'warning', label: 'Payment Due' },
    paid: { variant: 'info', label: 'Paid' },
    confirmed: { variant: 'success', label: 'Confirmed' },
    in_progress: { variant: 'info', label: 'In Progress' },
    completed: { variant: 'default', label: 'Completed' },
    cancelled: { variant: 'error', label: 'Cancelled' },
  }

  const config = variants[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const event = await getClientEventById(id)
  return { title: event ? `${event.occasion || 'Event'} | ChefFlow` : 'Event | ChefFlow' }
}

export default async function ClientEventPortalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireClient()

  const event = await getClientEventById(id)

  if (!event) {
    notFound()
  }

  const financial = event.financial
  const totalPaidCents = financial?.totalPaidCents ?? 0
  const quotedPriceCents = financial?.quotedPriceCents ?? event.quoted_price_cents ?? 0
  const outstandingBalanceCents = financial?.outstandingBalanceCents ?? quotedPriceCents

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/my-events"
          className="text-brand-500 hover:text-brand-400 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to My Events
        </Link>
      </div>

      {/* Event Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100 mb-2">
              {event.occasion || 'Upcoming Event'}
            </h1>
            {getStatusBadge(event.status)}
          </div>
        </div>
      </div>

      {/* Event Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-stone-400 mb-1">Date</div>
              <div className="font-medium text-stone-100">
                {format(new Date(event.event_date), 'PPP')}
              </div>
            </div>

            <div>
              <div className="text-sm text-stone-400 mb-1">Guest Count</div>
              <div className="font-medium text-stone-100">
                {event.guest_count != null ? `${event.guest_count} guests` : 'Not set'}
              </div>
            </div>

            {event.serve_time && (
              <div>
                <div className="text-sm text-stone-400 mb-1">Serve Time</div>
                <div className="font-medium text-stone-100">{event.serve_time}</div>
              </div>
            )}

            <div className="sm:col-span-2">
              <div className="text-sm text-stone-400 mb-1">Location</div>
              <div className="font-medium text-stone-100">
                {[
                  event.location_address,
                  event.location_city,
                  event.location_state,
                  event.location_zip,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Not set'}
              </div>
            </div>

            <div>
              <div className="text-sm text-stone-400 mb-1">Status</div>
              <div>{getStatusBadge(event.status)}</div>
            </div>

            {event.special_requests && (
              <div className="sm:col-span-2">
                <div className="text-sm text-stone-400 mb-1">Special Requests</div>
                <div className="text-stone-100">{event.special_requests}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Menu Section */}
      {event.menus && event.menus.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Menu</CardTitle>
              {(event as any).menu_approval_status === 'approved' && (
                <Badge variant="success">Approved</Badge>
              )}
              {(event as any).menu_approval_status === 'sent' && (
                <Badge variant="warning">Review Needed</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {event.menus.map((menu: any) => (
                <div key={menu.id}>
                  <h4 className="font-semibold text-stone-100 text-lg mb-1">{menu.name}</h4>
                  {menu.description && (
                    <p className="text-stone-400 text-sm mb-3">{menu.description}</p>
                  )}
                  {menu.service_style && (
                    <Badge variant="info" className="mb-3">
                      {menu.service_style.replace(/_/g, ' ')}
                    </Badge>
                  )}

                  {/* Courses and dishes */}
                  {menu.dishes && menu.dishes.length > 0 && (
                    <div className="mt-3 space-y-4">
                      {groupDishesByCourse(menu.dishes).map(
                        (course: { name: string; dishes: any[] }) => (
                          <div key={course.name} className="border-l-2 border-brand-600 pl-4">
                            <h5 className="text-sm font-semibold text-brand-400 uppercase tracking-wide mb-2">
                              {course.name}
                            </h5>
                            <ul className="space-y-2">
                              {course.dishes.map((dish: any) => (
                                <li key={dish.id}>
                                  <div className="text-stone-100 font-medium">
                                    {dish.description || 'Untitled dish'}
                                  </div>
                                  {dish.dietary_tags && dish.dietary_tags.length > 0 && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {dish.dietary_tags.map((tag: string) => (
                                        <Badge key={tag} variant="default">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  {dish.allergen_flags && dish.allergen_flags.length > 0 && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {dish.allergen_flags.map((allergen: string) => (
                                        <Badge key={allergen} variant="warning">
                                          {allergen}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {financial ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Total Quoted</span>
                <span className="font-semibold text-stone-100">
                  {formatCurrency(quotedPriceCents)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone-400">Deposits Paid</span>
                <span className="font-semibold text-emerald-500">
                  {formatCurrency(totalPaidCents)}
                </span>
              </div>

              <div className="pt-3 border-t border-stone-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-stone-100">Balance Due</span>
                  <span
                    className={`text-2xl font-bold ${
                      outstandingBalanceCents > 0 ? 'text-red-500' : 'text-emerald-500'
                    }`}
                  >
                    {formatCurrency(outstandingBalanceCents)}
                  </span>
                </div>
              </div>

              {outstandingBalanceCents > 0 &&
                ['accepted', 'paid', 'confirmed', 'in_progress', 'completed'].includes(
                  event.status
                ) && (
                  <div className="mt-3">
                    <Link
                      href={`/my-events/${event.id}/pay`}
                      className="block w-full bg-red-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition text-sm text-center"
                    >
                      Pay Remaining Balance
                    </Link>
                  </div>
                )}
            </div>
          ) : (
            <p className="text-stone-400 text-sm">
              Financial details are not yet available for this event.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {event.ledgerEntries && event.ledgerEntries.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {event.ledgerEntries.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center py-2 border-b border-stone-700 last:border-b-0"
                >
                  <div>
                    <div className="font-medium text-stone-100">{entry.description}</div>
                    <div className="text-sm text-stone-400">
                      {format(new Date(entry.created_at), 'PPP')}
                    </div>
                  </div>
                  <div className="font-semibold text-stone-100">
                    {formatCurrency(entry.amount_cents)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Timeline / Schedule */}
      {event.transitions && event.transitions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Event Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-stone-700" />
              <div className="space-y-4">
                {event.transitions.map(
                  (t: { to_status: string; transitioned_at: string }, i: number) => (
                    <div key={i} className="relative pl-8">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-brand-500 border-2 border-stone-800" />
                      <div>
                        <div className="font-medium text-stone-100">
                          {formatTransitionLabel(t.to_status)}
                        </div>
                        <div className="text-sm text-stone-400">
                          {format(new Date(t.transitioned_at), 'PPP p')}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post-Event Feedback Link */}
      {event.status === 'completed' && !event.hasReview && (
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="text-center space-y-3">
              <h3 className="text-lg font-semibold text-stone-100">
                How was your experience?
              </h3>
              <p className="text-stone-400 text-sm">
                We would love to hear your feedback about this event.
              </p>
              <Link
                href={`/my-events/${event.id}#review`}
                className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 transition"
              >
                Leave Feedback
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {event.status === 'completed' && event.hasReview && (
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="text-center space-y-2">
              <Badge variant="success">Feedback Submitted</Badge>
              <p className="text-stone-400 text-sm">
                Thank you for sharing your experience!
              </p>
              <Link
                href={`/my-events/${event.id}#review`}
                className="text-brand-500 hover:text-brand-400 text-sm"
              >
                View your feedback
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity tracking */}
      <ActivityTracker
        eventType="event_viewed"
        entityType="event"
        entityId={event.id}
        metadata={{
          event_status: event.status,
          occasion: event.occasion,
          event_date: event.event_date,
          source: 'event_portal',
        }}
      />
    </div>
  )
}

/**
 * Group dishes by course name, sorted by course_number then sort_order.
 */
function groupDishesByCourse(dishes: any[]): { name: string; dishes: any[] }[] {
  const sorted = [...dishes].sort((a, b) => {
    const courseA = a.course_number ?? 999
    const courseB = b.course_number ?? 999
    if (courseA !== courseB) return courseA - courseB
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })

  const courseMap = new Map<string, any[]>()
  for (const dish of sorted) {
    const courseName = dish.course_name || 'Main'
    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, [])
    }
    courseMap.get(courseName)!.push(dish)
  }

  return Array.from(courseMap.entries()).map(([name, courseDishes]) => ({
    name,
    dishes: courseDishes,
  }))
}

/**
 * Convert event status transition to a client-friendly label.
 */
function formatTransitionLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Event Created',
    proposed: 'Proposal Sent',
    accepted: 'Proposal Accepted',
    paid: 'Payment Received',
    confirmed: 'Event Confirmed',
    in_progress: 'Event Started',
    completed: 'Event Completed',
    cancelled: 'Event Cancelled',
  }
  return labels[status] || status.replace(/_/g, ' ')
}
