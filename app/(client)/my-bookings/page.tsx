// Client Bookings - Consolidated view of Events, Quotes, and Inquiries

import type { Metadata } from 'next'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { requireClient } from '@/lib/auth/get-user'
import { getClientEvents } from '@/lib/events/client-actions'
import { getClientQuotes } from '@/lib/quotes/client-actions'
import { getClientInquiries } from '@/lib/inquiries/client-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { InquiryStatusBadge } from '@/components/inquiries/inquiry-status-badge'
import { formatCurrency } from '@/lib/utils/currency'
import {
  ChevronRight,
  Calendar,
  FileText,
  ClipboardList,
  LayoutDashboard,
  AlertCircle,
} from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'My Bookings',
  description: 'Your events, quotes, and inquiries in one place.',
}

const QUOTE_STATUS: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  sent: { label: 'Pending Review', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Declined', variant: 'error' },
}

// What action (if any) should a client take for a given event status
function getEventAction(event: any): { label: string; href: string } | null {
  switch (event.status) {
    case 'proposed':
      return { label: 'Review Proposal', href: `/my-events/${event.id}/proposal` }
    case 'accepted':
      return { label: 'Pay Now', href: `/my-events/${event.id}/pay` }
    case 'confirmed':
      return { label: 'View Checklist', href: `/my-events/${event.id}/pre-event-checklist` }
    case 'completed':
      return { label: 'View Summary', href: `/my-events/${event.id}/event-summary` }
    default:
      return null
  }
}

const TABS = ['events', 'quotes', 'inquiries'] as const
type Tab = (typeof TABS)[number]

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  await requireClient()
  const params = await searchParams
  const tab: Tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'events'

  const [eventsResult, quotes, inquiries] = await Promise.all([
    getClientEvents(),
    getClientQuotes(),
    getClientInquiries(),
  ])

  const pendingQuotes = quotes.filter((q: any) => q.status === 'sent')
  const resolvedQuotes = quotes.filter((q: any) => q.status !== 'sent')

  const eventsNeedingAction = eventsResult.upcoming.filter((e: any) =>
    ['proposed', 'accepted', 'confirmed'].includes(e.status)
  )
  const totalActionItems =
    eventsNeedingAction.length +
    pendingQuotes.length +
    inquiries.filter((i: any) => i.status === 'awaiting_response').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">My Bookings</h1>
        <p className="text-stone-500 mt-1">Your events, quotes, and inquiries in one place.</p>
      </div>

      {/* Action required banner */}
      {totalActionItems > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-brand-950 border border-brand-800 px-4 py-3">
          <AlertCircle className="w-5 h-5 text-brand-400 shrink-0" />
          <p className="text-sm text-brand-300">
            You have{' '}
            <span className="font-semibold text-brand-200">
              {totalActionItems} item{totalActionItems > 1 ? 's' : ''}
            </span>{' '}
            that need your attention.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-800">
        <TabLink href="/my-bookings?tab=events" active={tab === 'events'}>
          Events
          {eventsResult.upcoming.length > 0 && (
            <span className="ml-1.5 text-xs bg-stone-700 text-stone-300 rounded-full px-1.5 py-0.5">
              {eventsResult.upcoming.length}
            </span>
          )}
        </TabLink>
        <TabLink href="/my-bookings?tab=quotes" active={tab === 'quotes'}>
          Quotes
          {pendingQuotes.length > 0 && (
            <span className="ml-1.5 text-xs bg-brand-900 text-brand-400 rounded-full px-1.5 py-0.5">
              {pendingQuotes.length}
            </span>
          )}
        </TabLink>
        <TabLink href="/my-bookings?tab=inquiries" active={tab === 'inquiries'}>
          Inquiries
          {inquiries.length > 0 && (
            <span className="ml-1.5 text-xs bg-stone-700 text-stone-300 rounded-full px-1.5 py-0.5">
              {inquiries.length}
            </span>
          )}
        </TabLink>
      </div>

      {/* Events Tab */}
      {tab === 'events' && (
        <div className="space-y-6">
          {/* Dashboard link */}
          <Link
            href="/my-events"
            className="flex items-center justify-between px-4 py-3 rounded-lg bg-stone-800/60 border border-stone-700 hover:border-stone-600 hover:bg-stone-800 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4 text-stone-400" />
              <span className="text-sm text-stone-300">Full event dashboard</span>
              <span className="text-xs text-stone-500">RSVP tracking, documents, AI assistant</span>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-brand-500 transition-colors" />
          </Link>

          {eventsResult.upcoming.length === 0 && eventsResult.past.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-10 h-10 text-stone-600" />}
              message="No events yet"
              sub="Once your chef confirms a booking, it will appear here."
            />
          ) : (
            <>
              {eventsResult.upcoming.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                    Upcoming
                  </h2>
                  {eventsResult.upcoming.map((event: any) => {
                    const action = getEventAction(event)
                    return (
                      <Link key={event.id} href={`/my-events/${event.id}`}>
                        <Card className="p-4 hover:shadow-md hover:border-stone-600 transition-all cursor-pointer group">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <EventStatusBadge status={event.status} />
                                {action && (
                                  <span className="text-xs font-medium text-brand-400 bg-brand-950 rounded px-1.5 py-0.5">
                                    Action needed
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-stone-100 truncate">
                                {event.occasion || 'Private Event'}
                              </p>
                              <p className="text-sm text-stone-500">
                                {event.event_date
                                  ? format(new Date(event.event_date), 'MMMM d, yyyy')
                                  : 'Date TBD'}
                                {event.guest_count ? ` · ${event.guest_count} guests` : ''}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {action && (
                                <Link
                                  href={action.href}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded px-2.5 py-1.5 transition-colors"
                                >
                                  {action.label}
                                </Link>
                              )}
                              <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-brand-600 transition-colors" />
                            </div>
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                </section>
              )}

              {eventsResult.past.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                      Past
                    </h2>
                    {eventsResult.pastTotalCount > eventsResult.past.length && (
                      <Link
                        href="/my-events/history"
                        className="text-sm text-brand-400 hover:text-brand-300 font-medium"
                      >
                        View all {eventsResult.pastTotalCount} &rarr;
                      </Link>
                    )}
                  </div>
                  {eventsResult.past.map((event: any) => {
                    const action = getEventAction(event)
                    return (
                      <Link key={event.id} href={`/my-events/${event.id}`}>
                        <Card className="p-4 hover:shadow-sm transition-all cursor-pointer group opacity-75 hover:opacity-100">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="font-semibold text-stone-100 truncate">
                                {event.occasion || 'Private Event'}
                              </p>
                              <p className="text-sm text-stone-500">
                                {event.event_date
                                  ? format(new Date(event.event_date), 'MMMM d, yyyy')
                                  : 'Date TBD'}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {action && (
                                <Link
                                  href={action.href}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded px-2.5 py-1.5 transition-colors"
                                >
                                  {action.label}
                                </Link>
                              )}
                              <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-brand-600 transition-colors" />
                            </div>
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* Quotes Tab */}
      {tab === 'quotes' && (
        <div className="space-y-6">
          {quotes.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-10 h-10 text-stone-600" />}
              message="No quotes yet"
              sub="Your chef will send you a quote once they review your inquiry."
            />
          ) : (
            <>
              {pendingQuotes.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                    Action Needed
                  </h2>
                  {pendingQuotes.map((quote: any) => (
                    <Link key={quote.id} href={`/my-quotes/${quote.id}`}>
                      <Card className="p-4 border-l-4 border-l-brand-500 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex justify-between items-center gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-stone-100 truncate">
                                {quote.quote_name ||
                                  (quote.inquiry as any)?.confirmed_occasion ||
                                  'Quote'}
                              </span>
                              <Badge variant="info">Pending Review</Badge>
                            </div>
                            <p className="text-sm text-stone-500 mt-1">
                              Received{' '}
                              {formatDistanceToNow(new Date(quote.sent_at || quote.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xl font-bold text-stone-100">
                              {formatCurrency(quote.total_quoted_cents)}
                            </p>
                            <p className="text-sm text-brand-500 font-medium">Review &rarr;</p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </section>
              )}

              {resolvedQuotes.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                    Previous Quotes
                  </h2>
                  {resolvedQuotes.map((quote: any) => {
                    const display = QUOTE_STATUS[quote.status] || QUOTE_STATUS.sent
                    return (
                      <Link key={quote.id} href={`/my-quotes/${quote.id}`}>
                        <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer">
                          <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="font-medium text-stone-100 truncate">
                                {quote.quote_name ||
                                  (quote.inquiry as any)?.confirmed_occasion ||
                                  'Quote'}
                              </span>
                              <Badge variant={display.variant}>{display.label}</Badge>
                            </div>
                            <p className="text-lg font-semibold text-stone-100 shrink-0">
                              {formatCurrency(quote.total_quoted_cents)}
                            </p>
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* Inquiries Tab */}
      {tab === 'inquiries' && (
        <div className="space-y-3">
          {inquiries.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-10 h-10 text-stone-600" />}
              message="No inquiries yet"
              sub="Submit an inquiry to get the booking process started."
            />
          ) : (
            inquiries.map((inquiry: any) => (
              <Link key={inquiry.id} href={`/my-inquiries/${inquiry.id}`}>
                <Card className="p-4 hover:shadow-md hover:border-stone-600 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <InquiryStatusBadge status={inquiry.status as any} />
                      </div>
                      <p className="font-semibold text-stone-100 truncate">
                        {inquiry.confirmed_occasion || 'Catering Inquiry'}
                      </p>
                      <p className="text-sm text-stone-500">
                        {inquiry.confirmed_date
                          ? format(new Date(inquiry.confirmed_date), 'MMMM d, yyyy')
                          : 'Date to be confirmed'}
                        {inquiry.confirmed_guest_count
                          ? ` · ${inquiry.confirmed_guest_count} guests`
                          : ''}
                        {inquiry.confirmed_location ? ` · ${inquiry.confirmed_location}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-brand-600 transition-colors shrink-0" />
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex items-center px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-brand-500 text-brand-400'
          : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-600'
      }`}
    >
      {children}
    </Link>
  )
}

function EmptyState({
  icon,
  message,
  sub,
}: {
  icon: React.ReactNode
  message: string
  sub: string
}) {
  return (
    <Card className="p-10 flex flex-col items-center text-center gap-3">
      {icon}
      <p className="text-stone-400 font-medium">{message}</p>
      <p className="text-sm text-stone-500">{sub}</p>
    </Card>
  )
}
