import {
  buildLifecycleCallHref,
  type LifecycleCallHrefInput,
  type LifecycleCallType,
} from '@/lib/calls/lifecycle-prefill'

export type CallRecommendationKind =
  | 'call_now'
  | 'schedule_discovery'
  | 'schedule_proposal_walkthrough'
  | 'schedule_logistics'
  | 'schedule_day_after_followup'
  | 'schedule_menu_alignment'
  | 'schedule_deposit_close'
  | 'schedule_reactivation'

export type CallRecommendationUrgency = 'now' | 'soon' | 'normal'

export type CallRecommendation = {
  kind: CallRecommendationKind
  callType: LifecycleCallType
  urgency: CallRecommendationUrgency
  label: string
  reason: string
  title: string
  prepNotes: string
  durationMinutes: number
}

export type CallRecommendationMessage = {
  body?: string | null
  created_at?: string | null
  direction?: string | null
  sent_at?: string | null
  status?: string | null
}

export type CallRecommendationQuote = {
  status?: string | null
}

export type InquiryCallRecommendationInput = {
  id: string
  status: string
  clientName?: string | null
  hasClient?: boolean
  hasPhone?: boolean
  confirmedDate?: string | null
  confirmedGuestCount?: number | null
  confirmedLocation?: string | null
  confirmedBudgetCents?: number | null
  confirmedOccasion?: string | null
  followUpDueAt?: string | null
  firstContactAt?: string | null
  updatedAt?: string | null
  messages?: CallRecommendationMessage[]
  quotes?: CallRecommendationQuote[]
}

export type EventCallRecommendationInput = {
  id: string
  status: string
  clientName?: string | null
  hasClient?: boolean
  hasPhone?: boolean
  eventDate?: string | null
  occasion?: string | null
  depositAmountCents?: number | null
  totalPaidCents?: number | null
  followUpSent?: boolean | null
  serviceCompletedAt?: string | null
  updatedAt?: string | null
  messages?: CallRecommendationMessage[]
}

const TERMINAL_INQUIRY_STATUSES = new Set(['declined', 'expired', 'confirmed'])
const TERMINAL_EVENT_STATUSES = new Set(['cancelled'])
const ACTIVE_INQUIRY_STATUSES = new Set(['new', 'awaiting_chef', 'quoted', 'awaiting_client'])
const PROPOSAL_EVENT_STATUSES = new Set(['proposed', 'accepted', 'paid'])
const MENU_ALIGNMENT_PATTERNS = [
  'allergy',
  'allergic',
  'dietary',
  'menu',
  'change',
  'swap',
  'instead',
  'substitute',
  'vegetarian',
  'vegan',
  'gluten',
  'shellfish',
]
const PRICE_PATTERNS = ['price', 'pricing', 'budget', 'cost', 'quote', 'deposit', 'pay', 'payment']
const REBOOK_PATTERNS = ['again', 'next time', 'another', 'holiday', 'birthday', 'monthly']
const HUMAN_TOUCH_PATTERNS = [
  'call me',
  'can we talk',
  'could we talk',
  'can we hop on',
  'phone',
  'urgent',
  'asap',
  'confused',
  'not sure',
  'unclear',
  'concern',
  'worried',
  'complicated',
  'overwhelmed',
]

function nowMs(): number {
  return Date.now()
}

function toMs(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

function hoursSince(value: string | null | undefined): number | null {
  const ms = toMs(value)
  return ms === null ? null : (nowMs() - ms) / 36e5
}

function daysUntil(value: string | null | undefined): number | null {
  const ms = toMs(value)
  return ms === null ? null : (ms - nowMs()) / 864e5
}

function daysSince(value: string | null | undefined): number | null {
  const ms = toMs(value)
  return ms === null ? null : (nowMs() - ms) / 864e5
}

function textIncludesAny(value: string, patterns: string[]): boolean {
  const lower = value.toLowerCase()
  return patterns.some((pattern) => lower.includes(pattern))
}

function latestInboundMessage(messages: CallRecommendationMessage[] = []) {
  return messages
    .filter((message) => message.direction === 'inbound')
    .sort((a, b) => (toMs(b.sent_at ?? b.created_at) ?? 0) - (toMs(a.sent_at ?? a.created_at) ?? 0))
    .at(0)
}

function latestOutboundMessage(messages: CallRecommendationMessage[] = []) {
  return messages
    .filter((message) => message.direction === 'outbound')
    .sort((a, b) => (toMs(b.sent_at ?? b.created_at) ?? 0) - (toMs(a.sent_at ?? a.created_at) ?? 0))
    .at(0)
}

function hasRecentInboundSignal(
  messages: CallRecommendationMessage[] | undefined,
  patterns: string[]
): boolean {
  const inbound = latestInboundMessage(messages)
  if (!inbound?.body) return false
  const ageHours = hoursSince(inbound.sent_at ?? inbound.created_at)
  return (ageHours === null || ageHours <= 72) && textIncludesAny(inbound.body, patterns)
}

function isClientQuietAfterOutbound(messages: CallRecommendationMessage[] = []): boolean {
  const inbound = latestInboundMessage(messages)
  const outbound = latestOutboundMessage(messages)
  const outboundMs = toMs(outbound?.sent_at ?? outbound?.created_at)
  if (!outboundMs) return false

  const inboundMs = toMs(inbound?.sent_at ?? inbound?.created_at)
  if (inboundMs && inboundMs > outboundMs) return false

  return (nowMs() - outboundMs) / 36e5 >= 24
}

function knownFactCount(input: InquiryCallRecommendationInput): number {
  return [
    input.confirmedDate,
    input.confirmedGuestCount,
    input.confirmedLocation,
    input.confirmedBudgetCents,
    input.confirmedOccasion,
  ].filter(Boolean).length
}

function clientLabel(name: string | null | undefined): string {
  return name?.trim() || 'client'
}

export function recommendCallForInquiry(
  input: InquiryCallRecommendationInput
): CallRecommendation | null {
  if (TERMINAL_INQUIRY_STATUSES.has(input.status)) return null
  if (!ACTIVE_INQUIRY_STATUSES.has(input.status)) return null

  const name = clientLabel(input.clientName)
  const hasSentQuote = (input.quotes ?? []).some((quote) =>
    ['sent', 'viewed', 'accepted'].includes(String(quote.status))
  )
  const followUpHours = hoursSince(input.followUpDueAt)
  const firstContactHours = hoursSince(input.firstContactAt)
  const clientIsQuiet = isClientQuietAfterOutbound(input.messages)
  const priceSignal = hasRecentInboundSignal(input.messages, PRICE_PATTERNS)
  const menuSignal = hasRecentInboundSignal(input.messages, MENU_ALIGNMENT_PATTERNS)
  const humanTouchSignal = hasRecentInboundSignal(input.messages, HUMAN_TOUCH_PATTERNS)

  if (hasSentQuote || input.status === 'quoted' || priceSignal) {
    return {
      kind: clientIsQuiet || priceSignal ? 'call_now' : 'schedule_proposal_walkthrough',
      callType: 'proposal_walkthrough',
      urgency: clientIsQuiet || priceSignal ? 'now' : 'soon',
      label: clientIsQuiet || priceSignal ? 'Call About Proposal' : 'Schedule Proposal Call',
      reason: clientIsQuiet
        ? 'The proposal or pricing conversation is active and the client has gone quiet.'
        : 'A pricing or proposal decision is in play, and a call can prevent price-only comparison.',
      title: `Proposal walkthrough with ${name}`,
      prepNotes:
        'Walk through scope, price, deposit timing, cancellation terms, and any open client questions.',
      durationMinutes: 20,
    }
  }

  if (humanTouchSignal) {
    return {
      kind: 'call_now',
      callType: 'follow_up',
      urgency: 'now',
      label: 'Call To Unblock The Thread',
      reason:
        'The client thread shows confusion, urgency, concern, or a direct request to talk. A human call should happen before more chat.',
      title: `Human follow-up call with ${name}`,
      prepNotes:
        'Resolve the unclear point live, preserve tone, restate the decision, and log the next action back into ChefFlow.',
      durationMinutes: 15,
    }
  }

  if (menuSignal) {
    return {
      kind: 'schedule_menu_alignment',
      callType: 'follow_up',
      urgency: 'soon',
      label: 'Schedule Menu Alignment Call',
      reason:
        'Recent client messages mention menu, allergy, dietary, or substitution changes that should be clarified live.',
      title: `Menu alignment call with ${name}`,
      prepNotes:
        'Clarify dietary needs, menu boundaries, scope changes, and what needs to be confirmed before proposal or service.',
      durationMinutes: 20,
    }
  }

  if (followUpHours !== null && followUpHours >= 0) {
    return {
      kind: 'call_now',
      callType: 'follow_up',
      urgency: 'now',
      label: 'Call Before This Goes Cold',
      reason: 'The inquiry follow-up deadline has arrived or passed.',
      title: `Follow-up call with ${name}`,
      prepNotes: 'Reconfirm interest, missing facts, budget fit, and the next commitment step.',
      durationMinutes: 15,
    }
  }

  if (knownFactCount(input) >= 3 || (firstContactHours !== null && firstContactHours <= 24)) {
    return {
      kind: input.hasPhone ? 'call_now' : 'schedule_discovery',
      callType: 'discovery',
      urgency: input.hasPhone ? 'now' : 'soon',
      label: input.hasPhone ? 'Call To Qualify' : 'Schedule Discovery Call',
      reason:
        'The lead has enough buying intent to justify a human qualification call before custom proposal work.',
      title: `Discovery call with ${name}`,
      prepNotes:
        'Confirm date, guest count, location, budget, dietary restrictions, service style, decision timeline, and deposit expectations.',
      durationMinutes: 30,
    }
  }

  return null
}

export function recommendCallForEvent(input: EventCallRecommendationInput): CallRecommendation | null {
  if (TERMINAL_EVENT_STATUSES.has(input.status)) return null
  const name = clientLabel(input.clientName)
  const menuSignal = hasRecentInboundSignal(input.messages, MENU_ALIGNMENT_PATTERNS)
  const rebookSignal = hasRecentInboundSignal(input.messages, REBOOK_PATTERNS)
  const humanTouchSignal = hasRecentInboundSignal(input.messages, HUMAN_TOUCH_PATTERNS)
  const clientIsQuiet = isClientQuietAfterOutbound(input.messages)
  const depositDue =
    (input.depositAmountCents ?? 0) > 0 && (input.totalPaidCents ?? 0) < (input.depositAmountCents ?? 0)

  if (input.status === 'completed') {
    const completedDays = daysSince(input.serviceCompletedAt ?? input.updatedAt)
    if (!input.followUpSent && completedDays !== null && completedDays >= 0 && completedDays <= 7) {
      return {
        kind: rebookSignal ? 'schedule_reactivation' : 'schedule_day_after_followup',
        callType: 'follow_up',
        urgency: completedDays <= 2 || rebookSignal ? 'soon' : 'normal',
        label: rebookSignal ? 'Call About Rebooking' : 'Schedule Day-After Follow-Up',
        reason: rebookSignal
          ? 'The client hinted at another booking, so follow up while the service is fresh.'
          : 'The service is complete and follow-up has not been recorded yet.',
        title: `Day-after follow-up for ${input.occasion || name}`,
        prepNotes:
          'Thank the client, capture feedback, note preferences, ask for review or referral, and look for the next booking moment.',
        durationMinutes: 15,
      }
    }
    return null
  }

  if (humanTouchSignal) {
    return {
      kind: 'call_now',
      callType: 'follow_up',
      urgency: 'now',
      label: 'Call To Unblock The Thread',
      reason:
        'The event thread shows confusion, urgency, concern, or a direct request to talk. A human call should happen before more chat.',
      title: `Human follow-up call for ${input.occasion || name}`,
      prepNotes:
        'Resolve the unclear point live, confirm timing, count, location, scope, or risk, and log the outcome back into ChefFlow.',
      durationMinutes: 15,
    }
  }

  if (menuSignal) {
    return {
      kind: 'schedule_menu_alignment',
      callType: 'follow_up',
      urgency: 'soon',
      label: 'Schedule Menu Alignment Call',
      reason:
        'Recent client messages mention menu, allergy, dietary, or substitution changes that should be clarified live.',
      title: `Menu alignment call for ${input.occasion || name}`,
      prepNotes:
        'Clarify dietary needs, approved scope, change impact, and what must be locked before procurement.',
      durationMinutes: 20,
    }
  }

  if (depositDue && ['accepted', 'paid'].includes(input.status)) {
    return {
      kind: 'schedule_deposit_close',
      callType: 'proposal_walkthrough',
      urgency: 'now',
      label: 'Call To Close Deposit',
      reason: 'The event has a deposit requirement that has not been fully collected.',
      title: `Deposit close call for ${input.occasion || name}`,
      prepNotes: 'Confirm commitment, deposit amount, payment timing, and what happens after payment.',
      durationMinutes: 15,
    }
  }

  if (PROPOSAL_EVENT_STATUSES.has(input.status)) {
    return {
      kind: clientIsQuiet ? 'call_now' : 'schedule_proposal_walkthrough',
      callType: 'proposal_walkthrough',
      urgency: clientIsQuiet ? 'now' : 'soon',
      label: clientIsQuiet ? 'Call Before Proposal Cools' : 'Schedule Proposal Call',
      reason: clientIsQuiet
        ? 'The client has gone quiet after outbound communication.'
        : 'The event is in the proposal or payment stage, where a live walkthrough can move money.',
      title: `Proposal walkthrough for ${input.occasion || name}`,
      prepNotes:
        'Walk through scope, price, deposit timing, cancellation terms, and any open client questions.',
      durationMinutes: 20,
    }
  }

  const eventDays = daysUntil(input.eventDate)
  if (input.status === 'confirmed' && eventDays !== null && eventDays >= 0 && eventDays <= 3) {
    return {
      kind: 'schedule_logistics',
      callType: 'pre_event_logistics',
      urgency: eventDays <= 1 ? 'now' : 'soon',
      label: 'Schedule Logistics Call',
      reason: 'The event is close enough that timing, access, allergies, and guest count should be locked.',
      title: `Pre-service logistics for ${input.occasion || name}`,
      prepNotes:
        'Confirm arrival time, service time, parking, kitchen access, final guest count, allergies, equipment, and final payment.',
      durationMinutes: 15,
    }
  }

  return null
}

export function buildCallRecommendationHref(
  recommendation: CallRecommendation,
  input: Omit<LifecycleCallHrefInput, 'callType' | 'title' | 'prepNotes' | 'durationMinutes'>
): string {
  return buildLifecycleCallHref({
    ...input,
    callType: recommendation.callType,
    title: recommendation.title,
    prepNotes: recommendation.prepNotes,
    durationMinutes: recommendation.durationMinutes,
  })
}
