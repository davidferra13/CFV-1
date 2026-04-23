import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CONTACT_INTAKE_LANES,
  OPERATOR_EVALUATION_STATUS_META,
  detectContactIntakeLane,
  parseOperatorWalkthroughSubmission,
} from '@/lib/contact/operator-evaluation'

const walkthroughMessage = [
  'Operator walkthrough request',
  '',
  'Business name: North Fork Catering',
  'Operator type: Caterer or small event team',
  '',
  'Current workflow or tool stack:',
  'Google Sheets, QuickBooks, HoneyBook, inbox threads',
  '',
  'What they want help with:',
  'Tighten inquiry handoffs, staffing visibility, and recurring payment follow-through.',
  '',
  'Source page: compare_honeybook',
  'Source CTA: sticky_cta',
].join('\n')

test('operator walkthrough parsing extracts structured evaluation fields from the existing message format', () => {
  const parsed = parseOperatorWalkthroughSubmission({
    subject: 'Operator walkthrough request - North Fork Catering - Caterer or small event team',
    message: walkthroughMessage,
  })

  assert.deepEqual(parsed, {
    intakeLane: CONTACT_INTAKE_LANES.OPERATOR_WALKTHROUGH,
    businessName: 'North Fork Catering',
    operatorType: 'Caterer or small event team',
    workflowStack: 'Google Sheets, QuickBooks, HoneyBook, inbox threads',
    helpRequest:
      'Tighten inquiry handoffs, staffing visibility, and recurring payment follow-through.',
    sourcePage: 'compare_honeybook',
    sourceCta: 'sticky_cta',
  })
})

test('contact intake lane detection keeps operator walkthrough requests out of the generic contact lane', () => {
  assert.equal(
    detectContactIntakeLane(undefined, {
      subject: 'Operator walkthrough request - North Fork Catering',
      message: walkthroughMessage,
    }),
    CONTACT_INTAKE_LANES.OPERATOR_WALKTHROUGH
  )

  assert.equal(
    detectContactIntakeLane(undefined, {
      subject: 'General support question',
      message: 'Need help with the public booking page.',
    }),
    CONTACT_INTAKE_LANES.GENERAL_CONTACT
  )
})

test('operator evaluation statuses expose the founder-facing labels needed for the inbox lane', () => {
  assert.equal(OPERATOR_EVALUATION_STATUS_META.new.label, 'New')
  assert.equal(OPERATOR_EVALUATION_STATUS_META.scheduled.label, 'Scheduled')
  assert.equal(OPERATOR_EVALUATION_STATUS_META.not_fit.label, 'Not fit')
})
