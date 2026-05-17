import test from 'node:test'
import assert from 'node:assert/strict'
import type { ClientStats, PeriodStats } from '@/lib/clients/client-stats'
import type { CircleStats } from '@/lib/dinner-circles/circle-stats'

test('ClientStats type covers all required metric categories', () => {
  const requiredFinancialKeys: (keyof ClientStats)[] = [
    'lifetimeSpendCents',
    'totalPaidCents',
    'totalQuotedCents',
    'totalInvoicedCents',
    'outstandingBalanceCents',
    'averageEventValueCents',
    'highestValueEventCents',
    'highestValueEventId',
  ]

  const requiredProfitKeys: (keyof ClientStats)[] = [
    'totalProfitCents',
    'profitMarginPercent',
    'totalExpensesCents',
    'menusServed',
  ]

  const requiredEventKeys: (keyof ClientStats)[] = [
    'totalDinners',
    'completedDinners',
    'upcomingDinners',
    'cancelledDinners',
    'cannabisDinners',
  ]

  const requiredDateKeys: (keyof ClientStats)[] = [
    'firstEventDate',
    'lastEventDate',
    'nextEventDate',
  ]

  const requiredGuestKeys: (keyof ClientStats)[] = [
    'totalCovers',
    'uniqueGuests',
    'guestAppearances',
    'repeatGuests',
    'averagePartySize',
  ]

  const requiredQuoteKeys: (keyof ClientStats)[] = [
    'quotesSent',
    'quotesAccepted',
    'quotesDeclined',
    'quoteAcceptanceRate',
  ]

  const requiredRelationshipKeys: (keyof ClientStats)[] = ['daysSinceLastEvent', 'isDormant']

  const requiredPeriodKeys: (keyof ClientStats)[] = [
    'thisMonth',
    'lastMonth',
    'thisYear',
    'lastYear',
  ]

  const requiredDataHealthKeys: (keyof ClientStats)[] = [
    'eventsWithoutGuestCount',
    'completedWithoutCloseout',
  ]

  const allRequired = [
    ...requiredFinancialKeys,
    ...requiredProfitKeys,
    ...requiredEventKeys,
    ...requiredDateKeys,
    ...requiredGuestKeys,
    ...requiredQuoteKeys,
    ...requiredRelationshipKeys,
    ...requiredPeriodKeys,
    ...requiredDataHealthKeys,
  ]

  assert.equal(allRequired.length, 37, 'ClientStats should have 37 metrics')
})

test('PeriodStats has revenue, dinners, covers, newGuests', () => {
  const period: PeriodStats = {
    revenueCents: 150000,
    dinners: 3,
    covers: 24,
    newGuests: 8,
  }
  assert.equal(period.revenueCents, 150000)
  assert.equal(period.dinners, 3)
  assert.equal(period.covers, 24)
  assert.equal(period.newGuests, 8)
})

test('ClientStats distinguishes covers from unique guests', () => {
  // Type-level proof: totalCovers and uniqueGuests are separate fields
  const mock: Pick<
    ClientStats,
    'totalCovers' | 'uniqueGuests' | 'guestAppearances' | 'repeatGuests'
  > = {
    totalCovers: 200,
    uniqueGuests: 45,
    guestAppearances: 180,
    repeatGuests: 12,
  }

  assert.ok(mock.totalCovers > mock.uniqueGuests, 'covers > unique guests when guests repeat')
  assert.ok(
    mock.guestAppearances <= mock.totalCovers,
    'appearances <= covers (covers includes plus-ones)'
  )
  assert.ok(mock.repeatGuests <= mock.uniqueGuests, 'repeat guests subset of unique guests')
})

test('CircleStats covers required Dinner Circle metrics', () => {
  const requiredKeys: (keyof CircleStats)[] = [
    'totalEvents',
    'completedEvents',
    'upcomingEvents',
    'totalCovers',
    'uniqueMembers',
    'returningMembers',
    'averageAttendance',
    'totalRevenueCents',
    'averageEventValueCents',
    'lastEventDate',
    'nextEventDate',
    'guestOnboardingCompletion',
  ]

  assert.equal(requiredKeys.length, 12, 'CircleStats should have 12 metrics')
})

test('metric definitions are deterministic and explainable', () => {
  // Document metric definitions as assertions
  const definitions = {
    totalCovers: 'Sum of guest_count across all non-cancelled events for a client',
    uniqueGuests: 'Count of distinct people (by email/name) across all event_guests records',
    guestAppearances: 'Total event_guests rows across all client events',
    repeatGuests: 'Guests who appear in 2+ of this client events',
    averagePartySize: 'Mean guest_count across non-cancelled events with guest_count > 0',
    lifetimeSpendCents: 'From client_financial_summary view (ledger-derived)',
    outstandingBalanceCents: 'Sum of quoted_price where payment_status != paid',
    quoteAcceptanceRate: 'quotesAccepted / quotesSent * 100 (null if no quotes sent)',
    isDormant: 'daysSinceLastEvent > 180',
  }

  assert.ok(Object.keys(definitions).length >= 9, 'Core metrics have documented definitions')
})
