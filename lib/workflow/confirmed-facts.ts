// Confirmed Facts Derivation Engine
// Pure function. No side effects. No database calls.

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

function parseEventDay(value: string): Date {
  const parts = value.split('T')[0]?.split('-') ?? []
  if (parts.length === 3) {
    const [year, month, day] = parts.map((part) => Number(part))
    return new Date(year, month - 1, day)
  }

  const parsed = new Date(value)
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

/**
 * Derive confirmed facts from an event context.
 *
 * Rules:
 * - Every fact is derived from data that exists right now.
 * - Unknown means false.
 * - Stored operational state beats lifecycle heuristics.
 */
export function deriveConfirmedFacts(ctx: EventContext): ConfirmedFacts {
  const { event, menus, financial, ops, shopping, packing, travel } = ctx

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const eventDay = parseEventDay(event.event_date)

  const msUntilEventDay = eventDay.getTime() - today.getTime()
  const daysUntilEvent = msUntilEventDay / (1000 * 60 * 60 * 24)

  const hasMenuAttached = menus.length > 0
  const hasMenuWithDishes = menus.some((menu) => menu.dishCount > 0)

  const paymentStatus = financial?.paymentStatus ?? null
  const totalPaidCents = financial?.totalPaidCents ?? 0
  const outstandingBalanceCents = financial?.outstandingBalanceCents ?? 0

  const depositReceived = paymentStatus != null ? paymentStatus !== 'unpaid' : totalPaidCents > 0
  const fullyPaid = paymentStatus === 'paid' || (totalPaidCents > 0 && outstandingBalanceCents <= 0)

  const hasActiveShoppingList = shopping.hasActiveList
  const shoppingComplete =
    ops.shoppingCompletedAt != null || (!hasActiveShoppingList && shopping.completedListCount > 0)
  const prepComplete = ops.prepCompletedAt != null
  const packingProgressStarted = packing.confirmedItemCount > 0 || ops.carPacked

  const groceryListReady = ops.groceryListReady || hasActiveShoppingList || shoppingComplete
  const prepListReady = ops.prepListReady || prepComplete
  const packingListReady = ops.packingListReady || packingProgressStarted

  const isCancelled = event.status === 'cancelled'
  const isCompleted = event.status === 'completed'

  return {
    // Stage 1 - Inquiry Intake
    hasClient: event.client != null,
    hasOccasion: (event.occasion ?? '').trim().length > 0,
    hasDate: event.event_date.length > 0,
    hasLocation: (event.location_address ?? '').trim().length > 0,
    hasGuestCount: event.guest_count > 0,

    // Stage 2 - Qualification
    hasServeTimeWindow: (event.serve_time ?? '').trim().length > 0,
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

    // Stage 6-12 - Operational readiness
    guestCountStable: statusAtLeast(event.status, 'accepted'),
    eventConfirmed: statusAtLeast(event.status, 'confirmed'),
    groceryListReady,
    prepListReady,
    equipmentListReady: ops.equipmentListReady,
    packingListReady,
    timelineReady: ops.timelineReady,
    executionSheetReady: ops.executionSheetReady,
    nonNegotiablesChecked: ops.nonNegotiablesChecked,
    shoppingComplete,
    prepComplete,
    carPacked: ops.carPacked,
    hasActiveShoppingList,
    packingProgressStarted,
    hasTravelRoute: travel.hasServiceTravelRoute,

    // Timeline and travel windows
    dateWithin7Days: daysUntilEvent <= 7 && daysUntilEvent >= 0,
    dateWithin3Days: daysUntilEvent <= 3 && daysUntilEvent >= 0,
    dateWithin24Hours: daysUntilEvent <= 1 && daysUntilEvent >= 0,
    dateIsToday: daysUntilEvent === 0,
    dateInPast: daysUntilEvent < 0,

    // Lifecycle terminals
    isCancelled,
    isCompleted,
    isTerminal: isCancelled || isCompleted,
  }
}
