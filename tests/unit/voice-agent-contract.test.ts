import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  VOICE_AGENT_CONTRACT,
  buildVoiceAgentFollowUp,
  hasVoiceAgentOptOutRequest,
  resolveVoiceAgentConversationDecision,
  resolveVoiceAgentTurn,
} from '@/lib/calling/voice-agent-contract'

const ROOT = process.cwd()
const GATHER_ROUTE = resolve(ROOT, 'app/api/calling/gather/route.ts')
const CALL_LOG = resolve(ROOT, 'components/calling/call-log.tsx')
const CALL_SHEET = resolve(ROOT, 'app/(chef)/culinary/call-sheet/page.tsx')
const LIVE_ALERTS = resolve(ROOT, 'components/calling/chef-live-alerts.tsx')
const QUICK_NOTES = resolve(ROOT, 'components/dashboard/quick-notes-section.tsx')

test('voice agent contract requires AI disclosure and hard answer boundaries', () => {
  assert.match(VOICE_AGENT_CONTRACT.identityDisclosure, /AI assistant/)
  assert.match(VOICE_AGENT_CONTRACT.recordingDisclosure, /recorded/)
  assert.ok(
    VOICE_AGENT_CONTRACT.hardBoundaries.some((boundary) =>
      boundary.includes('Never pretend to be human')
    )
  )
  assert.ok(
    VOICE_AGENT_CONTRACT.hardBoundaries.some((boundary) => boundary.includes('Never invent prices'))
  )
  assert.ok(
    VOICE_AGENT_CONTRACT.hardBoundaries.some((boundary) =>
      boundary.includes('Never generate recipes')
    )
  )
})

test('voice agent resolves booking questions with an answer and follow-up collection', () => {
  const decision = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'Are you available for a catering dinner next Friday?',
  })

  assert.equal(decision.type, 'answer_and_collect')
  assert.equal(decision.category, 'booking')
  assert.equal(decision.allowedToAnswer, true)
  assert.match(decision.answer, /event date/)
})

test('voice agent escalates pricing instead of inventing a quote', () => {
  const decision = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'What would this cost for twenty people?',
  })

  assert.equal(decision.type, 'handoff_required')
  assert.equal(decision.category, 'pricing')
  assert.match(decision.answer, /cannot give a binding quote/)
})

test('voice agent refuses recipe generation by voice', () => {
  const decision = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'Can you give me a recipe or menu idea?',
  })

  assert.equal(decision.type, 'restricted')
  assert.equal(decision.category, 'recipe')
  assert.equal(decision.allowedToAnswer, false)
})

test('voice agent hands menu confirmations and revisions to chef review', () => {
  const decision = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'I want to approve the tasting menu but swap the second course.',
  })
  const followUp = buildVoiceAgentFollowUp({
    decision,
    callerLabel: 'Avery',
    transcript: 'I want to approve the tasting menu but swap the second course.',
  })

  assert.equal(decision.type, 'handoff_required')
  assert.equal(decision.category, 'menu')
  assert.equal(decision.allowedToAnswer, true)
  assert.match(decision.answer, /cannot create or change/)
  assert.equal(followUp.label, 'Menu review')
  assert.equal(followUp.urgency, 'review')
  assert.match(followUp.nextStep, /before changing any menu/)
})

test('voice agent refuses menu building by voice', () => {
  const decision = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'Can you build us a menu and suggest dishes for Saturday?',
  })

  assert.equal(decision.type, 'restricted')
  assert.equal(decision.category, 'recipe')
  assert.equal(decision.allowedToAnswer, false)
  assert.match(decision.answer, /cannot create recipes, menu ideas, dish ideas/)
})

test('voice agent preserves first-turn handoff boundaries after detail collection', () => {
  const firstTurn = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'What would this cost for twenty people?',
  })
  const secondTurn = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'June fourth, twenty guests, in Boston.',
  })

  const finalDecision = resolveVoiceAgentConversationDecision({
    previousDecision: firstTurn,
    currentDecision: secondTurn,
    step: 2,
  })

  assert.equal(finalDecision.type, 'handoff_required')
  assert.equal(finalDecision.category, 'pricing')
  assert.match(finalDecision.answer, /cannot give a binding quote/)
})

test('voice agent follow-up creates actionable chef task copy', () => {
  const decision = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'Are you available for a dinner next Friday?',
  })
  const followUp = buildVoiceAgentFollowUp({
    decision,
    callerLabel: 'Jordan Lee',
    transcript: 'Are you available for a dinner next Friday? June fourth, 14 guests, Cambridge.',
  })

  assert.equal(followUp.label, 'Booking intake')
  assert.equal(followUp.urgency, 'standard')
  assert.match(followUp.nextStep, /guest count/)
  assert.match(followUp.quickNoteText, /Next step:/)
  assert.match(followUp.alertBody, /Jordan Lee/)
})

test('voice agent opt-out detection is shared with call handling', () => {
  assert.equal(hasVoiceAgentOptOutRequest('Please stop calling this number'), true)
  assert.equal(hasVoiceAgentOptOutRequest('Call me back tomorrow'), false)

  const gatherSrc = readFileSync(GATHER_ROUTE, 'utf8')
  assert.match(gatherSrc, /hasVoiceAgentOptOutRequest/)
  assert.match(gatherSrc, /getVoicePathwayForRole/)
  assert.match(gatherSrc, /blocked unknown voice role/)
  assert.doesNotMatch(gatherSrc, /searchParams\.get\('role'\) \?\? 'vendor_availability'/)
  assert.match(gatherSrc, /resolveVoiceAgentTurn/)
  assert.match(gatherSrc, /buildVoiceAgentFollowUp/)
  assert.match(gatherSrc, /voiceAgentFollowUp/)
  assert.match(gatherSrc, /voice_agent_decision/)
})

test('call log renders voice agent decisions separately from raw extracted data', () => {
  const callLogSrc = readFileSync(CALL_LOG, 'utf8')

  assert.match(callLogSrc, /VoiceAgentDecisionPanel/)
  assert.match(callLogSrc, /voice_agent_decision/)
  assert.match(callLogSrc, /Voice agent/)
})

test('voice agent follow-up reaches live alerts and inbox', () => {
  const liveAlertsSrc = readFileSync(LIVE_ALERTS, 'utf8')
  const callSheetSrc = readFileSync(CALL_SHEET, 'utf8')

  assert.match(liveAlertsSrc, /voiceAgentFollowUp/)
  assert.match(liveAlertsSrc, /call-sheet\?tab=inbox/)
  assert.match(callSheetSrc, /inboxFollowUp/)
  assert.match(callSheetSrc, /buildVoiceAgentFollowUp/)
})

test('voice booking intake creates linked inquiry workflow', () => {
  const gatherSrc = readFileSync(GATHER_ROUTE, 'utf8')
  const quickNotesSrc = readFileSync(QUICK_NOTES, 'utf8')

  assert.match(gatherSrc, /ensureInboundBookingInquiry/)
  assert.match(gatherSrc, /\.from\('inquiries'\)/)
  assert.match(gatherSrc, /voice_agent_inquiry_id/)
  assert.match(gatherSrc, /inquiry_state_transitions/)
  assert.match(gatherSrc, /triaged_to: voiceAgentInquiryId \? 'inquiry' : null/)
  assert.match(quickNotesSrc, /Open linked inquiry/)
  assert.match(quickNotesSrc, /\/inquiries\/\$\{note\.triaged_ref_id\}/)
})
