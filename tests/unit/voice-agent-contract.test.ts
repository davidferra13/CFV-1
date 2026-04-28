import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  VOICE_AGENT_CONTRACT,
  hasVoiceAgentOptOutRequest,
  resolveVoiceAgentTurn,
} from '@/lib/calling/voice-agent-contract'

const ROOT = process.cwd()
const GATHER_ROUTE = resolve(ROOT, 'app/api/calling/gather/route.ts')
const CALL_LOG = resolve(ROOT, 'components/calling/call-log.tsx')

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

test('voice agent opt-out detection is shared with call handling', () => {
  assert.equal(hasVoiceAgentOptOutRequest('Please stop calling this number'), true)
  assert.equal(hasVoiceAgentOptOutRequest('Call me back tomorrow'), false)

  const gatherSrc = readFileSync(GATHER_ROUTE, 'utf8')
  assert.match(gatherSrc, /hasVoiceAgentOptOutRequest/)
  assert.match(gatherSrc, /resolveVoiceAgentTurn/)
  assert.match(gatherSrc, /voice_agent_decision/)
})

test('call log renders voice agent decisions separately from raw extracted data', () => {
  const callLogSrc = readFileSync(CALL_LOG, 'utf8')

  assert.match(callLogSrc, /VoiceAgentDecisionPanel/)
  assert.match(callLogSrc, /voice_agent_decision/)
  assert.match(callLogSrc, /Voice agent/)
})
