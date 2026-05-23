import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateRemyCommunicationGuardrails } from '../../lib/communication/remy-approval-guardrails.ts'
import type { SmsPolicyDecision } from '../../lib/communication/sms-policy.ts'

const allowedSmsPolicy: SmsPolicyDecision = {
  status: 'allowed',
  reasons: ['Policy passed'],
  proof: {
    hasRecipient: true,
    hasPhone: true,
    phoneValid: true,
    hasConsent: true,
    consentSource: 'client portal',
    optedInAt: '2026-05-21T10:00:00.000Z',
    optedOut: false,
    stopOrHelpState: false,
    preferredChannel: 'sms',
    channelPaused: false,
    regionalEligible: true,
    quietHoursActive: false,
    frequencyAllowed: true,
  },
}

const sourceEvidence = [
  {
    type: 'thread' as const,
    id: 'thread-1',
    label: 'Inbound SMS thread',
    href: '/inbox',
  },
]

test('sensitive Remy communication classes require chef approval', () => {
  const decision = evaluateRemyCommunicationGuardrails({
    confidence: 0.92,
    trigger: 'payment reminder',
    channel: 'sms',
    message: 'Your deposit is past due. Please pay the invoice today.',
    proposedNextAction: 'Send SMS to client',
    sourceEvidence,
    smsPolicy: allowedSmsPolicy,
  })

  assert.equal(decision.requiresApproval, true)
  assert.equal(decision.status, 'pending_approval')
  assert.ok(decision.approvalClasses.includes('money'))
  assert.ok(decision.approvalClasses.includes('external_send_side_effect'))
})

test('low confidence Remy drafts cannot auto-own canonical communication', () => {
  const decision = evaluateRemyCommunicationGuardrails({
    confidence: 0.5,
    trigger: 'unknown inbound message',
    channel: 'email',
    message: 'I think I can handle this.',
    proposedNextAction: 'Email client',
    sourceEvidence,
  })

  assert.equal(decision.requiresApproval, true)
  assert.ok(decision.approvalClasses.includes('low_confidence'))
})

test('safe auto-ack is allowed only when SMS policy passes and no commitment is made', () => {
  const decision = evaluateRemyCommunicationGuardrails({
    confidence: 0.9,
    trigger: 'inbound acknowledgement',
    channel: 'sms',
    message: 'Thanks for reaching out. I received your message and will review it shortly.',
    proposedNextAction: 'Send SMS acknowledgement',
    sourceEvidence,
    smsPolicy: allowedSmsPolicy,
  })

  assert.equal(decision.requiresApproval, false)
  assert.equal(decision.safeAutoAckAllowed, true)
  assert.equal(decision.status, 'auto_ack_allowed')
})

test('blocked SMS policy blocks Remy auto-ack', () => {
  const decision = evaluateRemyCommunicationGuardrails({
    confidence: 0.95,
    trigger: 'inbound acknowledgement',
    channel: 'sms',
    message: 'Thanks for reaching out. I received your message and will review it shortly.',
    proposedNextAction: 'Send SMS acknowledgement',
    sourceEvidence,
    smsPolicy: {
      ...allowedSmsPolicy,
      status: 'blocked',
      reasons: ['Recipient has opted out of SMS'],
      proof: { ...allowedSmsPolicy.proof, optedOut: true },
    },
  })

  assert.equal(decision.requiresApproval, true)
  assert.equal(decision.safeAutoAckAllowed, false)
  assert.equal(decision.status, 'blocked')
  assert.match(decision.policyReason, /opted out/)
})

test('public Remy communication blocks private ChefFlow facts before approval', () => {
  const decision = evaluateRemyCommunicationGuardrails({
    confidence: 0.96,
    trigger: 'public profile update',
    channel: 'email',
    outputAudience: 'public',
    message:
      'The chef has a cash flow revenue gap and a family emergency, so this class is discounted.',
    proposedNextAction: 'Publish public offer copy',
    sourceEvidence,
  })

  assert.equal(decision.status, 'blocked')
  assert.equal(decision.requiresApproval, true)
  assert.ok(decision.approvalClasses.includes('private_fact_boundary'))
  assert.ok(decision.boundary.sensitivityClasses.includes('chef_finance'))
  assert.ok(decision.boundary.sensitivityClasses.includes('chef_family'))
  assert.match(decision.boundary.safeAlternative ?? '', /neutral status update/)
})

test('client Remy communication requires approval for private facts instead of auto-send', () => {
  const decision = evaluateRemyCommunicationGuardrails({
    confidence: 0.94,
    trigger: 'client scheduling reply',
    channel: 'sms',
    outputAudience: 'client',
    message: 'The chef is dealing with a migraine and will review the arrival time soon.',
    proposedNextAction: 'Send SMS to client',
    sourceEvidence,
    smsPolicy: allowedSmsPolicy,
  })

  assert.equal(decision.status, 'pending_approval')
  assert.equal(decision.safeAutoAckAllowed, false)
  assert.ok(decision.approvalClasses.includes('private_fact_boundary'))
  assert.ok(decision.approvalClasses.includes('external_send_side_effect'))
})
