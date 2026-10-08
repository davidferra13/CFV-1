import {
  getClientBookingAction,
  getClientInquiryAction,
  getClientQuoteAction,
  type ActionGraphAction,
  type BookingAction,
} from '@/lib/action-graph/bookings'
import { getCurrentJourneyAction } from '@/lib/events/journey-steps'
import type {
  ClientEventAction,
  ClientEventStubSummary,
  ClientGraphEvent,
  ClientGraphInquiry,
  ClientGraphQuote,
  ClientNotificationWorkSummary,
  ClientRsvpWorkSummary,
  ClientWorkGraph,
  ClientWorkGraphInput,
  ClientWorkItem,
  ClientWorkItemCategory,
  ClientWorkItemKind,
  ClientWorkItemUrgency,
} from './types'

export type ClientNavSuggestion = {
  label: string
  href: string
}

const WORK_ITEM_PRIORITY: Record<ClientWorkItemKind, number> = {
  event_balance: 1_000,
  event_proposal: 950,
  event_contract: 900,
  event_payment: 875,
  event_booking_change: 845,
  quote_review: 860,
  event_menu: 820,
  event_checklist: 800,
  inquiry_reply: 780,
  rsvp_pending: 760,
  notification_follow_up: 730,
  hub_unread: 700,
  profile_completion: 660,
  meal_request: 640,
  signal_notifications: 620,
  share_setup: 600,
  stub_seeking_chef: 560,
  stub_planning: 540,
  event_review: 520,
}

const URGENCY_WEIGHT: Record<ClientWorkItemUrgency, number> = {
  high: 300,
  medium: 200,
  low: 100,
}

function formatShortDate(date: string | null | undefined): string | null {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

function getEventLabel(event: Pick<ClientGraphEvent, 'occasion'>): string {
  return event.occasion?.trim() || 'your event'
}

function normalizeCategory(kind: ClientWorkItemKind): ClientWorkItemCategory {
  if (kind.startsWith('event_')) return 'event'
  if (kind === 'quote_review') return 'quote'
  if (kind === 'inquiry_reply') return 'inquiry'
  if (kind === 'rsvp_pending' || kind === 'share_setup') return 'rsvp'
  if (kind === 'hub_unread') return 'hub'
  if (kind === 'notification_follow_up') return 'notification'
  if (kind === 'stub_planning' || kind === 'stub_seeking_chef') return 'planning'
  return 'profile'
}

function getUrgency(kind: ClientWorkItemKind): ClientWorkItemUrgency {
  switch (kind) {
    case 'event_balance':
    case 'event_proposal':
    case 'event_contract':
    case 'event_payment':
    case 'quote_review':
    case 'inquiry_reply':
    case 'rsvp_pending':
      return 'high'
    case 'event_booking_change':
    case 'event_menu':
    case 'event_checklist':
    case 'hub_unread':
    case 'notification_follow_up':
    case 'stub_seeking_chef':
      return 'medium'
    default:
      return 'low'
  }
}

function sortByPriority(items: ClientWorkItem[]): ClientWorkItem[] {
  return [...items].sort((left, right) => {
    const leftScore =
      WORK_ITEM_PRIORITY[left.kind] +
      URGENCY_WEIGHT[left.urgency] -
      Math.max(daysUntil(left.eventDate), -30)
    const rightScore =
      WORK_ITEM_PRIORITY[right.kind] +
      URGENCY_WEIGHT[right.urgency] -
      Math.max(daysUntil(right.eventDate), -30)

    if (rightScore !== leftScore) {
      return rightScore - leftScore
    }

    return left.title.localeCompare(right.title)
  })
}

function daysUntil(date: string | null | undefined): number {
  if (!date) return 365
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return 365

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const target = new Date(parsed)
  target.setHours(0, 0, 0, 0)

  return Math.round((target.getTime() - start.getTime()) / 86_400_000)
}

function createWorkItem(
  kind: ClientWorkItemKind,
  sourceId: string,
  sourceType: ClientWorkItem['sourceType'],
  title: string,
  detail: string,
  href: string,
  ctaLabel: string,
  eventDate?: string | null
): ClientWorkItem {
  return {
    id: `${kind}:${sourceId}`,
    kind,
    category: normalizeCategory(kind),
    sourceId,
    sourceType,
    urgency: getUrgency(kind),
    title,
    detail,
    href,
    ctaLabel,
    eventDate: eventDate ?? null,
  }
}

function getEventKindFromBookingAction(action: BookingAction): ClientWorkItemKind | null {
  switch (action.kind) {
    case 'proposal_review':
      return 'event_proposal'
    case 'contract_sign':
      return 'event_contract'
    case 'deposit_payment':
      return 'event_payment'
    case 'guest_count_review':
      return 'event_booking_change'
    case 'menu_review':
      return 'event_menu'
    default:
      return null
  }
}

function buildEventWorkItemFromBookingAction(
  event: ClientGraphEvent,
  action: BookingAction
): ClientWorkItem | null {
  const kind = getEventKindFromBookingAction(action)
  const projection = action.client

  if (!kind || !projection) return null

  return createWorkItem(
    kind,
    event.id,
    'event',
    projection.label,
    projection.description,
    projection.href,
    projection.ctaLabel,
    event.event_date
  )
}

function buildChecklistWorkItem(
  event: ClientGraphEvent,
  eventLabel: string,
  dateLabel: string | null
): ClientWorkItem | null {
  const action = getCurrentJourneyAction({
    eventId: event.id,
    occasion: event.occasion ?? null,
    eventStatus: event.status,
    menuApprovalStatus: event.menu_approval_status ?? null,
    menuApprovalUpdatedAt: event.menu_approval_updated_at ?? null,
    hasContract: event.hasContract ?? false,
    contractStatus: event.contractStatus ?? null,
    contractSignedAt: event.contractSignedAt ?? null,
    preEventChecklistConfirmedAt: event.pre_event_checklist_confirmed_at ?? null,
    hasOutstandingBalance: event.hasOutstandingBalance ?? false,
    hasReview: event.hasReview ?? false,
  })

  if (action?.key !== 'pre_event_checklist') return null

  return createWorkItem(
    'event_checklist',
    event.id,
    'event',
    `${action.actionLabel} for ${eventLabel}`,
    dateLabel
      ? `Confirm the final details for ${eventLabel} before ${dateLabel}.`
      : `Confirm the final details for ${eventLabel}.`,
    action.actionHref,
    action.actionLabel,
    event.event_date
  )
}

function buildEventWorkItem(event: ClientGraphEvent): ClientWorkItem | null {
  const eventLabel = getEventLabel(event)
  const dateLabel = formatShortDate(event.event_date)
  const acceptedContractPending =
    event.status === 'accepted' && event.hasContract && !event.contractSignedAt
  const balanceNeedsCollection =
    event.hasOutstandingBalance &&
    ['paid', 'confirmed', 'in_progress', 'completed'].includes(event.status)

  if (balanceNeedsCollection && !acceptedContractPending) {
    return createWorkItem(
      'event_balance',
      event.id,
      'event',
      `Pay the remaining balance for ${eventLabel}`,
      dateLabel
        ? `${eventLabel} has a balance due from your ${dateLabel} service.`
        : `${eventLabel} still has an outstanding balance.`,
      `/my-events/${event.id}/pay`,
      'Pay Balance',
      event.event_date
    )
  }

  if (event.status === 'completed' && !event.hasReview) {
    return createWorkItem(
      'event_review',
      event.id,
      'event',
      `Leave a review for ${eventLabel}`,
      dateLabel
        ? `Share feedback from your ${dateLabel} event.`
        : 'Share feedback from your event.',
      `/my-events/${event.id}#review`,
      'Leave Review',
      event.event_date
    )
  }

  const bookingAction = getClientBookingAction({
    id: event.id,
    status: event.status,
    occasion: event.occasion ?? null,
    event_date: event.event_date ?? null,
    hasContract: event.hasContract ?? false,
    contractStatus: event.contractStatus ?? null,
    contractSignedAt: event.contractSignedAt ?? null,
    menu_approval_status: event.menu_approval_status ?? null,
    menu_modified_after_approval: event.menu_modified_after_approval ?? null,
    pendingGuestCountChange: event.pendingGuestCountChange ?? null,
  })

  if (bookingAction) {
    const bookingWorkItem = buildEventWorkItemFromBookingAction(event, bookingAction)
    if (bookingWorkItem) return bookingWorkItem
  }

  return buildChecklistWorkItem(event, eventLabel, dateLabel)
}

function buildSharedGraphWorkItem(
  action: ActionGraphAction | null,
  sourceId: string,
  sourceType: ClientWorkItem['sourceType'],
  fallbackKind: ClientWorkItemKind
): ClientWorkItem | null {
  const projection = action?.client
  if (!action || !projection) return null

  const kind =
    action.kind === 'quote_review'
      ? 'quote_review'
      : action.kind === 'inquiry_reply'
        ? 'inquiry_reply'
        : fallbackKind

  return createWorkItem(
    kind,
    sourceId,
    sourceType,
    projection.label,
    projection.description,
    projection.href,
    projection.ctaLabel,
    action.eventDate
  )
}

function buildQuoteWorkItems(
  quotes: ClientGraphQuote[],
  eventActionIds: Set<string>
): ClientWorkItem[] {
  return quotes
    .filter((quote) => !(quote.event_id && eventActionIds.has(quote.event_id)))
    .map((quote) =>
      buildSharedGraphWorkItem(getClientQuoteAction(quote), quote.id, 'quote', 'quote_review')
    )
    .filter((item): item is ClientWorkItem => Boolean(item))
}

function buildInquiryWorkItems(inquiries: ClientGraphInquiry[]): ClientWorkItem[] {
  return inquiries
    .map((inquiry) =>
      buildSharedGraphWorkItem(
        getClientInquiryAction(inquiry),
        inquiry.id,
        'inquiry',
        'inquiry_reply'
      )
    )
    .filter((item): item is ClientWorkItem => Boolean(item))
}

function buildProfileWorkItems(
  profileSummary: ClientWorkGraphInput['profileSummary'],
  hasUpcomingWork: boolean
): ClientWorkItem[] {
  const items: ClientWorkItem[] = []

  if (profileSummary.completionPercent < 100) {
    items.push(
      createWorkItem(
        'profile_completion',
        'profile',
        'profile',
        'Complete your client profile',
        `${profileSummary.completedFields} of ${profileSummary.totalFields} profile checks are filled in.`,
        '/my-profile',
        'Update Profile'
      )
    )
  }

  if (profileSummary.pendingMealRequests > 0) {
    items.push(
      createWorkItem(
        'meal_request',
        'meal-requests',
        'profile',
        'Review meal collaboration updates',
        `${profileSummary.pendingMealRequests} meal request update${profileSummary.pendingMealRequests === 1 ? '' : 's'} need your attention.`,
        '/my-profile',
        'Open Meal Requests'
      )
    )
  }

  if (hasUpcomingWork && !profileSummary.signalNotificationsEnabled) {
    items.push(
      createWorkItem(
        'signal_notifications',
        'event-reminders',
        'profile',
        'Turn on event reminders',
        'Enable client signal notifications so you do not miss event reminders.',
        '/my-profile',
        'Enable Reminders'
      )
    )
  }

  return items
}

function buildRsvpWorkItems(rsvpSummary: ClientRsvpWorkSummary): ClientWorkItem[] {
  if (!rsvpSummary) return []

  if (rsvpSummary.pendingCount > 0) {
    return [
      createWorkItem(
        'rsvp_pending',
        rsvpSummary.eventId,
        'rsvp',
        `Check RSVPs for ${rsvpSummary.occasion || 'your event'}`,
        `${rsvpSummary.pendingCount} guest response${rsvpSummary.pendingCount === 1 ? '' : 's'} are still pending.`,
        `/my-events/${rsvpSummary.eventId}`,
        'View RSVPs'
      ),
    ]
  }

  if (!rsvpSummary.hasActiveShare) {
    return [
      createWorkItem(
        'share_setup',
        rsvpSummary.eventId,
        'rsvp',
        `Open guest sharing for ${rsvpSummary.occasion || 'your event'}`,
        'Invite guests and coordinate RSVPs from your event page.',
        `/my-events/${rsvpSummary.eventId}`,
        'Open Sharing'
      ),
    ]
  }

  return []
}

function buildHubWorkItems(hubSummary: ClientWorkGraphInput['hubSummary']): ClientWorkItem[] {
  if (hubSummary.totalUnreadCount <= 0) return []

  return [
    createWorkItem(
      'hub_unread',
      'hub-unread',
      'hub',
      'Read dinner circle updates',
      `${hubSummary.totalUnreadCount} unread circle message${hubSummary.totalUnreadCount === 1 ? '' : 's'} are waiting for you.`,
      '/my-hub/notifications',
      'Open Circles'
    ),
  ]
}

function buildNotificationWorkItems(
  notificationSummary: ClientNotificationWorkSummary,
  existingHrefs: Set<string>
): ClientWorkItem[] {
  if (notificationSummary.unreadCount <= 0) return []

  const match = notificationSummary.unread.find(
    (notification) => notification.actionUrl && !existingHrefs.has(notification.actionUrl)
  )

  if (!match?.actionUrl) return []

  return [
    createWorkItem(
      'notification_follow_up',
      match.id,
      'notification',
      match.title,
      `${notificationSummary.unreadCount} unread client notification${notificationSummary.unreadCount === 1 ? '' : 's'} remain in your portal.`,
      match.actionUrl,
      'Open Update'
    ),
  ]
}

function buildEventStubWorkItems(eventStubs: ClientEventStubSummary[]): ClientWorkItem[] {
  const activeStubs = eventStubs.filter(
    (stub) => stub.status !== 'cancelled' && stub.status !== 'adopted'
  )
  if (activeStubs.length === 0) return []

  const seekingChef = activeStubs.find((stub) => stub.status === 'seeking_chef')
  if (seekingChef) {
    return [
      createWorkItem(
        'stub_seeking_chef',
        seekingChef.id,
        'event_stub',
        `Track chef matching for ${seekingChef.title}`,
        'Your planning circle is already looking for a chef.',
        '/my-hub',
        'Open Planning'
      ),
    ]
  }

  const planning = activeStubs[0]
  return [
    createWorkItem(
      'stub_planning',
      planning.id,
      'event_stub',
      `Continue planning ${planning.title}`,
      'Finish the basics in your planning circle before you reach out to a chef.',
      '/my-hub',
      'Open Planning'
    ),
  ]
}

export function buildClientWorkGraph(input: ClientWorkGraphInput): ClientWorkGraph {
  const eventItems = input.events
    .map(buildEventWorkItem)
    .filter((item): item is ClientWorkItem => Boolean(item))
  const eventActionIds = new Set(eventItems.map((item) => item.sourceId))
  const quoteItems = buildQuoteWorkItems(input.quotes, eventActionIds)
  const inquiryItems = buildInquiryWorkItems(input.inquiries)
  const profileItems = buildProfileWorkItems(input.profileSummary, input.events.length > 0)
  const rsvpItems = buildRsvpWorkItems(input.rsvpSummary)
  const hubItems = buildHubWorkItems(input.hubSummary)
  const stubItems = buildEventStubWorkItems(input.eventStubs)
  const existingHrefs = new Set(
    [
      ...eventItems,
      ...quoteItems,
      ...inquiryItems,
      ...profileItems,
      ...rsvpItems,
      ...hubItems,
      ...stubItems,
    ].map((item) => item.href)
  )
  const notificationItems = buildNotificationWorkItems(input.notificationSummary, existingHrefs)

  const items = sortByPriority([
    ...eventItems,
    ...quoteItems,
    ...inquiryItems,
    ...profileItems,
    ...rsvpItems,
    ...hubItems,
    ...notificationItems,
    ...stubItems,
  ])

  const eventActionsById = items.reduce<Record<string, ClientEventAction>>((accumulator, item) => {
    if (item.sourceType !== 'event') return accumulator
    if (accumulator[item.sourceId]) return accumulator

    accumulator[item.sourceId] = {
      eventId: item.sourceId,
      kind: item.kind,
      title: item.title,
      detail: item.detail,
      href: item.href,
      ctaLabel: item.ctaLabel,
      urgency: item.urgency,
    }
    return accumulator
  }, {})

  const summary = {
    totalItems: items.length,
    proposalCount: items.filter((item) => item.kind === 'event_proposal').length,
    paymentDueCount: items.filter((item) => item.kind === 'event_payment').length,
    outstandingBalanceCount: items.filter((item) => item.kind === 'event_balance').length,
    quotePendingCount: items.filter((item) => item.kind === 'quote_review').length,
    inquiryAwaitingCount: items.filter((item) => item.kind === 'inquiry_reply').length,
    menuApprovalCount: items.filter((item) => item.kind === 'event_menu').length,
    checklistCount: items.filter((item) => item.kind === 'event_checklist').length,
    rsvpPendingCount: items.filter((item) => item.kind === 'rsvp_pending').length,
    hubUnreadCount: items.filter((item) => item.kind === 'hub_unread').length,
    profileCount: items.filter((item) =>
      ['profile_completion', 'meal_request', 'signal_notifications'].includes(item.kind)
    ).length,
    notificationCount: items.filter((item) => item.kind === 'notification_follow_up').length,
    planningCount: items.filter((item) =>
      ['stub_planning', 'stub_seeking_chef'].includes(item.kind)
    ).length,
  }

  return {
    generatedAt: new Date().toISOString(),
    primary: items[0] ?? null,
    items,
    eventActionsById,
    summary,
  }
}

function defaultPageSuggestions(message: string): ClientNavSuggestion[] {
  const normalized = message.toLowerCase()

  if (/(quote|proposal|price|cost)/.test(normalized)) {
    return [{ label: 'Open Quotes', href: '/my-quotes' }]
  }
  if (/(pay|payment|deposit|balance|invoice)/.test(normalized)) {
    return [{ label: 'Open Events', href: '/my-events' }]
  }
  if (
    /(guest count|change guest|booking change|change request|change my booking)/.test(normalized)
  ) {
    return [{ label: 'Open Events', href: '/my-events' }]
  }
  if (/(message|chat)/.test(normalized)) {
    return [{ label: 'Open Messages', href: '/my-chat' }]
  }
  if (/(profile|dietary|allerg|address|phone|preference)/.test(normalized)) {
    return [{ label: 'Open Profile', href: '/my-profile' }]
  }
  if (/(rsvp|guest|invite|share|circle|hub)/.test(normalized)) {
    return [{ label: 'Open Circles', href: '/my-hub' }]
  }
  if (/(book|booking|new event)/.test(normalized)) {
    return [{ label: 'Book Now', href: '/book-now' }]
  }

  return []
}

function matchesQuery(item: ClientWorkItem, message: string): boolean {
  const normalized = message.toLowerCase()

  if (/(quote|proposal|price|cost)/.test(normalized)) {
    return item.category === 'quote' || item.kind === 'event_proposal'
  }
  if (/(pay|payment|deposit|balance|invoice)/.test(normalized)) {
    return ['event_payment', 'event_balance', 'notification_follow_up'].includes(item.kind)
  }
  if (
    /(guest count|change guest|booking change|change request|change my booking)/.test(normalized)
  ) {
    return ['event_booking_change', 'rsvp_pending', 'share_setup'].includes(item.kind)
  }
  if (/(menu|dietary|allerg|meal|food)/.test(normalized)) {
    return ['event_menu', 'event_checklist', 'profile_completion', 'meal_request'].includes(
      item.kind
    )
  }
  if (/(rsvp|guest|invite|share)/.test(normalized)) {
    return ['rsvp_pending', 'share_setup', 'hub_unread'].includes(item.kind)
  }
  if (/(profile|address|phone|preference|account)/.test(normalized)) {
    return item.category === 'profile'
  }
  if (/(message|chat|circle|hub)/.test(normalized)) {
    return item.category === 'hub' || item.href.startsWith('/my-hub')
  }
  if (/(event|booking|next|upcoming)/.test(normalized)) {
    return item.category === 'event' || item.category === 'planning'
  }

  return false
}

function uniqueSuggestions(
  items: Array<{ label: string; href: string }>,
  limit: number
): ClientNavSuggestion[] {
  const seen = new Set<string>()
  const suggestions: ClientNavSuggestion[] = []

  for (const item of items) {
    if (!item.href || seen.has(item.href)) continue
    seen.add(item.href)
    suggestions.push(item)
    if (suggestions.length >= limit) break
  }

  return suggestions
}

export function suggestClientNavFromWorkGraph(
  message: string,
  workGraph: ClientWorkGraph,
  limit = 3
): ClientNavSuggestion[] {
  const matched = workGraph.items.filter((item) => matchesQuery(item, message))

  if (matched.length > 0) {
    return uniqueSuggestions(
      matched.map((item) => ({
        label: item.ctaLabel,
        href: item.href,
      })),
      limit
    )
  }

  const pageFallback = defaultPageSuggestions(message)
  if (pageFallback.length > 0) {
    return pageFallback.slice(0, limit)
  }

  return uniqueSuggestions(
    workGraph.items.map((item) => ({
      label: item.ctaLabel,
      href: item.href,
    })),
    limit
  )
}
