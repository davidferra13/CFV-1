import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildVoiceAgentFollowUp,
  resolveVoiceAgentTurn,
} from '@/lib/calling/voice-agent-contract'
import {
  getVoicePathwayForRole,
  isVoicePathwayActionAllowed,
} from '@/lib/calling/voice-pathways'

test('voice simulation: calm booking inquiry creates intake path without quote', () => {
  const decision = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'Are you available for a private dinner next Friday for 12 people?',
  })
  const pathway = getVoicePathwayForRole('inbound_unknown')

  assert.equal(decision.type, 'answer_and_collect')
  assert.equal(decision.category, 'booking')
  assert.equal(pathway?.id, 'inbound_unknown_message')
  assert.equal(
    isVoicePathwayActionAllowed({
      pathwayId: 'inbound_booking_intake',
      action: 'create_inquiry',
    }),
    true
  )
  assert.equal(
    isVoicePathwayActionAllowed({
      pathwayId: 'inbound_booking_intake',
      action: 'send_binding_quote',
    }),
    false
  )
})

test('voice simulation: pricing requests hand off instead of quoting', () => {
  const decision = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'Can you tell me exactly what this will cost?',
  })

  assert.equal(decision.type, 'handoff_required')
  assert.equal(decision.category, 'pricing')
  assert.equal(decision.allowedToAnswer, true)
  assert.equal(
    isVoicePathwayActionAllowed({
      pathwayId: 'human_handoff',
      action: 'send_binding_quote',
    }),
    false
  )
})

test('voice simulation: recipe and menu invention stay restricted', () => {
  const decision = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'Can you give me a menu idea and a recipe for the dinner?',
  })

  assert.equal(decision.type, 'restricted')
  assert.equal(decision.category, 'recipe')
  assert.equal(decision.allowedToAnswer, false)
  assert.equal(
    isVoicePathwayActionAllowed({
      pathwayId: 'human_handoff',
      action: 'create_recipe',
    }),
    false
  )
})

test('voice simulation: allergy details create urgent chef review follow-up', () => {
  const decision = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'One guest has a severe shellfish allergy and cross-contact concern.',
  })
  const followUp = buildVoiceAgentFollowUp({
    decision,
    callerLabel: 'Morgan',
    transcript: 'One guest has a severe shellfish allergy and cross-contact concern.',
  })

  assert.equal(decision.type, 'handoff_required')
  assert.equal(decision.category, 'dietary')
  assert.equal(followUp.urgency, 'urgent')
  assert.match(followUp.nextStep, /allergy or dietary/i)
})

test('voice simulation: opt-out can only persist opt-out state', () => {
  const decision = resolveVoiceAgentTurn({
    role: 'inbound_unknown',
    utterance: 'Please stop calling this number.',
  })

  assert.equal(decision.type, 'opt_out')
  assert.equal(decision.category, 'opt_out')
  assert.equal(
    isVoicePathwayActionAllowed({
      pathwayId: 'opt_out',
      action: 'mark_ai_call_opt_out',
    }),
    true
  )
  assert.equal(
    isVoicePathwayActionAllowed({
      pathwayId: 'opt_out',
      action: 'create_inquiry',
    }),
    false
  )
})

test('voice simulation: unknown roles fail closed before pathway execution', () => {
  assert.equal(getVoicePathwayForRole('client_sales_call'), null)
  assert.equal(getVoicePathwayForRole(''), null)
})
