import type { EventPricingIntelligencePayload } from '@/lib/finance/event-pricing-intelligence-actions'
import type { EventTicket, EventTicketSummary, EventTicketType } from '@/lib/tickets/types'

export type DefaultFlowStatus = 'ready' | 'not_ready' | 'watch' | 'active'
export type DefaultFlowRisk = 'low' | 'medium' | 'high'

export type DefaultFlowIssue = {
  id: string
  label: string
  reason: string
  severity: 'warning' | 'blocker'
  actionHref: string
}

export type SimilarEventPricingSignal = {
  sampleSize: number
  averagePricePerGuestCents: number | null
  averageMarginPercent: number | null
}

export type EventDefaultFlowInput = {
  event: {
    id: string
    status: string
    eventDate: string | null
    serveTime: string | null
    arrivalTime: string | null
    guestCount: number | null
    serviceStyle: string | null
    quotedPriceCents: number | null
    locationAddress: string | null
    locationCity: string | null
    locationNotes: string | null
    accessInstructions: string | null
    kitchenNotes: string | null
    siteNotes: string | null
    courseCount: number | null
    travelTimeMinutes: number | null
    clientReminder7dSentAt?: string | null
    clientReminder2dSentAt?: string | null
    clientReminder1dSentAt?: string | null
    reviewRequestSentAt?: string | null
  }
  hasMenu: boolean
  menuHasAllRecipeCosts: boolean | null
  publicPhotoCount: number
  staffCount: number
  collaboratorCount: number
  messageCount: number
  activeShare: boolean
  hubThreadActive: boolean
  guestSummary: {
    totalGuests: number
    attending: number
    waitlisted: number
    arrived: number
    repeatGuests: number
  }
  tickets: {
    ticketTypes: EventTicketType[]
    tickets: EventTicket[]
    summary: EventTicketSummary | null
  }
  pricing: EventPricingIntelligencePayload | null
  similarPricing: SimilarEventPricingSignal
  feedback: {
    surveySent: boolean
    surveyCompleted: boolean
    averageRating: number | null
  }
  trust: {
    pastEventsCount: number
    completedTicketedEventsCount: number
    attendanceConsistencyPercent: number | null
  }
}

export type EventDefaultFlowSnapshot = {
  publishReadiness: {
    status: 'ready' | 'not_ready'
    label: string
    score: number
    issues: DefaultFlowIssue[]
  }
  pricingGuidance: {
    lowCents: number | null
    highCents: number | null
    expectedMarginPercent: number | null
    risk: DefaultFlowRisk
    label: string
    basis: string
  }
  capacity: {
    safeCapacity: number | null
    currentGuestCount: number | null
    status: DefaultFlowStatus
    label: string
  }
  arrival: {
    arrived: number
    expected: number
    missing: number
    status: DefaultFlowStatus
  }
  liveDashboard: {
    status: DefaultFlowStatus
    checkpoints: string[]
  }
  feedback: {
    status: DefaultFlowStatus
    label: string
  }
  repeatGuests: {
    count: number
    status: DefaultFlowStatus
  }
  communication: {
    status: DefaultFlowStatus
    label: string
  }
  cancellation: {
    policyLabel: string
    refundRisk: DefaultFlowRisk
  }
  waitlist: {
    enabled: boolean
    waitlisted: number
    soldOut: boolean
    label: string
  }
  upsells: {
    detected: boolean
    label: string
  }
  analytics: {
    ticketsSold: number
    revenueCents: number
    conversionLabel: string
    sourceLabel: string
  }
  trust: {
    label: string
    attendanceConsistencyPercent: number | null
  }
  duplication: {
    available: boolean
    label: string
  }
  timeBuffer: {
    status: DefaultFlowStatus
    label: string
  }
  reminders: {
    status: DefaultFlowStatus
    label: string
  }
}

function positive(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function parseClockMinutes(value: string | null | undefined): number | null {
  if (!value) return null
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

function getMinimumSetupMinutes(input: EventDefaultFlowInput): number {
  const guests = positive(input.event.guestCount)
  const courses = positive(input.event.courseCount) || 1
  const serviceStyle = input.event.serviceStyle ?? 'plated'
  const baseByStyle: Record<string, number> = {
    plated: 90,
    tasting_menu: 110,
    family_style: 75,
    buffet: 85,
    cocktail: 70,
    other: 75,
  }
  const guestLoad = Math.max(0, guests - 8) * 3
  const courseLoad = Math.max(0, courses - 3) * 12
  return (baseByStyle[serviceStyle] ?? 75) + guestLoad + courseLoad
}

export function estimateSafeCapacity(input: {
  serviceStyle: string | null
  staffCount: number
  layoutCapacity?: number | null
  fallbackGuestCount?: number | null
}): number | null {
  const style = input.serviceStyle ?? 'plated'
  const perStaff: Record<string, number> = {
    plated: 12,
    tasting_menu: 10,
    family_style: 14,
    buffet: 20,
    cocktail: 28,
    other: 12,
  }
  const staffCapacity = input.staffCount > 0 ? input.staffCount * (perStaff[style] ?? 12) : null
  const layoutCapacity = positive(input.layoutCapacity)
  const candidates = [staffCapacity, layoutCapacity || null].filter(
    (value): value is number => typeof value === 'number' && value > 0
  )

  if (candidates.length > 0) return Math.min(...candidates)
  return numberOrNull(input.fallbackGuestCount)
}

export function buildPricingGuidance(
  input: EventDefaultFlowInput
): EventDefaultFlowSnapshot['pricingGuidance'] {
  const suggested = positive(input.pricing?.projected.suggestedPriceCents)
  const guestCount = positive(input.event.guestCount)
  const similarPerGuest = positive(input.similarPricing.averagePricePerGuestCents)
  const similarTotal = similarPerGuest > 0 && guestCount > 0 ? similarPerGuest * guestCount : 0
  const anchors = [suggested, similarTotal].filter((value) => value > 0)
  const current = positive(input.event.quotedPriceCents)

  if (anchors.length === 0) {
    return {
      lowCents: null,
      highCents: null,
      expectedMarginPercent: null,
      risk: 'medium',
      label: 'Add costs or a quote to price confidently',
      basis: 'Waiting on ingredient costs or similar completed events.',
    }
  }

  const lowCents = Math.round(Math.min(...anchors) * 0.92)
  const highCents = Math.round(Math.max(...anchors) * 1.12)
  const expectedMarginPercent = numberOrNull(input.pricing?.projected.expectedMarginPercent)
  const tooCheap = current > 0 && current < lowCents
  const tooExpensive = current > 0 && current > highCents
  const risk: DefaultFlowRisk =
    tooCheap || tooExpensive || input.pricing?.warnings.some((w) => w.severity === 'critical')
      ? 'high'
      : input.pricing?.warnings.length
        ? 'medium'
        : 'low'

  const basisParts = [
    suggested > 0 ? 'ingredient inputs' : null,
    similarTotal > 0 ? `${input.similarPricing.sampleSize} similar past events` : null,
  ].filter(Boolean)

  return {
    lowCents,
    highCents,
    expectedMarginPercent,
    risk,
    label: tooCheap
      ? 'Likely too cheap'
      : tooExpensive
        ? 'May be too expensive'
        : 'Guided range ready',
    basis:
      basisParts.length > 0
        ? `Based on ${basisParts.join(' and ')}.`
        : 'Based on available pricing signals.',
  }
}

export function evaluatePrePublishReadiness(
  input: EventDefaultFlowInput
): EventDefaultFlowSnapshot['publishReadiness'] {
  const issues: DefaultFlowIssue[] = []
  const eventHref = `/events/${input.event.id}`
  const editHref = `/events/${input.event.id}/edit`

  if (!hasText(input.event.locationAddress) && !hasText(input.event.locationCity)) {
    issues.push({
      id: 'location_missing',
      label: 'Location is not clear',
      reason: 'Publish needs at least a usable venue or city.',
      severity: 'blocker',
      actionHref: editHref,
    })
  }

  if (!hasText(input.event.arrivalTime) || !hasText(input.event.accessInstructions)) {
    issues.push({
      id: 'arrival_plan',
      label: 'Arrival plan is weak',
      reason: 'Arrival time and access instructions keep day-of coordination from becoming manual.',
      severity: 'blocker',
      actionHref: editHref,
    })
  }

  if (
    !hasText(input.event.kitchenNotes) &&
    !hasText(input.event.siteNotes) &&
    !hasText(input.event.locationNotes)
  ) {
    issues.push({
      id: 'setup_area',
      label: 'Setup area is undefined',
      reason: 'Add kitchen, site, or setup notes before guests see the event.',
      severity: 'warning',
      actionHref: editHref,
    })
  }

  if (!input.hasMenu) {
    issues.push({
      id: 'menu_missing',
      label: 'Menu is not attached',
      reason: 'The event can sell or confirm faster when the menu is linked.',
      severity: 'warning',
      actionHref: `${eventHref}?tab=money`,
    })
  } else if (input.menuHasAllRecipeCosts === false) {
    issues.push({
      id: 'menu_costing',
      label: 'Menu costing is incomplete',
      reason: 'Some menu components do not have full recipe cost data.',
      severity: 'warning',
      actionHref: `${eventHref}?tab=money`,
    })
  }

  if (positive(input.event.quotedPriceCents) <= 0) {
    issues.push({
      id: 'price_missing',
      label: 'Price is missing',
      reason: 'Publishing without a clear price creates avoidable back-and-forth.',
      severity: 'blocker',
      actionHref: `${eventHref}?tab=money`,
    })
  }

  const pricing = buildPricingGuidance(input)
  if (pricing.risk === 'high') {
    issues.push({
      id: 'pricing_mismatch',
      label: 'Pricing needs review',
      reason: pricing.label,
      severity: 'blocker',
      actionHref: `${eventHref}?tab=money`,
    })
  }

  const guestCount = positive(input.event.guestCount)
  if (guestCount >= 12 && input.staffCount === 0 && input.collaboratorCount === 0) {
    issues.push({
      id: 'responsibilities',
      label: 'Responsibilities are unclear',
      reason: 'Larger events should show at least staff, collaborators, or a clear owner plan.',
      severity: 'warning',
      actionHref: `${eventHref}?tab=ops`,
    })
  }

  if (input.tickets.ticketTypes.length > 0 && input.publicPhotoCount < 2) {
    issues.push({
      id: 'media_quality',
      label: 'Public media is thin',
      reason: 'Ticketed events need at least a couple of real photos to build buyer confidence.',
      severity: 'warning',
      actionHref: `${eventHref}?tab=overview`,
    })
  }

  const arrival = parseClockMinutes(input.event.arrivalTime)
  const serve = parseClockMinutes(input.event.serveTime)
  if (arrival != null && serve != null) {
    const buffer = serve - arrival
    if (buffer < getMinimumSetupMinutes(input)) {
      issues.push({
        id: 'time_buffer',
        label: 'Setup buffer looks unrealistic',
        reason: `${buffer} minutes from arrival to service is tight for this guest count and service style.`,
        severity: buffer < 45 ? 'blocker' : 'warning',
        actionHref: editHref,
      })
    }
  }

  const blockerCount = issues.filter((issue) => issue.severity === 'blocker').length
  const score = Math.max(0, 100 - blockerCount * 28 - (issues.length - blockerCount) * 10)

  return {
    status: blockerCount > 0 ? 'not_ready' : 'ready',
    label: blockerCount > 0 ? 'Not ready to publish' : 'Ready to publish',
    score,
    issues,
  }
}

export function buildEventDefaultFlowSnapshot(
  input: EventDefaultFlowInput
): EventDefaultFlowSnapshot {
  const publishReadiness = evaluatePrePublishReadiness(input)
  const pricingGuidance = buildPricingGuidance(input)
  const safeCapacity = estimateSafeCapacity({
    serviceStyle: input.event.serviceStyle,
    staffCount: input.staffCount,
    fallbackGuestCount: input.event.guestCount,
  })
  const guestCount = numberOrNull(input.event.guestCount)
  const capacityOverload = safeCapacity != null && guestCount != null && guestCount > safeCapacity
  const expectedGuests =
    positive(input.tickets.summary?.guests_confirmed) ||
    positive(input.guestSummary.attending) ||
    positive(input.event.guestCount)
  const arrived =
    input.guestSummary.arrived +
    input.tickets.tickets.reduce(
      (sum, ticket) => sum + (ticket.attended === true ? positive(ticket.quantity) || 1 : 0),
      0
    )
  const ticketsSold = positive(input.tickets.summary?.tickets_sold)
  const revenueCents = positive(input.tickets.summary?.revenue_cents)
  const finiteCapacity = input.tickets.ticketTypes.reduce(
    (sum, ticketType) => sum + (ticketType.capacity ?? 0),
    0
  )
  const soldOut = finiteCapacity > 0 && ticketsSold >= finiteCapacity
  const hasReminders =
    Boolean(
      input.event.clientReminder7dSentAt ||
      input.event.clientReminder2dSentAt ||
      input.event.clientReminder1dSentAt
    ) || input.activeShare

  const arrival = parseClockMinutes(input.event.arrivalTime)
  const serve = parseClockMinutes(input.event.serveTime)
  const buffer = arrival != null && serve != null ? serve - arrival : null
  const minBuffer = getMinimumSetupMinutes(input)

  return {
    publishReadiness,
    pricingGuidance,
    capacity: {
      safeCapacity,
      currentGuestCount: guestCount,
      status: capacityOverload ? 'not_ready' : safeCapacity ? 'ready' : 'watch',
      label: capacityOverload
        ? `Over safe capacity by ${guestCount! - safeCapacity!}`
        : safeCapacity
          ? `Safe capacity around ${safeCapacity}`
          : 'Add staffing or layout to estimate capacity',
    },
    arrival: {
      arrived,
      expected: expectedGuests,
      missing: Math.max(0, expectedGuests - arrived),
      status: arrived > 0 ? 'active' : input.event.status === 'in_progress' ? 'watch' : 'ready',
    },
    liveDashboard: {
      status: input.event.status === 'in_progress' ? 'active' : 'ready',
      checkpoints: [
        input.event.arrivalTime ? 'arrival' : null,
        input.event.serveTime ? 'service' : null,
        input.hasMenu ? 'menu' : null,
        input.staffCount > 0 ? 'staff' : null,
      ].filter(Boolean) as string[],
    },
    feedback: {
      status: input.feedback.surveyCompleted
        ? 'ready'
        : input.feedback.surveySent || input.event.reviewRequestSentAt
          ? 'active'
          : input.event.status === 'completed'
            ? 'watch'
            : 'ready',
      label: input.feedback.surveyCompleted
        ? `Feedback captured${input.feedback.averageRating ? ` (${input.feedback.averageRating.toFixed(1)}/5)` : ''}`
        : input.feedback.surveySent || input.event.reviewRequestSentAt
          ? 'Feedback request sent'
          : input.event.status === 'completed'
            ? 'Feedback request is due'
            : 'Feedback will trigger after completion',
    },
    repeatGuests: {
      count: input.guestSummary.repeatGuests,
      status: input.guestSummary.repeatGuests > 0 ? 'active' : 'ready',
    },
    communication: {
      status: input.hubThreadActive || input.messageCount > 0 ? 'active' : 'watch',
      label: input.hubThreadActive
        ? 'Event thread active'
        : input.messageCount > 0
          ? `${input.messageCount} event messages logged`
          : 'No event thread activity yet',
    },
    cancellation: {
      policyLabel: 'Full refund 72h out, partial 24h out, no refund inside 24h',
      refundRisk: input.event.status === 'cancelled' ? 'high' : 'low',
    },
    waitlist: {
      enabled: input.activeShare || input.tickets.ticketTypes.length > 0,
      waitlisted: input.guestSummary.waitlisted,
      soldOut,
      label: soldOut
        ? input.guestSummary.waitlisted > 0
          ? `${input.guestSummary.waitlisted} waiting for a spot`
          : 'Sold out; waitlist should stay visible'
        : input.guestSummary.waitlisted > 0
          ? `${input.guestSummary.waitlisted} waitlisted`
          : 'No waitlist pressure',
    },
    upsells: {
      detected: input.tickets.ticketTypes.some((type) =>
        /pairing|premium|vip|add[- ]?on/i.test(type.name)
      ),
      label: input.tickets.ticketTypes.some((type) =>
        /pairing|premium|vip|add[- ]?on/i.test(type.name)
      )
        ? 'Simple add-ons detected'
        : 'No lightweight add-ons yet',
    },
    analytics: {
      ticketsSold,
      revenueCents,
      conversionLabel:
        finiteCapacity > 0
          ? `${Math.round((ticketsSold / finiteCapacity) * 100)}% sold through`
          : 'Conversion pending',
      sourceLabel: input.tickets.summary?.sales_by_source
        ? Object.keys(input.tickets.summary.sales_by_source).join(', ') || 'Direct'
        : 'Direct',
    },
    trust: {
      label:
        input.trust.pastEventsCount > 0
          ? `${input.trust.pastEventsCount} past events completed`
          : 'Trust signals build after completed events',
      attendanceConsistencyPercent: input.trust.attendanceConsistencyPercent,
    },
    duplication: {
      available: true,
      label: 'Clone keeps structure and resets date and inventory',
    },
    timeBuffer: {
      status: buffer == null ? 'watch' : buffer >= minBuffer ? 'ready' : 'not_ready',
      label:
        buffer == null
          ? 'Set arrival and serve times to check buffer'
          : buffer >= minBuffer
            ? `${buffer} minutes from arrival to service`
            : `${buffer} minutes available; target ${minBuffer}+`,
    },
    reminders: {
      status: hasReminders ? 'active' : 'watch',
      label: hasReminders
        ? 'Guest reminders are in motion'
        : 'Reminder automation will need a share or schedule',
    },
  }
}
