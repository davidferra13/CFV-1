import type { ActivityEvent, ActivityEventType } from '@/lib/activity/types'

export type ClientActivityIntentLevel = 'urgent' | 'interested' | 'active' | 'passive' | 'none'

export type ClientPortalActivitySignal = {
  id: string
  eventType: ActivityEventType
  label: string
  detail: string | null
  occurredAt: string
  href: string | null
}

export type ClientPortalActivityAction = {
  label: string
  href: string
  emphasis: 'primary' | 'secondary'
}

export type ClientPortalActivitySummary = {
  intentLevel: ClientActivityIntentLevel
  intentLabel: string
  lastActivity: ClientPortalActivitySignal | null
  recentSignals: ClientPortalActivitySignal[]
  nextActions: ClientPortalActivityAction[]
}

const EVENT_LABELS: Record<ActivityEventType, string> = {
  portal_login: 'Logged into the portal',
  event_viewed: 'Viewed an event',
  quote_viewed: 'Viewed a quote',
  invoice_viewed: 'Viewed an invoice',
  proposal_viewed: 'Viewed a proposal',
  chat_message_sent: 'Sent a message',
  rsvp_submitted: 'Submitted an RSVP',
  form_submitted: 'Submitted a form',
  page_viewed: 'Visited the portal',
  payment_page_visited: 'Visited the payment page',
  document_downloaded: 'Downloaded a document',
  events_list_viewed: 'Browsed events',
  quotes_list_viewed: 'Browsed quotes',
  chat_opened: 'Opened messages',
  rewards_viewed: 'Viewed rewards',
  session_heartbeat: 'Active session heartbeat',
  public_profile_viewed: 'Viewed public profile',
}

const INTENT_BY_EVENT: Partial<Record<ActivityEventType, ClientActivityIntentLevel>> = {
  payment_page_visited: 'urgent',
  proposal_viewed: 'interested',
  quote_viewed: 'interested',
  invoice_viewed: 'interested',
  chat_message_sent: 'active',
  rsvp_submitted: 'active',
  form_submitted: 'active',
  document_downloaded: 'active',
  event_viewed: 'active',
  quotes_list_viewed: 'passive',
  events_list_viewed: 'passive',
  chat_opened: 'passive',
  rewards_viewed: 'passive',
  portal_login: 'passive',
  page_viewed: 'passive',
  public_profile_viewed: 'passive',
}

const INTENT_LABELS: Record<ClientActivityIntentLevel, string> = {
  urgent: 'Payment attention',
  interested: 'Commercial interest',
  active: 'Active client signal',
  passive: 'Light portal activity',
  none: 'No portal activity',
}

const INTENT_RANK: Record<ClientActivityIntentLevel, number> = {
  urgent: 4,
  interested: 3,
  active: 2,
  passive: 1,
  none: 0,
}

const HIDDEN_EVENT_TYPES = new Set<ActivityEventType>(['session_heartbeat'])

export function buildClientPortalActivitySummary(
  events: ActivityEvent[],
  clientId: string
): ClientPortalActivitySummary {
  const portalEvents = events
    .filter((event) => event.actor_type === 'client')
    .filter((event) => !HIDDEN_EVENT_TYPES.has(event.event_type))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const recentSignals = portalEvents.slice(0, 3).map(toSignal)
  const lastActivity = recentSignals[0] ?? null
  const intentLevel = getIntentLevel(portalEvents)
  const relatedAction = getRelatedAction(recentSignals)
  const nextActions = buildNextActions({
    clientId,
    intentLevel,
    hasActivity: recentSignals.length > 0,
    relatedAction,
  })

  return {
    intentLevel,
    intentLabel: INTENT_LABELS[intentLevel],
    lastActivity,
    recentSignals,
    nextActions,
  }
}

function getIntentLevel(events: ActivityEvent[]): ClientActivityIntentLevel {
  let level: ClientActivityIntentLevel = 'none'

  for (const event of events) {
    const eventLevel = INTENT_BY_EVENT[event.event_type] ?? 'passive'
    if (INTENT_RANK[eventLevel] > INTENT_RANK[level]) {
      level = eventLevel
    }
  }

  return level
}

function toSignal(event: ActivityEvent): ClientPortalActivitySignal {
  return {
    id: event.id,
    eventType: event.event_type,
    label: EVENT_LABELS[event.event_type],
    detail: buildDetail(event),
    occurredAt: event.created_at,
    href: getEntityHref(event),
  }
}

function buildDetail(event: ActivityEvent): string | null {
  const metadata = event.metadata || {}
  const parts: string[] = []

  const occasion = getString(metadata.occasion)
  const pagePath = getString(metadata.page_path)
  const quoteNumber = getString(metadata.quote_number)
  const invoiceNumber = getString(metadata.invoice_number)
  const amountDisplay = getString(metadata.amount_display)
  const eventStatus = getString(metadata.event_status)
  const paymentAmount = formatCents(metadata.payment_amount_cents)
  const totalQuoted = formatCents(metadata.total_quoted_cents)

  if (occasion) parts.push(occasion)
  if (quoteNumber) parts.push(`Quote ${quoteNumber}`)
  if (invoiceNumber) parts.push(`Invoice ${invoiceNumber}`)
  if (amountDisplay) parts.push(amountDisplay)
  if (paymentAmount) parts.push(paymentAmount)
  if (!paymentAmount && totalQuoted) parts.push(totalQuoted)
  if (!occasion && eventStatus) parts.push(eventStatus)
  if (parts.length === 0 && pagePath) parts.push(pagePath)

  return parts.length > 0 ? parts.join(' | ') : null
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function formatCents(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return `$${(value / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function getEntityHref(event: ActivityEvent): string | null {
  if (!event.entity_id) return null

  if (event.entity_type === 'event') {
    return `/events/${event.entity_id}`
  }

  if (event.entity_type === 'quote') {
    return `/quotes/${event.entity_id}`
  }

  return null
}

function getRelatedAction(
  signals: ClientPortalActivitySignal[]
): ClientPortalActivityAction | null {
  const relatedSignal = signals.find((signal) => signal.href)
  if (!relatedSignal?.href) return null

  const label =
    relatedSignal.eventType === 'quote_viewed' || relatedSignal.href.includes('/quotes/')
      ? 'Open related quote'
      : 'Open related event'

  return {
    label,
    href: relatedSignal.href,
    emphasis: 'secondary',
  }
}

function buildNextActions(input: {
  clientId: string
  intentLevel: ClientActivityIntentLevel
  hasActivity: boolean
  relatedAction: ClientPortalActivityAction | null
}): ClientPortalActivityAction[] {
  const actions: ClientPortalActivityAction[] = []

  if (input.hasActivity && input.intentLevel !== 'passive') {
    actions.push({
      label: 'Message client',
      href: `/clients/${input.clientId}#outreach`,
      emphasis: 'primary',
    })
  }

  if (input.relatedAction) {
    actions.push(input.relatedAction)
  }

  actions.push({
    label: 'Open full presence',
    href: '/clients/presence',
    emphasis: input.hasActivity ? 'secondary' : 'primary',
  })

  return actions.slice(0, 3)
}
