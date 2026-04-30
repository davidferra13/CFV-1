import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { NOTIFICATION_CONFIG } = require('../../lib/notifications/types.ts')
const {
  applySignalChannelPolicy,
  explainSignalPolicy,
  getSignalMatrix,
  getSignalPolicy,
} = require('../../lib/notifications/signal-os.ts')
const {
  createDefaultEventDaySimulation,
  evaluateChefSignal,
  simulateNoiseScenario,
} = require('../../lib/notifications/noise-simulator.ts')
const { createCommandBrief } = require('../../lib/notifications/command-brief.ts')
const { evaluatePreServiceReadiness } = require('../../lib/notifications/pre-service-readiness.ts')
const { createOwnerReport } = require('../../lib/notifications/owner-report.ts')

const actions = Object.keys(NOTIFICATION_CONFIG)

test('signal matrix covers every notification action exactly once', () => {
  const matrix = getSignalMatrix()
  const matrixActions = matrix.map((item: { action: string }) => item.action).sort()

  assert.deepEqual(matrixActions, [...actions].sort())

  for (const policy of matrix) {
    assert.equal(typeof policy.defaultChannels.email, 'boolean', `${policy.action} email`)
    assert.equal(typeof policy.defaultChannels.push, 'boolean', `${policy.action} push`)
    assert.equal(typeof policy.defaultChannels.sms, 'boolean', `${policy.action} sms`)
    assert.ok(policy.sourceOfTruth.length > 0, `${policy.action} source of truth`)
    assert.ok(policy.why.length > 0, `${policy.action} why`)
  }
})

test('intent signals are real-time push signals and never default to email or SMS', () => {
  for (const action of [
    'client_on_payment_page',
    'client_viewed_quote',
    'quote_viewed_after_delay',
    'client_viewed_proposal',
    'client_portal_visit',
  ]) {
    const policy = getSignalPolicy(action)
    assert.equal(policy.attention, 'decide')
    assert.equal(policy.cadence, 'realtime')
    assert.deepEqual(policy.defaultChannels, { email: false, push: true, sms: false })
  }
})

test('signal channel policy blocks noisy channels even if preferences enable them', () => {
  const channels = applySignalChannelPolicy('goal_weekly_digest', {
    email: true,
    push: true,
    sms: true,
  })

  assert.deepEqual(channels, { email: true, push: false, sms: false })
})

test('event day simulator suppresses duplicates and preserves critical interrupts', () => {
  const result = simulateNoiseScenario(createDefaultEventDaySimulation())

  assert.equal(result.rawSignalCount, 21)
  assert.ok(result.suppressedCount >= 2)
  assert.ok(result.smsCount >= 1)
  assert.ok(result.requiredDecisions.some((item: string) => item.includes('allergy')))
})

test('signal evaluation escalates imminent allergy changes to SMS', () => {
  const signal = evaluateChefSignal({
    id: 'allergy',
    action: 'client_allergy_changed',
    title: 'Guest added shellfish allergy',
    occurredAt: '2026-05-01T09:10:00-04:00',
    context: { hoursUntilEvent: 4, activeEventLinked: true },
  })

  assert.equal(signal.decision, 'escalate')
  assert.equal(signal.channels.sms, true)
})

test('command brief creates sections and a single next action', () => {
  const brief = createCommandBrief(
    createDefaultEventDaySimulation(),
    'daily',
    '2026-05-01T06:30:00-04:00'
  )

  assert.equal(brief.title, 'Daily Command Brief')
  assert.ok(brief.sections.length > 0)
  assert.ok(brief.highestRisk)
  assert.ok(brief.nextAction)
  assert.equal(brief.delivery.email, true)
})

test('pre-service readiness gate exposes SMS-worthy blockers', () => {
  const readiness = evaluatePreServiceReadiness({
    eventId: 'event_1',
    eventTitle: 'Anniversary dinner',
    startsAt: '2026-05-01T18:00:00-04:00',
    addressConfirmed: true,
    accessNotesConfirmed: false,
    parkingConfirmed: true,
    finalGuestCountConfirmed: true,
    allergyReviewComplete: false,
    menuApproved: true,
    paymentClear: true,
    staffConfirmed: true,
    shoppingComplete: true,
    equipmentPacked: true,
  })

  assert.equal(readiness.ready, false)
  assert.equal(readiness.criticalCount, 2)
  assert.equal(readiness.shouldSms, true)
})

test('owner reports block claims when source data is unavailable', () => {
  const report = createOwnerReport(
    {
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      money: {
        revenueCollectedCents: null,
        bookedUnpaidCents: 200000,
        foodCostCents: null,
        laborCostCents: null,
        vendorSpendCents: null,
        missingReceiptCount: 3,
        overdueInvoiceCount: 1,
      },
      eventCount: 4,
      leadCount: null,
      acceptedBookingCount: 2,
      repeatClientCount: 1,
      averageResponseHours: 5,
      bestMarginEventLabel: null,
      worstMarginEventLabel: null,
      capacityWarnings: ['Two protected-time conflicts detected.'],
      vendorWarnings: [],
      reputationWarnings: [],
    },
    'monthly'
  )

  assert.ok(report.blockedClaims.some((claim: string) => claim.includes('Revenue collected')))
  assert.ok(
    report.requiredDecisions.some((decision: string) => decision.includes('unpaid bookings'))
  )
  assert.ok(report.warnings.some((warning: string) => warning.includes('receipt')))
})

test('policy explanations include delivery and source of truth', () => {
  const explanation = explainSignalPolicy('client_viewed_quote')

  assert.match(explanation, /Default delivery/)
  assert.match(explanation, /Source of truth/)
})
