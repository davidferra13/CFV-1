import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateScheduledSmsPolicy } from '@/lib/communication/sms-policy'

const baseClient = {
  id: 'client-1',
  phone: '+15551234567',
  communication_preference: { smsOptIn: true },
}

test('scheduled SMS requires explicit recipient consent', () => {
  const decision = evaluateScheduledSmsPolicy({
    client: {
      id: 'client-1',
      phone: '+15551234567',
      communication_preference: {},
    },
  })

  assert.equal(decision.status, 'blocked')
  assert.equal(decision.proof.hasConsent, false)
  assert.match(decision.reasons.join(' '), /explicit SMS consent/)
})

test('STOP and opt-out state block scheduled SMS even with consent', () => {
  const decision = evaluateScheduledSmsPolicy({
    client: {
      ...baseClient,
      communication_preference: { smsOptIn: true, smsLastKeyword: 'STOP' },
    },
  })

  assert.equal(decision.status, 'blocked')
  assert.equal(decision.proof.stopOrHelpState, true)
})

test('quiet hours delay otherwise eligible scheduled SMS', () => {
  const decision = evaluateScheduledSmsPolicy({
    client: baseClient,
    quietHours: {
      enabled: true,
      startTime: '22:00',
      endTime: '07:00',
      timezone: 'UTC',
    },
    now: new Date('2026-05-21T03:30:00.000Z'),
  })

  assert.equal(decision.status, 'delayed')
  assert.equal(decision.proof.quietHoursActive, true)
})

test('frequency cap delays otherwise eligible scheduled SMS', () => {
  const decision = evaluateScheduledSmsPolicy({
    client: baseClient,
    recentSmsCount24h: 3,
    frequencyCap24h: 3,
  })

  assert.equal(decision.status, 'delayed')
  assert.equal(decision.proof.frequencyAllowed, false)
})

test('eligible scheduled SMS is allowed when policy passes', () => {
  const decision = evaluateScheduledSmsPolicy({
    client: baseClient,
    quietHours: {
      enabled: true,
      startTime: '22:00',
      endTime: '07:00',
      timezone: 'UTC',
    },
    now: new Date('2026-05-21T15:00:00.000Z'),
  })

  assert.equal(decision.status, 'allowed')
  assert.deepEqual(decision.reasons, ['Policy passed'])
})

test('SMS eligibility exposes consent source and opt-in proof', () => {
  const decision = evaluateScheduledSmsPolicy({
    client: {
      ...baseClient,
      communication_preference: {
        smsConsentStatus: 'opted_in',
        smsConsentSource: 'client portal',
        smsOptInAt: '2026-05-20T14:00:00.000Z',
      },
    },
  })

  assert.equal(decision.status, 'allowed')
  assert.equal(decision.proof.consentSource, 'client portal')
  assert.equal(decision.proof.optedInAt, '2026-05-20T14:00:00.000Z')
})

test('invalid phone format blocks SMS before provider send', () => {
  const decision = evaluateScheduledSmsPolicy({
    client: {
      ...baseClient,
      phone: 'kitchen phone',
    },
  })

  assert.equal(decision.status, 'blocked')
  assert.equal(decision.proof.phoneValid, false)
  assert.match(decision.reasons.join(' '), /valid SMS phone/)
})

test('preferred non-SMS channel and paused channel block automated SMS', () => {
  const decision = evaluateScheduledSmsPolicy({
    client: {
      ...baseClient,
      preferred_contact_method: 'email',
      communication_preference: {
        smsOptIn: true,
        smsPaused: true,
      },
    },
  })

  assert.equal(decision.status, 'blocked')
  assert.equal(decision.proof.preferredChannel, 'email')
  assert.equal(decision.proof.channelPaused, true)
})

test('regional ineligibility blocks automated SMS', () => {
  const decision = evaluateScheduledSmsPolicy({
    client: {
      ...baseClient,
      communication_preference: {
        smsOptIn: true,
        smsRegionalEligible: false,
      },
    },
  })

  assert.equal(decision.status, 'blocked')
  assert.equal(decision.proof.regionalEligible, false)
  assert.match(decision.reasons.join(' '), /region/)
})
