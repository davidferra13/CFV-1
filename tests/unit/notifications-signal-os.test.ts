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
const { applyAttentionBudget } = require('../../lib/notifications/attention-budget.ts')
const { createCommandBrief } = require('../../lib/notifications/command-brief.ts')
const {
  createDailyCommandBriefFromData,
} = require('../../lib/notifications/command-brief-adapter.ts')
const {
  createPreServiceReadinessFromEvent,
  eventRowToPreServiceSignal,
} = require('../../lib/notifications/event-readiness-adapter.ts')
const { evaluatePreServiceReadiness } = require('../../lib/notifications/pre-service-readiness.ts')
const { createOwnerReport } = require('../../lib/notifications/owner-report.ts')
const {
  createSignalFromNotification,
  guardNotificationSignalSource,
} = require('../../lib/notifications/signal-event-factory.ts')
const {
  createSourceTruthCheck,
  evaluateSourceTruth,
} = require('../../lib/notifications/source-truth-guard.ts')
const {
  scoreSignalOutcome,
  summarizeSignalOutcomes,
} = require('../../lib/notifications/signal-outcomes.ts')
const {
  createSuppressionAuditRecords,
  markSuppressionEscalated,
} = require('../../lib/notifications/suppression-audit.ts')
const { createSignalDashboardSnapshot } = require('../../lib/notifications/signal-dashboard.ts')

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

test('attention budget forces low-value pushes into digest after configured limits', () => {
  const simulation = simulateNoiseScenario([
    {
      id: 'lead-1',
      action: 'new_guest_lead',
      title: 'Social lead 1',
      occurredAt: '2026-05-01T09:00:00-04:00',
      clientId: 'client_1',
    },
    {
      id: 'lead-2',
      action: 'new_guest_lead',
      title: 'Social lead 2',
      occurredAt: '2026-05-01T09:05:00-04:00',
      clientId: 'client_2',
    },
  ])

  const budget = applyAttentionBudget(simulation.evaluatedSignals, {
    maxAdminPushesPerDay: 3,
    maxGrowthPushesPerDay: 1,
    maxReviewPushesPerDay: 2,
  })

  assert.equal(budget.forcedDigest, 1)
})

test('suppression audit records archived and suppressed signals with escalation marker', () => {
  const simulation = simulateNoiseScenario(createDefaultEventDaySimulation())
  const records = createSuppressionAuditRecords(simulation.evaluatedSignals, '2026-05-01T12:00:00Z')

  assert.ok(records.length >= 2)
  assert.ok(records.some((record: { duplicateKey: string | null }) => record.duplicateKey))

  const escalated = markSuppressionEscalated(records, records[0].signalId)
  assert.equal(escalated[0].laterEscalated, true)
})

test('signal outcome scoring separates useful alerts from noise', () => {
  const signal = evaluateChefSignal({
    id: 'payment',
    action: 'payment_failed',
    title: 'Payment failed',
    occurredAt: '2026-05-01T09:00:00-04:00',
  })

  const useful = scoreSignalOutcome(signal, {
    signalId: 'payment',
    openedAt: '2026-05-01T09:01:00-04:00',
    clickedAt: '2026-05-01T09:02:00-04:00',
    actionCompletedAt: '2026-05-01T09:05:00-04:00',
  })
  const noisy = scoreSignalOutcome(signal, {
    signalId: 'payment',
    dismissedAt: '2026-05-01T09:01:00-04:00',
    demotedByChef: true,
  })
  const summary = summarizeSignalOutcomes([useful, noisy])

  assert.equal(useful.useful, true)
  assert.equal(noisy.useful, false)
  assert.equal(summary.total, 2)
})

test('dashboard snapshot combines matrix, simulation, budget, audit, and daily brief', () => {
  const snapshot = createSignalDashboardSnapshot('2026-05-01T06:30:00Z')

  assert.equal(snapshot.matrix.length, actions.length)
  assert.equal(snapshot.simulation.rawSignalCount, 21)
  assert.ok(snapshot.attentionBudget.results.length > 0)
  assert.ok(snapshot.suppressionAuditRecords.length > 0)
  assert.equal(snapshot.dailyBrief.title, 'Daily Command Brief')
})

test('signal factory converts notification rows into chef signals with metadata context', () => {
  const signal = createSignalFromNotification({
    id: 'notif_1',
    action: 'payment_failed',
    title: 'Payment failed',
    body: 'Client card declined.',
    event_id: 'event_1',
    inquiry_id: null,
    client_id: 'client_1',
    metadata: {
      amount_cents: 125000,
      hours_until_event: 18,
      duplicate_key: 'event_1:payment',
      active_event_linked: true,
    },
    created_at: '2026-05-01T09:00:00-04:00',
  })

  assert.equal(signal.id, 'notification:notif_1')
  assert.equal(signal.moneyAmountCents, 125000)
  assert.equal(signal.context.hoursUntilEvent, 18)
  assert.equal(signal.context.duplicateKey, 'event_1:payment')
})

test('source truth guard blocks claims when required source records are missing', () => {
  const result = evaluateSourceTruth([
    createSourceTruthCheck({
      key: 'event',
      label: 'Event context',
      source: 'events.id',
      value: null,
    }),
    createSourceTruthCheck({
      key: 'notification',
      label: 'Notification record',
      source: 'notifications.id',
      value: 'notif_1',
    }),
  ])

  assert.equal(result.trusted, false)
  assert.ok(result.blockedClaims.some((claim: string) => claim.includes('Event context')))
})

test('notification source guard requires event context for event sourced alerts', () => {
  const guard = guardNotificationSignalSource({
    id: 'notif_1',
    action: 'event_confirmed',
    title: 'Event confirmed',
    body: null,
    event_id: null,
    inquiry_id: null,
    client_id: null,
    metadata: {},
    created_at: '2026-05-01T09:00:00-04:00',
  })

  assert.equal(guard.trusted, false)
  assert.ok(guard.blockedClaims.some((claim: string) => claim.includes('Event context')))
})

test('event readiness adapter maps real event rows into pre-service blockers', () => {
  const readiness = createPreServiceReadinessFromEvent(
    {
      id: 'event_1',
      occasion: 'Anniversary dinner',
      event_date: '2026-05-02',
      serve_time: '18:00:00',
      location_address: '',
      access_instructions: null,
      location_notes: 'Street parking only',
      guest_count: 12,
      guest_count_confirmed: false,
      allergies: ['shellfish'],
      dietary_restrictions: [],
      non_negotiables_checked: false,
      payment_status: 'unpaid',
      grocery_list_ready: false,
      shopping_completed_at: null,
      equipment_list_ready: false,
      packing_list_ready: false,
      car_packed: false,
      menu_approval_status: 'sent',
      menu_approved_at: null,
    },
    { staffAssignedCount: 2, staffConfirmedCount: 1 }
  )

  assert.equal(readiness.ready, false)
  assert.ok(readiness.blockers.some((blocker: { kind: string }) => blocker.kind === 'address'))
  assert.ok(readiness.blockers.some((blocker: { kind: string }) => blocker.kind === 'payment'))
  assert.equal(readiness.shouldPush, true)
})

test('event readiness adapter emits a service signal for blocked events', () => {
  const signal = eventRowToPreServiceSignal(
    {
      id: 'event_1',
      occasion: 'Anniversary dinner',
      event_date: '2026-05-02',
      serve_time: '18:00:00',
      location_address: null,
      access_instructions: null,
      guest_count: 10,
      guest_count_confirmed: true,
      allergies: [],
      dietary_restrictions: [],
      non_negotiables_checked: false,
      payment_status: 'paid',
      grocery_list_ready: true,
      equipment_list_ready: true,
      packing_list_ready: true,
      menu_approval_status: 'approved',
    },
    { now: '2026-05-02T08:00:00-04:00' }
  )

  assert.ok(signal)
  assert.equal(signal.action, 'event_reminder_1d')
  assert.equal(signal.eventId, 'event_1')
})

test('daily command brief adapter combines notifications, briefing, and readiness data', () => {
  const readinessInput = {
    eventId: 'event_1',
    eventTitle: 'Dinner',
    startsAt: '2026-05-01T18:00:00-04:00',
    addressConfirmed: false,
    accessNotesConfirmed: true,
    parkingConfirmed: true,
    finalGuestCountConfirmed: true,
    allergyReviewComplete: true,
    menuApproved: true,
    paymentClear: true,
    staffConfirmed: true,
    shoppingComplete: true,
    equipmentPacked: true,
  }

  const brief = createDailyCommandBriefFromData(
    {
      notifications: [
        {
          id: 'notif_1',
          action: 'client_viewed_quote',
          title: 'Client viewed quote',
          body: null,
          event_id: null,
          inquiry_id: null,
          client_id: 'client_1',
          metadata: {},
          created_at: '2026-05-01T07:30:00-04:00',
        },
      ],
      morningBriefing: {
        today: '2026-05-01',
        alerts: [
          {
            type: 'payment_due',
            title: 'Payment due today',
            detail: 'Collect balance before service.',
            severity: 'critical',
            href: '/events/event_1',
          },
        ],
        todayEvents: [
          {
            id: 'event_1',
            title: 'Dinner',
            event_date: '2026-05-01',
            start_time: '18:00:00',
            dietary_notes: 'gluten-free',
            staff_count: 0,
          },
        ],
      },
      preServiceResults: [
        {
          input: readinessInput,
          result: evaluatePreServiceReadiness(readinessInput),
        },
      ],
    },
    '2026-05-01T06:30:00-04:00'
  )

  assert.equal(brief.title, 'Daily Command Brief')
  assert.ok(brief.sections.length > 0)
  assert.ok(brief.nextAction)
})
