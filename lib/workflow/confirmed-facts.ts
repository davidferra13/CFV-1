// Confirmed Facts Derivation Engine
// Pure function. No side effects. No database calls.
// Derives boolean facts from event data that already exists.

import type { ConfirmedFacts, EventContext } from './types'

const STATUS_ORDER = [
  'draft',
  'proposed',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
] as const

function statusAtLeast(current: string, threshold: string): boolean {
  if (current === 'cancelled') return false
  const currentIdx = STATUS_ORDER.indexOf(current as (typeof STATUS_ORDER)[number])
  const thresholdIdx = STATUS_ORDER.indexOf(threshold as (typeof STATUS_ORDER)[number])
  if (currentIdx === -1 || thresholdIdx === -1) return false
  return currentIdx >= thresholdIdx
}

/**
 * Derive confirmed facts from an event context.
 *
 * Rules:
 * - Every fact is derived from data that exists RIGHT NOW.
 * - No assumption-based progression.
 * - Unknown = false.
 */
export function deriveConfirmedFacts(ctx: EventContext): ConfirmedFacts {
  const { event, menus, financial } = ctx
  const now = new Date()
  const eventDate = new Date(event.event_date)
  const msUntilEvent = eventDate.getTime() - now.getTime()
  const hoursUntilEvent = msUntilEvent / (1000 * 60 * 60)
  const daysUntilEvent = hoursUntilEvent / 24

  const hasMenuAttached = menus.length > 0
  const hasMenuWithDishes = menus.some((m) => m.dishCount > 0)

  // Derive deposit/payment status from payment_status enum
  const paymentStatus = financial?.paymentStatus ?? null
  const depositReceived = paymentStatus != null && paymentStatus !== 'unpaid'
  const fullyPaid = paymentStatus === 'paid'

  const isCancelled = event.status === 'cancelled'
  const isCompleted = event.status === 'completed'

  return {
    // Stage 1 - Inquiry Intake
    hasClient: event.client != null,
    hasOccasion: (event.occasion ?? '').trim().length > 0,
    hasDate: event.event_date != null && event.event_date.length > 0,
    hasLocation: (event.location_address ?? '').trim().length > 0,
    hasGuestCount: event.guest_count > 0,

    // Stage 2 - Qualification
    hasServeTimeWindow: (event.serve_time ?? '').length > 0,
    hasMenuDirection: hasMenuAttached,

    // Stage 3 - Menu Development
    hasMenuAttached,
    hasMenuWithDishes,
    menuGravityStable: statusAtLeast(event.status, 'proposed'),

    // Stage 4 - Quote
    hasPricing: (event.quoted_price_cents ?? 0) > 0,
    hasDepositDefined: (event.deposit_amount_cents ?? 0) > 0,

    // Stage 5 - Financial Commitment
    depositReceived,
    fullyPaid,
    isLegallyActionable: depositReceived || statusAtLeast(event.status, 'paid'),

    // Stage 6–9 - Operational readiness
    guestCountStable: statusAtLeast(event.status, 'accepted'),
    eventConfirmed: statusAtLeast(event.status, 'confirmed'),

    // Timeline & Travel
    dateWithin7Days: daysUntilEvent <= 7 && daysUntilEvent > 0,
    dateWithin3Days: daysUntilEvent <= 3 && daysUntilEvent > 0,
    dateWithin24Hours: hoursUntilEvent <= 24 && hoursUntilEvent > 0,
    dateIsToday: daysUntilEvent <= 1 && daysUntilEvent >= 0,
    dateInPast: msUntilEvent < 0,

    // Lifecycle terminals
    isCancelled,
    isCompleted,
    isTerminal: isCancelled || isCompleted,
  }
}
