import { buildQuoteDraftHref } from '@/lib/quotes/quote-prefill'

export type BookingActionKind =
  | 'proposal_review'
  | 'contract_send'
  | 'contract_sign'
  | 'deposit_payment'
  | 'guest_count_review'
  | 'menu_review'
  | 'menu_revision'

export type ActionGraphKind =
  | BookingActionKind
  | 'quote_review'
  | 'quote_follow_up'
  | 'quote_revision'
  | 'inquiry_reply'

export type BookingActionOwnerSurface = 'client' | 'chef'
export type BookingActionUrgency = 'critical' | 'high' | 'medium'
export type BookingActionSource =
  | 'event_status'
  | 'contract'
  | 'guest_count_change'
  | 'menu_approval'

export type ActionGraphSource =
  | BookingActionSource
  | 'inquiry_status'
  | 'quote_status'
  | 'quote_feedback'

export type ActionGraphEntityType = 'event' | 'inquiry' | 'quote'

export type BookingActionEvent = {
  id: string
  status: string
  occasion: string | null
  event_date: string | null
  hasContract?: boolean
  contractStatus?: string | null
  contractSignedAt?: string | null
  menu_approval_status?: string | null
  menu_modified_after_approval?: boolean | null
  pendingGuestCountChange?: {
    id: string
    previousCount: number
    newCount: number
    requestedAt: string
  } | null
}

export type InquiryActionRecord = {
  id: string
  client_id?: string | null
  status: string
  confirmed_occasion: string | null
  confirmed_date: string | null
  follow_up_due_at?: string | null
  next_action_required?: string | null
}

export type QuoteActionRecord = {
  id: string
  client_id?: string | null
  inquiry_id?: string | null
  event_id?: string | null
  status: string
  quote_name?: string | null
  valid_until?: string | null
  sent_at?: string | null
  rejected_reason?: string | null
  pricing_model?: string | null
  guest_count_estimated?: number | null
  total_quoted_cents?: number | null
  price_per_person_cents?: number | null
  deposit_required?: boolean | null
  deposit_amount_cents?: number | null
  deposit_percentage?: number | null
  pricing_notes?: string | null
  internal_notes?: string | null
  inquiry?: {
    confirmed_occasion?: string | null
    confirmed_date?: string | null
    confirmed_guest_count?: number | null
  } | null
  event?: {
    occasion?: string | null
    event_date?: string | null
  } | null
}

export type BookingActionProjection = {
  label: string
  description: string
  href: string
  ctaLabel: string
}

export type ActionGraphIntervention =
  | {
      mode: 'prepare'
      reason: 'reversible_draft'
      href: string
    }
  | {
      mode: 'approval_required'
      reason: 'focused_reply' | 'outbound_follow_up' | 'live_workflow'
    }

export type ActionGraphAction = {
  id: string
  entityType: ActionGraphEntityType
  entityId: string
  eventId: string | null
  kind: ActionGraphKind
  ownerSurface: BookingActionOwnerSurface
  urgency: BookingActionUrgency
  priority: number
  source: ActionGraphSource
  eventDate: string | null
  expiresAt: string | null
  evidence: string[]
  suppresses: ActionGraphKind[]
  client: BookingActionProjection | null
  chef: BookingActionProjection | null
  intervention: ActionGraphIntervention | null
}

export type BookingAction = ActionGraphAction & {
  entityType: 'event'
  entityId: string
  eventId: string
  kind: BookingActionKind
  source: BookingActionSource
}

const ACTION_GRAPH_PRIORITY: Record<ActionGraphKind, number> = {
  guest_count_review: 1_000,
  contract_send: 950,
  contract_sign: 900,
  deposit_payment: 875,
  quote_review: 860,
  menu_revision: 850,
  quote_revision: 840,
  menu_review: 820,
  proposal_review: 800,
  quote_follow_up: 790,
  inquiry_reply: 780,
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

function getEventLabel(event: Pick<BookingActionEvent, 'occasion'>): string {
  return event.occasion?.trim() || 'your event'
}

function getEventSortValue(date: string | null | undefined): number {
  if (!date) return Number.MAX_SAFE_INTEGER
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return Number.MAX_SAFE_INTEGER
  return parsed.getTime()
}

function getActionSortValue(action: Pick<ActionGraphAction, 'expiresAt' | 'eventDate'>): number {
  return getEventSortValue(action.expiresAt ?? action.eventDate)
}

function isActiveBookingStatus(status: string | null | undefined): boolean {
  return ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress'].includes(status ?? '')
}

function createActionGraphAction(params: {
  entityType: ActionGraphEntityType
  entityId: string
  eventId?: string | null
  kind: ActionGraphKind
  ownerSurface: BookingActionOwnerSurface
  urgency: BookingActionUrgency
  source: ActionGraphSource
  eventDate?: string | null
  expiresAt?: string | null
  evidence: string[]
  suppresses?: ActionGraphKind[]
  client?: BookingActionProjection | null
  chef?: BookingActionProjection | null
  intervention?: ActionGraphIntervention | null
}): ActionGraphAction {
  return {
    id: `${params.kind}:${params.entityType}:${params.entityId}`,
    entityType: params.entityType,
    entityId: params.entityId,
    eventId: params.eventId ?? null,
    kind: params.kind,
    ownerSurface: params.ownerSurface,
    urgency: params.urgency,
    priority: ACTION_GRAPH_PRIORITY[params.kind],
    source: params.source,
    eventDate: params.eventDate ?? null,
    expiresAt: params.expiresAt ?? params.eventDate ?? null,
    evidence: params.evidence,
    suppresses: params.suppresses ?? [],
    client: params.client ?? null,
    chef: params.chef ?? null,
    intervention: params.intervention ?? null,
  }
}

function createBookingAction(params: {
  event: BookingActionEvent
  kind: BookingActionKind
  ownerSurface: BookingActionOwnerSurface
  urgency: BookingActionUrgency
  source: BookingActionSource
  evidence: string[]
  suppresses?: ActionGraphKind[]
  client?: BookingActionProjection | null
  chef?: BookingActionProjection | null
  intervention?: ActionGraphIntervention | null
}): BookingAction {
  return createActionGraphAction({
    entityType: 'event',
    entityId: params.event.id,
    eventId: params.event.id,
    kind: params.kind,
    ownerSurface: params.ownerSurface,
    urgency: params.urgency,
    source: params.source,
    eventDate: params.event.event_date ?? null,
    expiresAt: params.event.event_date ?? null,
    evidence: params.evidence,
    suppresses: params.suppresses,
    client: params.client,
    chef: params.chef,
    intervention: params.intervention,
  }) as BookingAction
}

export function compareActionGraphActions(left: ActionGraphAction, right: ActionGraphAction): number {
  if (right.priority !== left.priority) {
    return right.priority - left.priority
  }

  return getActionSortValue(left) - getActionSortValue(right)
}

export function compareBookingActions(left: BookingAction, right: BookingAction): number {
  return compareActionGraphActions(left, right)
}

export function isContractClientSignable(contractStatus: string | null | undefined): boolean {
  return contractStatus === 'sent' || contractStatus === 'viewed'
}

export function isMenuClientReviewPending(
  menuApprovalStatus: string | null | undefined
): boolean {
  return menuApprovalStatus === 'sent'
}

export function buildCanonicalBookingActions(event: BookingActionEvent): BookingAction[] {
  if (!event.id) return []

  const actions: BookingAction[] = []
  const eventLabel = getEventLabel(event)
  const dateLabel = formatShortDate(event.event_date)

  if (event.pendingGuestCountChange && isActiveBookingStatus(event.status)) {
    const pendingChange = event.pendingGuestCountChange
    actions.push(
      createBookingAction({
        event,
        kind: 'guest_count_review',
        ownerSurface: 'chef',
        urgency: 'critical',
        source: 'guest_count_change',
        evidence: [
          `events.status=${event.status}`,
          `guest_count_changes.id=${pendingChange.id}`,
          `guest_count_changes.previous_count=${pendingChange.previousCount}`,
          `guest_count_changes.new_count=${pendingChange.newCount}`,
        ],
        client: {
          label: `Track your guest-count request for ${eventLabel}`,
          description: `Your request to change the guest count from ${pendingChange.previousCount} to ${pendingChange.newCount} is waiting on chef review.`,
          href: `/my-events/${event.id}#booking-change-center`,
          ctaLabel: 'View Request',
        },
        chef: {
          label: `Review guest-count request for ${eventLabel}`,
          description: `A client requested a guest-count change from ${pendingChange.previousCount} to ${pendingChange.newCount}.`,
          href: `/events/${event.id}?tab=money`,
          ctaLabel: 'Review Request',
        },
      })
    )
  }

  if (
    event.status === 'accepted' &&
    event.hasContract &&
    !event.contractSignedAt &&
    !isContractClientSignable(event.contractStatus)
  ) {
    actions.push(
      createBookingAction({
        event,
        kind: 'contract_send',
        ownerSurface: 'chef',
        urgency: 'critical',
        source: 'contract',
        evidence: [
          `events.status=${event.status}`,
          `event_contracts.status=${event.contractStatus ?? 'missing'}`,
          'contract signature is blocked until chef handoff completes',
        ],
        suppresses: ['contract_sign', 'deposit_payment'],
        chef: {
          label: `Send the contract for ${eventLabel}`,
          description: 'Payment is blocked until the service agreement is ready for client signature.',
          href: `/events/${event.id}`,
          ctaLabel: 'Open Event',
        },
      })
    )
  }

  if (event.status === 'proposed') {
    actions.push(
      createBookingAction({
        event,
        kind: 'proposal_review',
        ownerSurface: 'client',
        urgency: 'high',
        source: 'event_status',
        evidence: [`events.status=${event.status}`],
        suppresses: ['contract_sign', 'deposit_payment'],
        client: {
          label: `Review Proposal for ${eventLabel}`,
          description: dateLabel
            ? `Review the proposal for ${eventLabel} before ${dateLabel}.`
            : `Review the proposal for ${eventLabel}.`,
          href: `/my-events/${event.id}/proposal`,
          ctaLabel: 'Review Proposal',
        },
      })
    )
  }

  if (
    event.status === 'accepted' &&
    event.hasContract &&
    !event.contractSignedAt &&
    isContractClientSignable(event.contractStatus)
  ) {
    actions.push(
      createBookingAction({
        event,
        kind: 'contract_sign',
        ownerSurface: 'client',
        urgency: 'high',
        source: 'contract',
        evidence: [
          `events.status=${event.status}`,
          `event_contracts.status=${event.contractStatus ?? 'missing'}`,
        ],
        suppresses: ['deposit_payment'],
        client: {
          label: `Sign Contract for ${eventLabel}`,
          description: dateLabel
            ? `Sign the agreement for ${eventLabel} before ${dateLabel}.`
            : `Sign the agreement for ${eventLabel}.`,
          href: `/my-events/${event.id}/contract`,
          ctaLabel: 'Sign Contract',
        },
      })
    )
  }

  if (
    event.status === 'accepted' &&
    (!event.hasContract || Boolean(event.contractSignedAt) || event.contractStatus === 'signed')
  ) {
    actions.push(
      createBookingAction({
        event,
        kind: 'deposit_payment',
        ownerSurface: 'client',
        urgency: 'high',
        source: 'event_status',
        evidence: [
          `events.status=${event.status}`,
          event.hasContract
            ? `event_contracts.status=${event.contractStatus ?? 'signed'}`
            : 'event_contracts.status=not_required',
        ],
        client: {
          label: `Pay for ${eventLabel}`,
          description: dateLabel
            ? `Complete payment for ${eventLabel} before ${dateLabel}.`
            : `Complete payment for ${eventLabel}.`,
          href: `/my-events/${event.id}/pay`,
          ctaLabel: 'Pay Now',
        },
      })
    )
  }

  if (
    isActiveBookingStatus(event.status) &&
    (event.menu_approval_status === 'revision_requested' ||
      (event.menu_approval_status === 'approved' && Boolean(event.menu_modified_after_approval)))
  ) {
    const approvalNeedsRefresh =
      event.menu_approval_status === 'approved' && Boolean(event.menu_modified_after_approval)
    actions.push(
      createBookingAction({
        event,
        kind: 'menu_revision',
        ownerSurface: 'chef',
        urgency: 'high',
        source: 'menu_approval',
        evidence: [
          `events.status=${event.status}`,
          `events.menu_approval_status=${event.menu_approval_status ?? 'missing'}`,
          approvalNeedsRefresh ? 'events.menu_modified_after_approval=true' : 'client requested revisions',
        ],
        suppresses: ['menu_review'],
        chef: {
          label: approvalNeedsRefresh
            ? `Resend the updated menu for ${eventLabel}`
            : `Revise the menu for ${eventLabel}`,
          description: approvalNeedsRefresh
            ? 'The menu changed after approval and needs a fresh client sign-off.'
            : 'The client requested menu changes and is waiting on a revised version.',
          href: `/events/${event.id}/menu-approval`,
          ctaLabel: approvalNeedsRefresh ? 'Resend Menu' : 'Revise Menu',
        },
      })
    )
  }

  if (isActiveBookingStatus(event.status) && isMenuClientReviewPending(event.menu_approval_status)) {
    actions.push(
      createBookingAction({
        event,
        kind: 'menu_review',
        ownerSurface: 'client',
        urgency: 'medium',
        source: 'menu_approval',
        evidence: [
          `events.status=${event.status}`,
          `events.menu_approval_status=${event.menu_approval_status ?? 'missing'}`,
        ],
        client: {
          label: `Review Menu for ${eventLabel}`,
          description: dateLabel
            ? `Approve the menu for ${eventLabel} before ${dateLabel}.`
            : `Approve the menu for ${eventLabel}.`,
          href: `/my-events/${event.id}/approve-menu`,
          ctaLabel: 'Review Menu',
        },
      })
    )
  }

  return [...actions].sort(compareBookingActions)
}

function getInquiryLabel(
  inquiry: Pick<InquiryActionRecord, 'confirmed_occasion'>
): string {
  return inquiry.confirmed_occasion?.trim() || 'your inquiry'
}

function getQuoteLabel(quote: QuoteActionRecord): string {
  return (
    quote.quote_name?.trim() ||
    quote.inquiry?.confirmed_occasion?.trim() ||
    quote.event?.occasion?.trim() ||
    'your quote'
  )
}

function getQuoteDate(quote: QuoteActionRecord): string | null {
  return quote.event?.event_date ?? quote.inquiry?.confirmed_date ?? null
}

function isQuoteExpiringWithinWindow(
  validUntil: string | null | undefined,
  windowDays: number
): boolean {
  if (!validUntil) return false

  const expiresAt = new Date(validUntil)
  if (Number.isNaN(expiresAt.getTime())) return false

  const now = new Date()
  const windowEnd = new Date(now)
  windowEnd.setDate(windowEnd.getDate() + windowDays)
  return expiresAt.getTime() >= now.getTime() && expiresAt.getTime() <= windowEnd.getTime()
}

function shouldCarryForwardValidUntil(value: string | null | undefined): boolean {
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  parsed.setHours(0, 0, 0, 0)
  return parsed.getTime() >= today.getTime()
}

function buildRevisionQuoteName(baseLabel: string): string {
  return /revised/i.test(baseLabel) ? baseLabel : `${baseLabel} Revised`
}

function buildQuoteRevisionInternalNotes(quote: QuoteActionRecord): string | undefined {
  const parts: string[] = []

  if (quote.internal_notes?.trim()) {
    parts.push(quote.internal_notes.trim())
  }

  parts.push(`Prepared from rejected quote ${quote.id}.`)

  if (quote.rejected_reason?.trim()) {
    parts.push(`Client feedback: ${quote.rejected_reason.trim()}`)
  }

  const combined = parts.join('\n\n').trim()
  return combined ? combined.slice(0, 1_200) : undefined
}

function buildQuoteRevisionHref(quote: QuoteActionRecord): string {
  const quoteLabel = getQuoteLabel(quote)
  const pricingModel =
    quote.pricing_model === 'flat_rate' ||
    quote.pricing_model === 'per_person' ||
    quote.pricing_model === 'custom'
      ? quote.pricing_model
      : undefined
  const carriedValidUntil =
    quote.valid_until && shouldCarryForwardValidUntil(quote.valid_until)
      ? quote.valid_until
      : undefined

  return buildQuoteDraftHref({
    source: 'quote_revision',
    client_id: quote.client_id ?? undefined,
    inquiry_id: quote.inquiry_id ?? undefined,
    event_id: quote.event_id ?? undefined,
    quote_name: buildRevisionQuoteName(quoteLabel),
    pricing_model: pricingModel,
    guest_count: quote.guest_count_estimated ?? quote.inquiry?.confirmed_guest_count ?? undefined,
    total_cents: quote.total_quoted_cents ?? undefined,
    price_per_person_cents: quote.price_per_person_cents ?? undefined,
    deposit_required: quote.deposit_required ?? undefined,
    deposit_amount_cents: quote.deposit_amount_cents ?? undefined,
    deposit_percentage: quote.deposit_percentage ?? undefined,
    valid_until: carriedValidUntil,
    pricing_notes: quote.pricing_notes ?? undefined,
    internal_notes: buildQuoteRevisionInternalNotes(quote),
  })
}

export function buildCanonicalInquiryActions(inquiry: InquiryActionRecord): ActionGraphAction[] {
  if (!inquiry.id) return []

  const actions: ActionGraphAction[] = []
  const inquiryLabel = getInquiryLabel(inquiry)
  const dateLabel = formatShortDate(inquiry.confirmed_date)
  const baseEvidence = [
    `inquiries.status=${inquiry.status}`,
    inquiry.follow_up_due_at
      ? `inquiries.follow_up_due_at=${inquiry.follow_up_due_at}`
      : 'inquiries.follow_up_due_at=missing',
    inquiry.next_action_required
      ? `inquiries.next_action_required=${inquiry.next_action_required}`
      : 'inquiries.next_action_required=missing',
  ]

  if (['new', 'awaiting_chef'].includes(inquiry.status)) {
    const isNewInquiry = inquiry.status === 'new'
    actions.push(
      createActionGraphAction({
        entityType: 'inquiry',
        entityId: inquiry.id,
        kind: 'inquiry_reply',
        ownerSurface: 'chef',
        urgency: 'critical',
        source: 'inquiry_status',
        eventDate: inquiry.confirmed_date ?? null,
        expiresAt: inquiry.follow_up_due_at ?? inquiry.confirmed_date ?? null,
        evidence: baseEvidence,
        chef: {
          label: isNewInquiry ? `Reply to new ${inquiryLabel}` : `Reply about ${inquiryLabel}`,
          description:
            inquiry.next_action_required?.trim() ||
            (dateLabel
              ? `Keep ${inquiryLabel} moving for ${dateLabel}.`
              : 'This inquiry is waiting on your reply.'),
          href: `/inquiries/${inquiry.id}`,
          ctaLabel: 'Open Inquiry',
        },
        intervention: {
          mode: 'approval_required',
          reason: 'focused_reply',
        },
      })
    )
  }

  if (inquiry.status === 'awaiting_client') {
    actions.push(
      createActionGraphAction({
        entityType: 'inquiry',
        entityId: inquiry.id,
        kind: 'inquiry_reply',
        ownerSurface: 'client',
        urgency: 'high',
        source: 'inquiry_status',
        eventDate: inquiry.confirmed_date ?? null,
        expiresAt: inquiry.follow_up_due_at ?? inquiry.confirmed_date ?? null,
        evidence: baseEvidence,
        client: {
          label: `Reply about ${inquiryLabel}`,
          description: dateLabel
            ? `Your chef needs a response to keep ${inquiryLabel} moving for ${dateLabel}.`
            : `Your chef needs a response to keep ${inquiryLabel} moving.`,
          href: `/my-inquiries/${inquiry.id}`,
          ctaLabel: 'Reply',
        },
      })
    )
  }

  return [...actions].sort(compareActionGraphActions)
}

export function buildCanonicalQuoteActions(quote: QuoteActionRecord): ActionGraphAction[] {
  if (!quote.id) return []

  const actions: ActionGraphAction[] = []
  const quoteLabel = getQuoteLabel(quote)
  const quoteDate = getQuoteDate(quote)
  const dateLabel = formatShortDate(quoteDate)
  const validUntilLabel = formatShortDate(quote.valid_until ?? null)
  const baseEvidence = [
    `quotes.status=${quote.status}`,
    quote.valid_until ? `quotes.valid_until=${quote.valid_until}` : 'quotes.valid_until=missing',
    quote.event_id ? `quotes.event_id=${quote.event_id}` : 'quotes.event_id=missing',
    quote.inquiry_id ? `quotes.inquiry_id=${quote.inquiry_id}` : 'quotes.inquiry_id=missing',
  ]

  if (quote.status === 'sent') {
    actions.push(
      createActionGraphAction({
        entityType: 'quote',
        entityId: quote.id,
        eventId: quote.event_id ?? null,
        kind: 'quote_review',
        ownerSurface: 'client',
        urgency: 'high',
        source: 'quote_status',
        eventDate: quoteDate,
        expiresAt: quote.valid_until ?? null,
        evidence: baseEvidence,
        client: {
          label: `Review ${quoteLabel}`,
          description: validUntilLabel
            ? `${quoteLabel} is waiting on your decision before ${validUntilLabel}.`
            : `${quoteLabel} is waiting on your decision.`,
          href: `/my-quotes/${quote.id}`,
          ctaLabel: 'Review Quote',
        },
      })
    )

    if (quote.client_id && isQuoteExpiringWithinWindow(quote.valid_until ?? null, 7)) {
      actions.push(
        createActionGraphAction({
          entityType: 'quote',
          entityId: quote.id,
          eventId: quote.event_id ?? null,
          kind: 'quote_follow_up',
          ownerSurface: 'chef',
          urgency: 'high',
          source: 'quote_status',
          eventDate: quoteDate,
          expiresAt: quote.valid_until ?? null,
          evidence: baseEvidence,
          chef: {
            label: `Follow up on ${quoteLabel}`,
            description: validUntilLabel
              ? `${quoteLabel} expires by ${validUntilLabel}. Use the relationship workspace for the outreach.`
              : `A sent quote still needs follow-through from the relationship workspace.`,
            href: `/clients/${quote.client_id}/relationship`,
            ctaLabel: 'Open Follow-Up',
          },
          intervention: {
            mode: 'approval_required',
            reason: 'outbound_follow_up',
          },
        })
      )
    }
  }

  if (quote.status === 'rejected' && quote.client_id) {
    const revisionHref = buildQuoteRevisionHref(quote)

    actions.push(
      createActionGraphAction({
        entityType: 'quote',
        entityId: quote.id,
        eventId: quote.event_id ?? null,
        kind: 'quote_revision',
        ownerSurface: 'chef',
        urgency: 'high',
        source: 'quote_feedback',
        eventDate: quoteDate,
        expiresAt: quote.valid_until ?? null,
        evidence: [
          ...baseEvidence,
          quote.rejected_reason
            ? `quotes.rejected_reason=${quote.rejected_reason}`
            : 'quotes.rejected_reason=missing',
        ],
        suppresses: ['inquiry_reply'],
        chef: {
          label: `Prepare revised quote for ${quoteLabel}`,
          description:
            quote.rejected_reason?.trim() ||
            (dateLabel
              ? `Open a revised draft for ${quoteLabel} and keep the ${dateLabel} service moving.`
              : 'Open a revised draft before following up with the client.'),
          href: revisionHref,
          ctaLabel: 'Open Revised Draft',
        },
        intervention: {
          mode: 'prepare',
          reason: 'reversible_draft',
          href: revisionHref,
        },
      })
    )
  }

  return [...actions].sort(compareActionGraphActions)
}

export function getClientBookingAction(event: BookingActionEvent): BookingAction | null {
  return buildCanonicalBookingActions(event).find((action) => action.client) ?? null
}

export function getChefBookingAction(event: BookingActionEvent): BookingAction | null {
  return (
    buildCanonicalBookingActions(event).find(
      (action) => action.ownerSurface === 'chef' && action.chef
    ) ?? null
  )
}

export function getClientInquiryAction(inquiry: InquiryActionRecord): ActionGraphAction | null {
  return buildCanonicalInquiryActions(inquiry).find((action) => action.client) ?? null
}

export function getChefInquiryAction(inquiry: InquiryActionRecord): ActionGraphAction | null {
  return (
    buildCanonicalInquiryActions(inquiry).find(
      (action) => action.ownerSurface === 'chef' && action.chef
    ) ?? null
  )
}

export function getClientQuoteAction(quote: QuoteActionRecord): ActionGraphAction | null {
  return buildCanonicalQuoteActions(quote).find((action) => action.client) ?? null
}

export function getChefQuoteAction(quote: QuoteActionRecord): ActionGraphAction | null {
  return (
    buildCanonicalQuoteActions(quote).find(
      (action) => action.ownerSurface === 'chef' && action.chef
    ) ?? null
  )
}
