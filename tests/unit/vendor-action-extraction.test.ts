import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyVendorCallOutcome,
  evaluateVendorCallLoop,
  extractVendorCallActions,
  summarizeVendorExtractedAction,
} from '@/lib/calling/vendor-action-extraction'

test('vendor call extraction creates price and availability actions with transcript evidence', () => {
  const actions = extractVendorCallActions({
    callId: 'call-1',
    sourceType: 'supplier_call',
    vendorName: 'Pier 9 Seafood',
    vendorId: 'vendor-1',
    ingredientName: 'halibut',
    transcript:
      'We have halibut available at $18.50 per pound. Delivery is tomorrow between 8am and 10am.',
    recordingUrl: 'https://recordings.example/call-1',
    metadata: { createdAt: '2026-05-21T12:00:00.000Z' },
  })

  assert.ok(actions.some((action) => action.actionType === 'update_ingredient_price'))
  assert.ok(actions.some((action) => action.actionType === 'confirm_delivery'))
  assert.ok(actions.every((action) => action.evidence.callId === 'call-1'))
  assert.ok(
    actions.every((action) => action.evidence.recordingUrl === 'https://recordings.example/call-1')
  )
  assert.ok(actions.every((action) => action.confidence >= 0.78))
})

test('vendor call extraction requires approval for low confidence and conflicting outcomes', () => {
  const actions = extractVendorCallActions({
    callId: 'call-2',
    sourceType: 'ai_call',
    vendorName: 'Farm Stand',
    ingredientName: 'fava beans',
    transcript:
      'I think fava beans are available, but actually they are not available until Friday. Maybe $6 a pound.',
    transcriptConfidence: 0.52,
    metadata: {},
  })

  assert.ok(actions.length > 0)
  assert.ok(actions.every((action) => action.requiresApproval))
  assert.ok(actions.every((action) => action.conflictDetected))
})

test('vendor call extraction maps retry and account terms issues into actionable tasks', () => {
  const actions = extractVendorCallActions({
    callId: 'call-3',
    sourceType: 'ai_call',
    vendorName: 'Regional Produce',
    transcript:
      'No answer. Voicemail said the account is on hold for payment terms. Retry tomorrow morning or escalate.',
    metadata: {},
  })

  assert.ok(actions.some((action) => action.actionType === 'retry_vendor'))
  assert.ok(actions.some((action) => action.actionType === 'escalate_manual_call'))
  assert.ok(
    actions.some((action) => summarizeVendorExtractedAction(action).includes('Regional Produce'))
  )
})

test('vendor call loop closes after successful price or delivery proof', () => {
  const decision = evaluateVendorCallLoop(
    {
      callId: 'call-4',
      sourceType: 'supplier_call',
      vendorName: 'Pier 9 Seafood',
      ingredientName: 'halibut',
      transcript: 'Yes, halibut is confirmed at $18.50 per pound and delivery is tomorrow 8am.',
      attemptedAt: '2026-05-21T14:00:00.000Z',
      callPlan: {
        purpose: 'Confirm halibut price and delivery',
        allowedRetries: 2,
        retrySpacingMinutes: 60,
        activeHours: { start: '08:00', end: '18:00', timezone: 'America/New_York' },
        escalationThreshold: 3,
      },
    },
    { now: new Date('2026-05-21T15:00:00.000Z') }
  )

  assert.equal(
    classifyVendorCallOutcome({
      callId: 'call-4',
      sourceType: 'supplier_call',
      transcript: 'Delivery is confirmed tomorrow 8am.',
    }),
    'confirmed_delivery'
  )
  assert.equal(decision.status, 'success')
  assert.equal(decision.nextAttemptAt, null)
  assert.equal(decision.attemptsRemaining, 2)
})

test('vendor call loop allows retries only after spacing and during active hours', () => {
  const waiting = evaluateVendorCallLoop(
    {
      callId: 'call-5',
      sourceType: 'ai_call',
      vendorName: 'Regional Produce',
      summary: 'No answer.',
      attemptedAt: '2026-05-21T13:30:00.000Z',
      callPlan: {
        purpose: 'Confirm fava bean availability',
        allowedRetries: 2,
        retrySpacingMinutes: 60,
        activeHours: { start: '08:00', end: '18:00', timezone: 'America/New_York' },
        escalationThreshold: 3,
      },
    },
    { now: new Date('2026-05-21T14:00:00.000Z') }
  )
  const ready = evaluateVendorCallLoop(
    {
      callId: 'call-5',
      sourceType: 'ai_call',
      vendorName: 'Regional Produce',
      summary: 'No answer.',
      attemptedAt: '2026-05-21T13:30:00.000Z',
      callPlan: {
        purpose: 'Confirm fava bean availability',
        allowedRetries: 2,
        retrySpacingMinutes: 60,
        activeHours: { start: '08:00', end: '18:00', timezone: 'America/New_York' },
        escalationThreshold: 3,
      },
    },
    { now: new Date('2026-05-21T14:45:00.000Z') }
  )

  assert.equal(waiting.status, 'retry_waiting')
  assert.equal(ready.status, 'retry_ready')
})

test('vendor call extraction escalates exhausted or unsafe recovery attempts', () => {
  const actions = extractVendorCallActions({
    callId: 'call-6',
    sourceType: 'ai_call',
    vendorName: 'Farm Stand',
    summary: 'No answer.',
    attemptedAt: '2026-05-21T13:00:00.000Z',
    priorAttempts: [
      {
        id: 'call-4',
        attemptedAt: '2026-05-21T11:00:00.000Z',
        outcome: 'no_answer',
        evidence: 'No answer.',
      },
      {
        id: 'call-5',
        attemptedAt: '2026-05-21T12:00:00.000Z',
        outcome: 'voicemail',
        evidence: 'Voicemail.',
      },
    ],
    callPlan: {
      purpose: 'Confirm fava bean availability',
      allowedRetries: 2,
      retrySpacingMinutes: 30,
      activeHours: { start: '08:00', end: '18:00', timezone: 'America/New_York' },
      escalationThreshold: 3,
    },
  })

  assert.ok(actions.some((action) => action.actionType === 'escalate_manual_call'))
  assert.ok(
    actions.some((action) =>
      String(action.payload.callLoop ? JSON.stringify(action.payload.callLoop) : '').includes(
        'exhausted'
      )
    )
  )
})

test('vendor call extraction does not treat order numbers or delivery times as prices', () => {
  const actions = extractVendorCallActions({
    callId: 'call-7',
    sourceType: 'supplier_call',
    vendorName: 'Pier 9 Seafood',
    ingredientName: 'oysters',
    transcript: 'Order 1842 is available. Delivery is tomorrow between 8am and 10am.',
    transcriptConfidence: 0.9,
  })

  assert.equal(
    actions.some((action) => action.actionType === 'update_ingredient_price'),
    false
  )
  assert.ok(actions.some((action) => action.actionType === 'confirm_delivery'))
  assert.ok(actions.some((action) => action.actionType === 'confirm_availability'))
})
