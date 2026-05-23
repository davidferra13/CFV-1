import assert from 'node:assert/strict'
import test from 'node:test'
import {
  brokerRemySensitiveBoundary,
  type RemyBoundarySourceFact,
} from '../../lib/remy/sensitive-boundary-broker.ts'

const privateChefFacts: RemyBoundarySourceFact[] = [
  {
    id: 'fact-health',
    label: 'Chef health note',
    text: 'Chef has a migraine today',
    visibility: 'chef_private',
  },
  {
    id: 'fact-finance',
    label: 'Cash flow note',
    text: 'Cash flow is tight after a revenue gap',
    visibility: 'chef_private',
  },
]

test('chef-only analysis can use private chef facts without redaction', () => {
  const decision = brokerRemySensitiveBoundary({
    userRole: 'chef',
    requestedOutputChannel: 'chef_private',
    requestText: 'Privately analyze whether I should move prep.',
    draftOutput:
      'Chef has a migraine today and cash flow is tight after a revenue gap, so move the prep block.',
    sourceFacts: privateChefFacts,
  })

  assert.equal(decision.requestContext, 'chef_only_analysis')
  assert.equal(decision.decision, 'allow')
  assert.equal(decision.allowedOutputChannel, 'chef_private')
  assert.equal(decision.redactedOutput, decision.originalOutput)
  assert.deepEqual(
    decision.sourceFactVisibility.map((fact) => fact.allowed),
    [true, true]
  )
})

test('client-safe scheduling explanations omit chef-private health and family facts', () => {
  const decision = brokerRemySensitiveBoundary({
    userRole: 'client',
    requestedOutputChannel: 'client_message',
    requestText: 'Explain the arrival time delay to the client.',
    draftOutput:
      'The chef is dealing with a migraine and childcare emergency, so arrival may move.',
    sourceFacts: [
      {
        id: 'fact-health',
        label: 'Chef health note',
        text: 'migraine',
        visibility: 'chef_private',
      },
      {
        id: 'fact-family',
        label: 'Chef family note',
        text: 'childcare emergency',
        visibility: 'chef_private',
      },
    ],
  })

  assert.equal(decision.requestContext, 'client_safe_scheduling')
  assert.equal(decision.allowedOutputChannel, 'client_message')
  assert.equal(decision.decision, 'approval_required')
  assert.equal(decision.requiresChefApproval, true)
  assert.match(decision.redactionReason ?? '', /chef_health/)
  assert.match(decision.redactionReason ?? '', /chef_family/)
  assert.doesNotMatch(decision.redactedOutput ?? '', /migraine|childcare/i)
  assert.match(decision.safeAlternative ?? '', /timing/i)
})

test('public profile copy blocks private finance and crisis explanations', () => {
  const decision = brokerRemySensitiveBoundary({
    userRole: 'public',
    requestedOutputChannel: 'public_profile',
    requestText: 'Write public profile copy for a discounted class.',
    draftOutput: 'Book now because the chef has a cash flow problem after a crisis recovery month.',
    sourceFacts: [],
  })

  assert.equal(decision.requestContext, 'public_profile_copy')
  assert.equal(decision.decision, 'block')
  assert.equal(decision.requiresChefApproval, true)
  assert.ok(decision.sensitivityClasses.includes('chef_finance'))
  assert.ok(decision.sensitivityClasses.includes('crisis_recovery'))
  assert.match(decision.safeAlternative ?? '', /public-facing copy/i)
})

test('staff briefings keep operational staff-safe details but redact chef-private facts', () => {
  const decision = brokerRemySensitiveBoundary({
    userRole: 'staff',
    requestedOutputChannel: 'staff_briefing',
    requestText: 'Prepare the team briefing for tonight.',
    draftOutput:
      'Use the side entrance at 6pm. Chef has a migraine, so avoid asking personal questions.',
    sourceFacts: [
      {
        id: 'fact-ops',
        label: 'Arrival instruction',
        text: 'Use the side entrance at 6pm',
        visibility: 'staff_safe',
      },
      {
        id: 'fact-health',
        label: 'Chef health note',
        text: 'Chef has a migraine',
        visibility: 'chef_private',
      },
    ],
  })

  assert.equal(decision.requestContext, 'staff_briefing')
  assert.equal(decision.allowedOutputChannel, 'staff_briefing')
  assert.equal(decision.decision, 'approval_required')
  assert.match(decision.redactedOutput ?? '', /side entrance/i)
  assert.doesNotMatch(decision.redactedOutput ?? '', /migraine/i)
  assert.equal(decision.sourceFactVisibility[0]?.allowed, true)
  assert.equal(decision.sourceFactVisibility[1]?.allowed, false)
})

test('sensitive non-chef requests default to chef-private review when no channel is supplied', () => {
  const decision = brokerRemySensitiveBoundary({
    userRole: 'client',
    requestText: 'Can you summarize the insurance issue and chargeback risk?',
    draftOutput: 'There is an insurance issue and chargeback risk to review.',
    sourceFacts: [],
  })

  assert.equal(decision.allowedOutputChannel, 'chef_private')
  assert.equal(decision.decision, 'approval_required')
  assert.ok(decision.sensitivityClasses.includes('legal_compliance'))
  assert.ok(decision.sensitivityClasses.includes('crisis_recovery'))
})
