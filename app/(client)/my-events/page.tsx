// Client Events Dashboard - Registry-driven widget surface

import type { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  getClientDashboardData,
  getClientDashboardPreferences,
  type ClientDashboardEvent,
} from '@/lib/client-dashboard/actions'
import type { Database } from '@/types/database'
import type { ClientDashboardWidgetId } from '@/lib/client-dashboard/types'
import {
  CLIENT_DASHBOARD_WIDGET_LABELS,
  CLIENT_DASHBOARD_WIDGET_DESCRIPTIONS,
} from '@/lib/client-dashboard/types'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageChefButton } from '@/components/chat/message-chef-button'
import { RemyClientChat } from '@/components/ai/remy-client-chat'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { ClientEventsRefresher } from '@/components/client/client-events-refresher'
import { TrackedActivityLink } from '@/components/activity/tracked-activity-link'
import { PostEventBanner } from '@/components/client/post-event-banner'
import { BetaOnboardingChecklist } from '@/components/beta/beta-onboarding-checklist'
import { getMyBetaChecklist, syncBetaChecklistProgress } from '@/lib/beta/onboarding-actions'
import { ClientDashboardWidgetShell } from '@/components/client-dashboard/widget-shell'
import { ClientDashboardWidgetGrid } from '@/components/client-dashboard/widget-grid'
import { ClientDashboardEmptyState } from '@/components/client-dashboard/empty-state'
import {
  ClientDashboardCollapseControls,
  ClientDashboardCollapseProvider,
} from '@/components/client-dashboard/collapse-controls'
import { ClientCollapsibleWidget } from '@/components/client-dashboard/collapsible-widget'

export const metadata: Metadata = { title: 'My Events' }

type EventStatus = Database['public']['Enums']['event_status']

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

function EventActionButton({
  event,
  hasOutstandingBalance,
}: {
  event: ClientDashboardEvent
  hasOutstandingBalance?: boolean
}) {
  const { id, status } = event
  const quotedPrice = event.quoted_price_cents ?? 0

  if (status === 'proposed') {
    return (
      <TrackedActivityLink
        href={`/my-events/${id}`}
        entityType="event"
        entityId={id}
        metadata={{ action: 'view_accept_event', event_status: status }}
      >
        <Button variant="primary" size="sm">
          View & Accept
        </Button>
      </TrackedActivityLink>
    )
  }

  if (status === 'accepted' && quotedPrice > 0) {
    return (
      <TrackedActivityLink
        href={`/my-events/${id}/pay`}
        entityType="event"
        entityId={id}
        metadata={{ action: 'pay_event', event_status: status }}
      >
        <Button variant="primary" size="sm">
          Pay Now
        </Button>
      </TrackedActivityLink>
    )
  }

  if (['paid', 'confirmed', 'in_progress'].includes(status)) {
    const circleToken = event.hub_group?.group_token
    return (
      <div className="flex items-center gap-2">
        {circleToken && (
          <Link href={`/hub/g/${circleToken}`}>
            <Button variant="primary" size="sm">
              Open Circle
            </Button>
          </Link>
        )}
        <TrackedActivityLink
          href={`/my-events/${id}`}
          entityType="event"
          entityId={id}
          metadata={{ action: 'view_event_details', event_status: status }}
        >
          <Button variant={circleToken ? 'secondary' : 'secondary'} size="sm">
            Details
          </Button>
        </TrackedActivityLink>
      </div>
    )
  }

  if (status === 'completed') {
    if (hasOutstandingBalance) {
      return (
        <div className="flex items-end gap-2">
          <TrackedActivityLink
            href={`/my-events/${id}/pay`}
            entityType="event"
            entityId={id}
            metadata={{ action: 'pay_outstanding_balance', event_status: status }}
          >
            <Button variant="primary" size="sm">
              Pay Balance
            </Button>
          </TrackedActivityLink>
          <TrackedActivityLink
            href={`/my-events/${id}`}
            entityType="event"
            entityId={id}
            metadata={{ action: 'view_event_receipt', event_status: status }}
          >
            <Button variant="ghost" size="sm">
              View Receipt
            </Button>
          </TrackedActivityLink>
        </div>
      )
    }

    return (
      <div className="flex items-end gap-2">
        <TrackedActivityLink
          href={`/my-events/${id}`}
          entityType="event"
          entityId={id}
          metadata={{ action: 'view_event_receipt', event_status: status }}
        >
          <Button variant="ghost" size="sm">
            View Receipt
          </Button>
        </TrackedActivityLink>
        <TrackedActivityLink
          href={`/my-events/${id}#review`}
          entityType="event"
          entityId={id}
          metadata={{ action: 'leave_event_review', event_status: status }}
        >
          <Button variant="secondary" size="sm">
            Leave Review
          </Button>
        </TrackedActivityLink>
      </div>
    )
  }

  return (
    <TrackedActivityLink
      href={`/my-events/${id}`}
      entityType="event"
      entityId={id}
      metadata={{ action: 'view_event', event_status: status }}
    >
      <Button variant="ghost" size="sm">
        View
      </Button>
    </TrackedActivityLink>
  )
}

function EventCard({
  event,
  hasOutstandingBalance,
}: {
  event: ClientDashboardEvent
  hasOutstandingBalance?: boolean
}) {
  const quotedPrice = event.quoted_price_cents ?? 0
  const location = [event.location_address, event.location_city].filter(Boolean).join(', ')

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              {getStatusBadge(event.status)}
              {event.status === 'completed' && hasOutstandingBalance && (
                <Badge variant="error">Balance Due</Badge>
              )}
            </div>

            <h3 className="mb-2 text-lg font-semibold text-stone-100">
              {event.occasion || 'Untitled Event'}
            </h3>

            <div className="space-y-1 text-sm text-stone-400">
              <div>{format(new Date(event.event_date), 'PPP')}</div>
              <div>{event.guest_count} guests</div>
              {location ? <div>{location}</div> : null}
            </div>

            {quotedPrice > 0 && ['proposed', 'accepted'].includes(event.status) && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-400">
                    {event.status === 'accepted' ? 'Balance Due:' : 'Total Price:'}
                  </span>
                  <span className="text-lg font-bold text-stone-100">
                    {formatCurrency(quotedPrice)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="sm:ml-4">
            <EventActionButton event={event} hasOutstandingBalance={hasOutstandingBalance} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

function ComingSoonWidget({ id }: { id: ClientDashboardWidgetId }) {
  return (
    <ClientDashboardWidgetShell
      title={CLIENT_DASHBOARD_WIDGET_LABELS[id]}
      description={CLIENT_DASHBOARD_WIDGET_DESCRIPTIONS[id]}
    >
      <p className="text-sm text-stone-400">Not available yet</p>
    </ClientDashboardWidgetShell>
  )
}

export default async function MyEventsPage() {
  const [data, preferences, betaData] = await Promise.all([
    getClientDashboardData(),
    getClientDashboardPreferences(),
    syncBetaChecklistProgress().catch(() => null),
  ])

  // Also fetch full beta checklist info for the component
  const betaChecklist = await getMyBetaChecklist().catch(() => null)

  const {
    eventsResult,
    loyaltyStatus,
    quotes,
    inquiries,
    inbox,
    spendingSummary,
    profileSummary,
    hubSummary,
    rsvpSummary,
    documentsSummary,
    unreviewedEvent,
    chefDisplayName,
    pastWithBalance,
    actionRequired,
  } = data
  const { upcoming, past, pastTotalCount, cancelled } = eventsResult
  const sentQuotes = quotes.filter((quote) => quote.status === 'sent').length
  const acceptedQuotes = quotes.filter((quote) => quote.status === 'accepted').length
  const rejectedQuotes = quotes.filter((quote) => quote.status === 'rejected').length
  const expiredQuotes = quotes.filter((quote) => quote.status === 'expired').length
  const firstPendingQuote = quotes.find((quote) => quote.status === 'sent') ?? null
  const awaitingClientInquiries = inquiries.filter(
    (inquiry) => inquiry.status === 'awaiting_client'
  ).length
  const awaitingChefInquiries = inquiries.filter(
    (inquiry) => inquiry.status === 'awaiting_chef'
  ).length
  const quotedInquiries = inquiries.filter((inquiry) => inquiry.status === 'quoted').length
  const firstAwaitingClientInquiry =
    inquiries.find((inquiry) => inquiry.status === 'awaiting_client') ?? null
  const unreadMessages = inbox.reduce(
    (sum, conversation) => sum + Number(conversation.unread_count ?? 0),
    0
  )
  const conversationsWithUnread = inbox.filter(
    (conversation) => Number(conversation.unread_count ?? 0) > 0
  ).length
  const latestConversation = inbox[0]
  const latestConversationHref = latestConversation?.id
    ? `/my-chat/${String(latestConversation.id)}`
    : '/my-chat'
  const latestConversationPreview =
    typeof latestConversation?.last_message_preview === 'string'
      ? latestConversation.last_message_preview
      : ''
  const dinnerCircleTotalSignals =
    hubSummary.groupCount +
    hubSummary.friendCount +
    hubSummary.pendingFriendRequestCount +
    hubSummary.totalUnreadCount
  const hasRewardsActivity = Boolean(
    loyaltyStatus && (loyaltyStatus.pointsBalance > 0 || loyaltyStatus.totalEventsCompleted > 0)
  )
  const availableRewardsCount = loyaltyStatus?.availableRewards.length ?? 0
  const spendingLoadError = (spendingSummary as any).loadError === true
  const hasSpendingActivity =
    !spendingLoadError &&
    (spendingSummary.lifetimeSpendCents > 0 ||
      spendingSummary.thisYearSpendCents > 0 ||
      spendingSummary.eventsAttended > 0 ||
      spendingSummary.upcomingCommittedCents > 0)
  const profileNeedsAttention =
    profileSummary.completionPercent < 100 ||
    profileSummary.pendingMealRequests > 0 ||
    !profileSummary.signalNotificationsEnabled

  const documentActions: Array<{
    id: string
    label: string
    detail: string
    href: string
    target?: string
    rel?: string
  }> = []

  if (documentsSummary.nextEventId) {
    documentActions.push({
      id: 'calendar',
      label: 'Add Next Event to Calendar',
      detail: 'Download calendar file for your next event.',
      href: `/api/calendar/event/${documentsSummary.nextEventId}`,
      target: '_blank',
      rel: 'noreferrer',
    })
    documentActions.push({
      id: 'menu',
      label: 'Download Menu PDF',
      detail: 'Export your current front-of-house menu PDF.',
      href: `/api/documents/foh-menu/${documentsSummary.nextEventId}`,
      target: '_blank',
      rel: 'noreferrer',
    })
  }

  if (documentsSummary.lastPastEventId) {
    documentActions.push({
      id: 'receipt',
      label: 'Download Latest Receipt',
      detail: 'Get the latest completed event receipt.',
      href: `/api/documents/receipt/${documentsSummary.lastPastEventId}`,
      target: '_blank',
      rel: 'noreferrer',
    })
  }

  if (documentsSummary.quoteIdForPdf) {
    documentActions.push({
      id: 'quote_pdf',
      label: 'Download Pending Quote',
      detail: 'Review the latest pending quote offline.',
      href: `/api/documents/quote-client/${documentsSummary.quoteIdForPdf}`,
      target: '_blank',
      rel: 'noreferrer',
    })
  }

  const widgetContent: Partial<Record<ClientDashboardWidgetId, React.ReactNode>> = {
    action_required: (
      <ClientDashboardWidgetShell
        title="Action Required"
        description="Priority items that need your attention right now."
      >
        {actionRequired.totalItems > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <TrackedActivityLink
              href="/my-events"
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
              entityType="client_dashboard_widget"
              entityId="action_required"
              metadata={{ action: 'open_action_proposals' }}
            >
              <p className="text-2xl font-bold text-stone-100">{actionRequired.proposalCount}</p>
              <p className="text-xs text-stone-400">Proposals to review</p>
            </TrackedActivityLink>
            <TrackedActivityLink
              href="/my-events"
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
              entityType="client_dashboard_widget"
              entityId="action_required"
              metadata={{ action: 'open_action_payments' }}
            >
              <p className="text-2xl font-bold text-stone-100">{actionRequired.paymentDueCount}</p>
              <p className="text-xs text-stone-400">Upcoming payments due</p>
            </TrackedActivityLink>
            <TrackedActivityLink
              href="/my-events/history"
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
              entityType="client_dashboard_widget"
              entityId="action_required"
              metadata={{ action: 'open_action_balances' }}
            >
              <p className="text-2xl font-bold text-stone-100">
                {actionRequired.outstandingBalanceCount}
              </p>
              <p className="text-xs text-stone-400">Past balances due</p>
            </TrackedActivityLink>
            <TrackedActivityLink
              href="/my-quotes"
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
              entityType="client_dashboard_widget"
              entityId="action_required"
              metadata={{ action: 'open_action_quotes' }}
            >
              <p className="text-2xl font-bold text-stone-100">
                {actionRequired.quotePendingCount}
              </p>
              <p className="text-xs text-stone-400">Quotes awaiting decision</p>
            </TrackedActivityLink>
            <TrackedActivityLink
              href="/my-inquiries"
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
              entityType="client_dashboard_widget"
              entityId="action_required"
              metadata={{ action: 'open_action_inquiries' }}
            >
              <p className="text-2xl font-bold text-stone-100">
                {actionRequired.inquiryAwaitingCount}
              </p>
              <p className="text-xs text-stone-400">Inquiry responses needed</p>
            </TrackedActivityLink>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-stone-400">You are all caught up.</p>
            <div className="flex flex-wrap gap-2">
              <TrackedActivityLink
                href="/my-events"
                entityType="client_dashboard_widget"
                entityId="action_required"
                metadata={{ action: 'open_events_from_action_empty' }}
              >
                <Button variant="secondary" size="sm">
                  View Events
                </Button>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/book-now"
                entityType="client_dashboard_widget"
                entityId="action_required"
                metadata={{ action: 'book_from_action_empty' }}
              >
                <Button variant="ghost" size="sm">
                  Book Again
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        )}
      </ClientDashboardWidgetShell>
    ),
    feedback: (
      <ClientDashboardWidgetShell
        title="Feedback"
        description="Complete reviews after each event to help your chef improve."
      >
        {unreviewedEvent ? (
          <div className="space-y-3">
            <PostEventBanner
              eventId={unreviewedEvent.id}
              occasion={unreviewedEvent.occasion}
              eventDate={unreviewedEvent.event_date}
              chefName={chefDisplayName}
            />
            <TrackedActivityLink
              href={`/my-events/${unreviewedEvent.id}#review`}
              entityType="client_dashboard_widget"
              entityId="feedback"
              metadata={{ action: 'open_review_form', event_id: unreviewedEvent.id }}
            >
              <Button variant="secondary" size="sm">
                Open Review Form
              </Button>
            </TrackedActivityLink>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-stone-400">No pending reviews at the moment.</p>
            <TrackedActivityLink
              href="/my-events/history"
              entityType="client_dashboard_widget"
              entityId="feedback"
              metadata={{ action: 'open_history_from_feedback' }}
            >
              <Button variant="secondary" size="sm">
                View Event History
              </Button>
            </TrackedActivityLink>
          </div>
        )}
      </ClientDashboardWidgetShell>
    ),
    rewards: (
      <ClientDashboardWidgetShell
        title="Rewards"
        description="Track your tier, points, and eligible rewards."
      >
        {hasRewardsActivity && loyaltyStatus ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TrackedActivityLink
                href="/my-rewards"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="rewards"
                metadata={{ action: 'open_rewards_tier' }}
              >
                <p className="text-sm text-stone-400">Tier</p>
                <p className="text-lg font-semibold text-stone-100">
                  {TIER_LABELS[loyaltyStatus.tier]}
                </p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-rewards"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="rewards"
                metadata={{ action: 'open_rewards_points' }}
              >
                <p className="text-sm text-stone-400">Points balance</p>
                <p className="text-lg font-semibold text-stone-100">
                  {loyaltyStatus.pointsBalance.toLocaleString()}
                </p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-rewards"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="rewards"
                metadata={{ action: 'open_rewards_available' }}
              >
                <p className="text-sm text-stone-400">Available rewards</p>
                <p className="text-lg font-semibold text-stone-100">{availableRewardsCount}</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-rewards"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="rewards"
                metadata={{ action: 'open_rewards_events_completed' }}
              >
                <p className="text-sm text-stone-400">Completed events</p>
                <p className="text-lg font-semibold text-stone-100">
                  {loyaltyStatus.totalEventsCompleted}
                </p>
              </TrackedActivityLink>
            </div>

            {loyaltyStatus.nextReward ? (
              <p className="text-xs text-stone-500">
                {loyaltyStatus.nextReward.pointsNeeded} points to {loyaltyStatus.nextReward.name}.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <TrackedActivityLink
                href="/my-rewards"
                entityType="client_dashboard_widget"
                entityId="rewards"
                metadata={{ action: 'open_rewards' }}
              >
                <Button variant="secondary" size="sm">
                  Open Rewards
                </Button>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-rewards/about"
                entityType="client_dashboard_widget"
                entityId="rewards"
                metadata={{ action: 'learn_rewards_program' }}
              >
                <Button variant="ghost" size="sm">
                  How It Works
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ClientDashboardEmptyState message="No rewards activity yet." />
            <div className="flex flex-wrap gap-2">
              <TrackedActivityLink
                href="/book-now"
                entityType="client_dashboard_widget"
                entityId="rewards"
                metadata={{ action: 'book_from_rewards_empty' }}
              >
                <Button variant="primary" size="sm">
                  Book to Earn Rewards
                </Button>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-rewards"
                entityType="client_dashboard_widget"
                entityId="rewards"
                metadata={{ action: 'open_rewards' }}
              >
                <Button variant="secondary" size="sm">
                  Open Rewards
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        )}
      </ClientDashboardWidgetShell>
    ),
    quotes: (
      <ClientDashboardWidgetShell
        title="Quotes"
        description="Track pending quote approvals and accepted proposals."
      >
        {quotes.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TrackedActivityLink
                href="/my-quotes"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="quotes"
                metadata={{ action: 'open_quotes_total' }}
              >
                <p className="text-2xl font-bold text-stone-100">{quotes.length}</p>
                <p className="text-xs text-stone-400">Total quotes</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-quotes"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="quotes"
                metadata={{ action: 'open_quotes_pending' }}
              >
                <p className="text-2xl font-bold text-stone-100">{sentQuotes}</p>
                <p className="text-xs text-stone-400">Awaiting your decision</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-quotes"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="quotes"
                metadata={{ action: 'open_quotes_accepted' }}
              >
                <p className="text-2xl font-bold text-stone-100">{acceptedQuotes}</p>
                <p className="text-xs text-stone-400">Accepted</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-quotes"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="quotes"
                metadata={{ action: 'open_quotes_closed' }}
              >
                <p className="text-2xl font-bold text-stone-100">
                  {rejectedQuotes + expiredQuotes}
                </p>
                <p className="text-xs text-stone-400">Declined or expired</p>
              </TrackedActivityLink>
            </div>

            <div className="flex flex-wrap gap-2">
              {firstPendingQuote?.id ? (
                <TrackedActivityLink
                  href={`/my-quotes/${String(firstPendingQuote.id)}`}
                  entityType="client_dashboard_widget"
                  entityId="quotes"
                  metadata={{
                    action: 'review_pending_quote',
                    quote_id: String(firstPendingQuote.id),
                  }}
                >
                  <Button variant="primary" size="sm">
                    Review Pending Quote
                  </Button>
                </TrackedActivityLink>
              ) : null}
              <TrackedActivityLink
                href="/my-quotes"
                entityType="client_dashboard_widget"
                entityId="quotes"
                metadata={{ action: 'open_quotes' }}
              >
                <Button variant="secondary" size="sm">
                  Open Quotes
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ClientDashboardEmptyState message="No quotes yet. Your chef will send pricing here." />
            <TrackedActivityLink
              href="/my-inquiries"
              entityType="client_dashboard_widget"
              entityId="quotes"
              metadata={{ action: 'open_inquiries_for_quote_flow' }}
            >
              <Button variant="secondary" size="sm">
                View Inquiries
              </Button>
            </TrackedActivityLink>
          </div>
        )}
      </ClientDashboardWidgetShell>
    ),
    inquiries: (
      <ClientDashboardWidgetShell
        title="Inquiries"
        description="Keep an eye on inquiry status and pending responses."
      >
        {inquiries.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TrackedActivityLink
                href="/my-inquiries"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="inquiries"
                metadata={{ action: 'open_inquiries_total' }}
              >
                <p className="text-2xl font-bold text-stone-100">{inquiries.length}</p>
                <p className="text-xs text-stone-400">Active inquiries</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-inquiries"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="inquiries"
                metadata={{ action: 'open_inquiries_awaiting_client' }}
              >
                <p className="text-2xl font-bold text-stone-100">{awaitingClientInquiries}</p>
                <p className="text-xs text-stone-400">Awaiting your reply</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-inquiries"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="inquiries"
                metadata={{ action: 'open_inquiries_awaiting_chef' }}
              >
                <p className="text-2xl font-bold text-stone-100">{awaitingChefInquiries}</p>
                <p className="text-xs text-stone-400">Awaiting chef update</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-inquiries"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="inquiries"
                metadata={{ action: 'open_inquiries_quoted' }}
              >
                <p className="text-2xl font-bold text-stone-100">{quotedInquiries}</p>
                <p className="text-xs text-stone-400">Quoted inquiries</p>
              </TrackedActivityLink>
            </div>

            <div className="flex flex-wrap gap-2">
              {firstAwaitingClientInquiry?.id ? (
                <TrackedActivityLink
                  href={`/my-inquiries/${String(firstAwaitingClientInquiry.id)}`}
                  entityType="client_dashboard_widget"
                  entityId="inquiries"
                  metadata={{
                    action: 'respond_to_inquiry',
                    inquiry_id: String(firstAwaitingClientInquiry.id),
                  }}
                >
                  <Button variant="primary" size="sm">
                    Respond Now
                  </Button>
                </TrackedActivityLink>
              ) : null}
              <TrackedActivityLink
                href="/my-inquiries"
                entityType="client_dashboard_widget"
                entityId="inquiries"
                metadata={{ action: 'open_inquiries' }}
              >
                <Button variant="secondary" size="sm">
                  Open Inquiries
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ClientDashboardEmptyState message="No active inquiries right now." />
            <TrackedActivityLink
              href="/book-now"
              entityType="client_dashboard_widget"
              entityId="inquiries"
              metadata={{ action: 'book_from_inquiries_empty' }}
            >
              <Button variant="primary" size="sm">
                Start New Inquiry
              </Button>
            </TrackedActivityLink>
          </div>
        )}
      </ClientDashboardWidgetShell>
    ),
    messages: (
      <ClientDashboardWidgetShell
        title="Messages"
        description="Conversation activity and unread message count."
      >
        {inbox.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
                <p className="text-2xl font-bold text-stone-100">{unreadMessages}</p>
                <p className="text-xs text-stone-400">Unread messages</p>
              </div>
              <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
                <p className="text-2xl font-bold text-stone-100">{inbox.length}</p>
                <p className="text-xs text-stone-400">Conversations</p>
              </div>
              <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
                <p className="text-2xl font-bold text-stone-100">{conversationsWithUnread}</p>
                <p className="text-xs text-stone-400">Threads with unread</p>
              </div>
            </div>

            {latestConversation ? (
              <div className="rounded-lg border border-stone-700 bg-stone-900/40 p-4">
                <p className="text-sm font-medium text-stone-200">
                  Latest conversation:{' '}
                  {(latestConversation.other_participant_name as string) ?? 'Conversation'}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {latestConversation.last_message_at
                    ? format(new Date(String(latestConversation.last_message_at)), 'PPP p')
                    : 'No timestamp yet'}
                </p>
                {latestConversationPreview ? (
                  <p className="mt-2 text-sm text-stone-400">
                    {latestConversationPreview.slice(0, 140)}
                    {latestConversationPreview.length > 140 ? '...' : ''}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {latestConversation?.id ? (
                <TrackedActivityLink
                  href={latestConversationHref}
                  entityType="client_dashboard_widget"
                  entityId="messages"
                  metadata={{
                    action: 'open_latest_conversation',
                    conversation_id: String(latestConversation.id),
                  }}
                >
                  <Button variant="primary" size="sm">
                    Open Latest Thread
                  </Button>
                </TrackedActivityLink>
              ) : null}
              <TrackedActivityLink
                href="/my-chat"
                entityType="client_dashboard_widget"
                entityId="messages"
                metadata={{ action: 'open_messages_inbox' }}
              >
                <Button variant="secondary" size="sm">
                  {unreadMessages > 0 ? 'Review Unread' : 'Open Inbox'}
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ClientDashboardEmptyState message="No conversations yet. Start a thread with your chef." />
            <div className="flex flex-wrap gap-2">
              <MessageChefButton variant="button" />
              <TrackedActivityLink
                href="/my-chat"
                entityType="client_dashboard_widget"
                entityId="messages"
                metadata={{ action: 'open_messages_inbox' }}
              >
                <Button variant="secondary" size="sm">
                  Open Inbox
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        )}
      </ClientDashboardWidgetShell>
    ),
    upcoming_events: (
      <ClientDashboardWidgetShell
        title="Upcoming Events"
        description="Your confirmed and upcoming bookings."
      >
        {upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map((event: any) => (
              <EventCard key={event.id} event={event as ClientDashboardEvent} />
            ))}
            <div className="flex flex-wrap gap-2">
              <TrackedActivityLink
                href="/my-events"
                entityType="client_dashboard_widget"
                entityId="upcoming_events"
                metadata={{ action: 'open_upcoming_events_list' }}
              >
                <Button variant="secondary" size="sm">
                  Open Upcoming Events
                </Button>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/book-now"
                entityType="client_dashboard_widget"
                entityId="upcoming_events"
                metadata={{ action: 'book_from_upcoming_widget' }}
              >
                <Button variant="ghost" size="sm">
                  Book Another Event
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ClientDashboardEmptyState message="No upcoming events." />
            <div className="flex flex-wrap gap-2">
              <TrackedActivityLink
                href="/book-now"
                entityType="client_dashboard_widget"
                entityId="upcoming_events"
                metadata={{ action: 'book_from_upcoming_empty' }}
              >
                <Button variant="primary" size="sm">
                  Book an Event
                </Button>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-events/history"
                entityType="client_dashboard_widget"
                entityId="upcoming_events"
                metadata={{ action: 'open_history_from_upcoming_empty' }}
              >
                <Button variant="secondary" size="sm">
                  View Past Events
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        )}
      </ClientDashboardWidgetShell>
    ),
    event_history: (
      <ClientDashboardWidgetShell title="Event History" description="Past and cancelled bookings.">
        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-100">Past Events</h3>
              {pastTotalCount > 5 ? (
                <TrackedActivityLink
                  href="/my-events/history"
                  className="text-sm text-stone-500 underline underline-offset-2 hover:text-stone-300"
                  entityType="client_dashboard_widget"
                  entityId="event_history"
                  metadata={{ action: 'open_full_history_link' }}
                >
                  View all {pastTotalCount}
                </TrackedActivityLink>
              ) : null}
            </div>
            {past.length > 0 ? (
              <div className="space-y-4">
                {past.map((event: any) => (
                  <EventCard
                    key={event.id}
                    event={event as ClientDashboardEvent}
                    hasOutstandingBalance={pastWithBalance.has(event.id)}
                  />
                ))}
                {pastTotalCount > 5 ? (
                  <div className="pt-2 text-center">
                    <TrackedActivityLink
                      href="/my-events/history"
                      entityType="client_dashboard_widget"
                      entityId="event_history"
                      metadata={{ action: 'open_full_history_button' }}
                    >
                      <Button variant="ghost" size="sm">
                        + {pastTotalCount - 5} more past event{pastTotalCount - 5 !== 1 ? 's' : ''}
                      </Button>
                    </TrackedActivityLink>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <ClientDashboardEmptyState message="No past events yet." />
                <TrackedActivityLink
                  href="/book-now"
                  entityType="client_dashboard_widget"
                  entityId="event_history"
                  metadata={{ action: 'book_from_history_empty' }}
                >
                  <Button variant="secondary" size="sm">
                    Book Your First Event
                  </Button>
                </TrackedActivityLink>
              </div>
            )}
          </section>

          {cancelled.length > 0 ? (
            <section>
              <h3 className="mb-4 text-lg font-semibold text-stone-100">Cancelled Events</h3>
              <div className="space-y-4">
                {cancelled.map((event: any) => (
                  <EventCard key={event.id} event={event as ClientDashboardEvent} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </ClientDashboardWidgetShell>
    ),
    dinner_circle: (
      <ClientDashboardWidgetShell
        title="Dinner Circle"
        description="Social planning activity across groups and friends."
      >
        {dinnerCircleTotalSignals > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <TrackedActivityLink
                href="/my-hub"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="dinner_circle"
                metadata={{ action: 'open_hub_groups' }}
              >
                <p className="text-2xl font-bold text-stone-100">{hubSummary.groupCount}</p>
                <p className="text-xs text-stone-400">Groups</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-hub/friends"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="dinner_circle"
                metadata={{ action: 'open_hub_friends' }}
              >
                <p className="text-2xl font-bold text-stone-100">{hubSummary.friendCount}</p>
                <p className="text-xs text-stone-400">Friends</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-hub/friends"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="dinner_circle"
                metadata={{ action: 'review_pending_friend_requests' }}
              >
                <p className="text-2xl font-bold text-stone-100">
                  {hubSummary.pendingFriendRequestCount}
                </p>
                <p className="text-xs text-stone-400">Pending requests</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-hub/notifications"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="dinner_circle"
                metadata={{ action: 'open_hub_notifications' }}
              >
                <p className="text-2xl font-bold text-stone-100">{hubSummary.totalUnreadCount}</p>
                <p className="text-xs text-stone-400">Unread notifications</p>
              </TrackedActivityLink>
            </div>

            <p className="text-xs text-stone-500">
              {hubSummary.unreadLoadFailed
                ? 'Unable to load notification count.'
                : hubSummary.pendingFriendRequestCount > 0
                  ? 'You have ' +
                    hubSummary.pendingFriendRequestCount +
                    ' pending friend request(s).'
                  : hubSummary.totalUnreadCount > 0
                    ? hubSummary.totalUnreadCount + ' unread Dinner Circle notification(s).'
                    : 'Dinner Circle is up to date.'}
            </p>

            <div className="flex flex-wrap gap-2">
              <TrackedActivityLink
                href="/my-hub"
                entityType="client_dashboard_widget"
                entityId="dinner_circle"
                metadata={{ action: 'open_dinner_circle' }}
              >
                <Button variant="secondary" size="sm">
                  Open Dinner Circle
                </Button>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-hub/friends/invite"
                entityType="client_dashboard_widget"
                entityId="dinner_circle"
                metadata={{ action: 'invite_friend' }}
              >
                <Button variant="ghost" size="sm">
                  Invite Friends
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ClientDashboardEmptyState message="Your Dinner Circle is quiet right now." />
            <div className="flex flex-wrap gap-2">
              <TrackedActivityLink
                href="/my-hub/create"
                entityType="client_dashboard_widget"
                entityId="dinner_circle"
                metadata={{ action: 'create_group' }}
              >
                <Button variant="primary" size="sm">
                  Create Group
                </Button>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-hub/friends/invite"
                entityType="client_dashboard_widget"
                entityId="dinner_circle"
                metadata={{ action: 'invite_friend' }}
              >
                <Button variant="secondary" size="sm">
                  Invite Friends
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        )}
      </ClientDashboardWidgetShell>
    ),
    spending: (
      <ClientDashboardWidgetShell
        title="Spending"
        description="Snapshot of lifetime spend and upcoming commitments."
      >
        {spendingLoadError ? (
          <p className="text-sm text-stone-500">
            Unable to load spending data. Refresh to try again.
          </p>
        ) : hasSpendingActivity ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TrackedActivityLink
                href="/my-spending"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="spending"
                metadata={{ action: 'open_spending_lifetime' }}
              >
                <p className="text-sm text-stone-400">Lifetime spend</p>
                <p className="text-lg font-semibold text-stone-100">
                  {formatCurrency(spendingSummary.lifetimeSpendCents)}
                </p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-spending"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="spending"
                metadata={{ action: 'open_spending_this_year' }}
              >
                <p className="text-sm text-stone-400">This year</p>
                <p className="text-lg font-semibold text-stone-100">
                  {formatCurrency(spendingSummary.thisYearSpendCents)}
                </p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-spending"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="spending"
                metadata={{ action: 'open_spending_average_event' }}
              >
                <p className="text-sm text-stone-400">Average event</p>
                <p className="text-lg font-semibold text-stone-100">
                  {formatCurrency(spendingSummary.averageEventCents)}
                </p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-spending"
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="spending"
                metadata={{ action: 'open_spending_upcoming_committed' }}
              >
                <p className="text-sm text-stone-400">Upcoming committed</p>
                <p className="text-lg font-semibold text-stone-100">
                  {formatCurrency(spendingSummary.upcomingCommittedCents)}
                </p>
              </TrackedActivityLink>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-stone-500">
                {spendingSummary.eventsAttended} completed event
                {spendingSummary.eventsAttended === 1 ? '' : 's'} on record.
              </p>
              <TrackedActivityLink
                href="/my-spending"
                entityType="client_dashboard_widget"
                entityId="spending"
                metadata={{ action: 'open_spending_dashboard' }}
              >
                <Button variant="secondary" size="sm">
                  View Spending Breakdown
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ClientDashboardEmptyState message="No spending activity yet." />
            <div className="flex flex-wrap gap-2">
              <TrackedActivityLink
                href="/book-now"
                entityType="client_dashboard_widget"
                entityId="spending"
                metadata={{ action: 'book_from_spending_empty' }}
              >
                <Button variant="primary" size="sm">
                  Book First Event
                </Button>
              </TrackedActivityLink>
              <TrackedActivityLink
                href="/my-spending"
                entityType="client_dashboard_widget"
                entityId="spending"
                metadata={{ action: 'open_spending_dashboard' }}
              >
                <Button variant="secondary" size="sm">
                  Open Spending
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        )}
      </ClientDashboardWidgetShell>
    ),
    profile_health: (
      <ClientDashboardWidgetShell
        title="Profile Health"
        description="Profile completeness and preference readiness."
      >
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-stone-100">
              {profileSummary.completionPercent}% complete
            </p>
            <p className="text-sm text-stone-400">
              {profileSummary.completedFields}/{profileSummary.totalFields} core fields filled
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={profileSummary.completionPercent >= 100 ? 'success' : 'warning'}
              className="text-xs"
            >
              {profileSummary.completionPercent >= 100 ? 'Profile Complete' : 'Profile Incomplete'}
            </Badge>
            <Badge
              variant={profileSummary.pendingMealRequests > 0 ? 'warning' : 'success'}
              className="text-xs"
            >
              {profileSummary.pendingMealRequests > 0
                ? profileSummary.pendingMealRequests + ' Meal Request(s) Pending'
                : 'No Pending Meal Requests'}
            </Badge>
            <Badge
              variant={profileSummary.signalNotificationsEnabled ? 'success' : 'warning'}
              className="text-xs"
            >
              Signal Alerts {profileSummary.signalNotificationsEnabled ? 'On' : 'Off'}
            </Badge>
          </div>

          <p className="text-xs text-stone-500">
            {profileNeedsAttention
              ? 'Your profile has open items that may affect booking and event prep.'
              : 'Profile settings are in a healthy state for upcoming events.'}
          </p>

          <div className="flex flex-wrap gap-2">
            {profileSummary.completionPercent < 100 ? (
              <TrackedActivityLink
                href="/my-profile"
                entityType="client_dashboard_widget"
                entityId="profile_health"
                metadata={{ action: 'complete_profile' }}
              >
                <Button variant="primary" size="sm">
                  Finish Profile
                </Button>
              </TrackedActivityLink>
            ) : null}
            {profileSummary.pendingMealRequests > 0 ? (
              <TrackedActivityLink
                href="/my-profile"
                entityType="client_dashboard_widget"
                entityId="profile_health"
                metadata={{ action: 'review_meal_requests' }}
              >
                <Button variant="secondary" size="sm">
                  Review Meal Requests
                </Button>
              </TrackedActivityLink>
            ) : null}
            {!profileSummary.signalNotificationsEnabled ? (
              <TrackedActivityLink
                href="/my-profile"
                entityType="client_dashboard_widget"
                entityId="profile_health"
                metadata={{ action: 'enable_signal_alerts' }}
              >
                <Button variant="secondary" size="sm">
                  Enable Alerts
                </Button>
              </TrackedActivityLink>
            ) : null}
            <TrackedActivityLink
              href="/my-profile"
              entityType="client_dashboard_widget"
              entityId="profile_health"
              metadata={{ action: 'open_profile' }}
            >
              <Button variant="ghost" size="sm">
                Open Profile
              </Button>
            </TrackedActivityLink>
          </div>
        </div>
      </ClientDashboardWidgetShell>
    ),
    rsvp_ops: (
      <ClientDashboardWidgetShell
        title="RSVP Operations"
        description="Guest sharing and RSVP activity for your next hosted event."
      >
        {rsvpSummary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TrackedActivityLink
                href={`/my-events/${rsvpSummary.eventId}`}
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="rsvp_ops"
                metadata={{ action: 'open_rsvp_event' }}
              >
                <p className="text-sm text-stone-400">Event</p>
                <p className="truncate text-sm font-semibold text-stone-100">
                  {rsvpSummary.occasion || 'Upcoming Event'}
                </p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href={`/my-events/${rsvpSummary.eventId}`}
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="rsvp_ops"
                metadata={{ action: 'view_rsvp_total_guests' }}
              >
                <p className="text-2xl font-bold text-stone-100">{rsvpSummary.totalGuests}</p>
                <p className="text-xs text-stone-400">Total guests</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href={`/my-events/${rsvpSummary.eventId}`}
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="rsvp_ops"
                metadata={{ action: 'view_rsvp_attending' }}
              >
                <p className="text-2xl font-bold text-stone-100">{rsvpSummary.attendingCount}</p>
                <p className="text-xs text-stone-400">Attending</p>
              </TrackedActivityLink>
              <TrackedActivityLink
                href={`/my-events/${rsvpSummary.eventId}`}
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                entityType="client_dashboard_widget"
                entityId="rsvp_ops"
                metadata={{ action: 'view_rsvp_share_state' }}
              >
                <p className="text-sm font-semibold text-stone-100">
                  {rsvpSummary.hasActiveShare ? 'Share Active' : 'Share Inactive'}
                </p>
                <p className="text-xs text-stone-400">{rsvpSummary.pendingCount} pending RSVP(s)</p>
              </TrackedActivityLink>
            </div>

            <p className="text-xs text-stone-500">
              {rsvpSummary.pendingCount > 0
                ? 'You still have ' + rsvpSummary.pendingCount + ' pending RSVP response(s).'
                : 'All current RSVPs are responded.'}
            </p>

            <div className="flex flex-wrap gap-2">
              <TrackedActivityLink
                href={`/my-events/${rsvpSummary.eventId}`}
                entityType="client_dashboard_widget"
                entityId="rsvp_ops"
                metadata={{ action: 'open_rsvp_dashboard' }}
              >
                <Button variant="secondary" size="sm">
                  Open RSVP Dashboard
                </Button>
              </TrackedActivityLink>
              <TrackedActivityLink
                href={`/my-events/${rsvpSummary.eventId}/pre-event-checklist`}
                entityType="client_dashboard_widget"
                entityId="rsvp_ops"
                metadata={{ action: 'open_guest_checklist' }}
              >
                <Button variant="ghost" size="sm">
                  Guest Checklist
                </Button>
              </TrackedActivityLink>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ClientDashboardEmptyState message="No upcoming RSVP-enabled event found." />
            <TrackedActivityLink
              href="/my-events"
              entityType="client_dashboard_widget"
              entityId="rsvp_ops"
              metadata={{ action: 'open_events_for_rsvp' }}
            >
              <Button variant="secondary" size="sm">
                View Upcoming Events
              </Button>
            </TrackedActivityLink>
          </div>
        )}
      </ClientDashboardWidgetShell>
    ),
    documents: (
      <ClientDashboardWidgetShell
        title="Documents"
        description="Quick links to calendar and downloadable event documents."
      >
        {documentActions.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-stone-400">
              {documentActions.length} document action
              {documentActions.length !== 1 ? 's' : ''} ready.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {documentActions.map((action) => (
                <TrackedActivityLink
                  key={action.id}
                  href={action.href}
                  target={action.target}
                  rel={action.rel}
                  entityType="client_dashboard_widget"
                  entityId="documents"
                  metadata={{ action: 'open_' + action.id }}
                  className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-stone-600 transition-colors"
                >
                  <p className="text-sm font-semibold text-stone-100">{action.label}</p>
                  <p className="mt-1 text-xs text-stone-500">{action.detail}</p>
                </TrackedActivityLink>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ClientDashboardEmptyState message="No downloadable documents available yet." />
            <TrackedActivityLink
              href="/my-events"
              entityType="client_dashboard_widget"
              entityId="documents"
              metadata={{ action: 'open_events_for_documents' }}
            >
              <Button variant="secondary" size="sm">
                View Events
              </Button>
            </TrackedActivityLink>
          </div>
        )}
      </ClientDashboardWidgetShell>
    ),
    book_again: (
      <ClientDashboardWidgetShell
        title="Book Again"
        description="Start a new event inquiry with your chef."
      >
        <TrackedActivityLink
          href="/book-now"
          entityType="client_dashboard_widget"
          entityId="book_again"
          metadata={{ action: 'book_now' }}
        >
          <Button variant="primary" size="sm">
            Book Now
          </Button>
        </TrackedActivityLink>
      </ClientDashboardWidgetShell>
    ),
    assistant: (
      <ClientDashboardWidgetShell
        title="Assistant"
        description="Ask Remy about upcoming events, menus, and payment status."
      >
        <p className="text-sm text-stone-400">
          Remy is available on this page when this widget is enabled.
        </p>
      </ClientDashboardWidgetShell>
    ),
  }

  const visibleWidgets = preferences.dashboard_widgets.filter((widget) => widget.enabled)
  const assistantEnabled = visibleWidgets.some((widget) => widget.id === 'assistant')

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div data-tour="client-events-overview">
          <h1 className="text-3xl font-bold text-stone-100">My Events</h1>
          <p className="mt-2 text-stone-400" data-tour="client-make-payment">
            Manage your upcoming events and view past bookings
          </p>
        </div>
      </div>

      {/* Beta Onboarding Checklist - shown to beta testers */}
      {betaChecklist?.isBetaTester && (
        <div className="mb-6">
          <BetaOnboardingChecklist
            discountPercent={betaChecklist.discountPercent}
            checklist={betaChecklist.checklist}
            stepsCompleted={betaChecklist.stepsCompleted}
            totalSteps={betaChecklist.totalSteps}
            chefName={chefDisplayName}
          />
        </div>
      )}

      <ClientDashboardCollapseProvider>
        <div className="mb-4 flex items-center justify-between">
          <ClientDashboardCollapseControls />
          <TrackedActivityLink
            href="/my-events/settings/dashboard"
            entityType="client_dashboard_widget"
            entityId="layout_settings"
            metadata={{ action: 'open_dashboard_settings' }}
          >
            <Button variant="secondary" size="sm">
              Customize Dashboard
            </Button>
          </TrackedActivityLink>
        </div>

        {visibleWidgets.length > 0 ? (
          <ClientDashboardWidgetGrid>
            {visibleWidgets.map((widget) => (
              <ClientCollapsibleWidget
                key={widget.id}
                widgetId={widget.id}
                title={CLIENT_DASHBOARD_WIDGET_LABELS[widget.id]}
              >
                <div>{widgetContent[widget.id] ?? <ComingSoonWidget id={widget.id} />}</div>
              </ClientCollapsibleWidget>
            ))}
          </ClientDashboardWidgetGrid>
        ) : (
          <ClientDashboardEmptyState message="No widgets are enabled. Use Customize Dashboard to turn widgets back on." />
        )}
      </ClientDashboardCollapseProvider>

      {assistantEnabled ? <RemyClientChat /> : null}

      <MessageChefButton variant="fab" />

      {visibleWidgets.map((widget) => (
        <ActivityTracker
          key={`widget-viewed-${widget.id}`}
          eventType="page_viewed"
          entityType="client_dashboard_widget"
          entityId={widget.id}
          metadata={{ source: 'my_events_dashboard' }}
        />
      ))}

      <ActivityTracker
        eventType="events_list_viewed"
        metadata={{
          event_count: upcoming.length + pastTotalCount + cancelled.length,
          visible_widget_ids: visibleWidgets.map((widget) => widget.id),
          action_required_count: actionRequired.totalItems,
          unread_messages: unreadMessages,
        }}
      />
      {/* Live refresh: re-renders page when chef transitions an event or payment lands */}
      <ClientEventsRefresher />
    </div>
  )
}
