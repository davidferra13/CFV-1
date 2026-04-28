import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BLOCKED_VOICE_PATHWAY_ACTIONS,
  VOICE_PATHWAYS,
  assertEveryVoiceRoleHasDefaultPathway,
  getDefaultVoicePathwayId,
  getVoicePathway,
  getVoicePathwayForRole,
  isVoicePathwayActionAllowed,
} from '@/lib/calling/voice-pathways'
import { VOICE_AGENT_CONTRACT } from '@/lib/calling/voice-agent-contract'

test('every voice role has a fail-closed default pathway', () => {
  assert.doesNotThrow(() => assertEveryVoiceRoleHasDefaultPathway())

  for (const role of VOICE_AGENT_CONTRACT.allowedRoles) {
    const pathwayId = getDefaultVoicePathwayId(role)
    assert.ok(pathwayId, `${role} should resolve to a pathway id`)
    assert.ok(getVoicePathwayForRole(role), `${role} should resolve to a pathway`)
  }

  assert.equal(getDefaultVoicePathwayId('unknown_role'), null)
  assert.equal(getVoicePathwayForRole('unknown_role'), null)
})

test('voice pathways require disclosure before operational actions', () => {
  for (const pathway of Object.values(VOICE_PATHWAYS)) {
    assert.ok(pathway.requiredDisclosures.includes('identity'), `${pathway.id} needs identity`)
    assert.ok(pathway.successCondition.length > 0, `${pathway.id} needs success condition`)
    assert.ok(pathway.failureCondition.length > 0, `${pathway.id} needs failure condition`)
  }
})

test('voice pathways block recipe, payment, quote, and destructive actions', () => {
  for (const pathway of Object.values(VOICE_PATHWAYS)) {
    for (const blockedAction of BLOCKED_VOICE_PATHWAY_ACTIONS) {
      assert.equal(
        isVoicePathwayActionAllowed({
          pathwayId: pathway.id,
          action: blockedAction,
        }),
        false,
        `${pathway.id} must block ${blockedAction}`
      )
    }
  }
})

test('voice pathway action checks fail closed for unknown pathways and actions', () => {
  assert.equal(
    isVoicePathwayActionAllowed({
      pathwayId: 'not_a_pathway',
      action: 'create_task',
    }),
    false
  )
  assert.equal(
    isVoicePathwayActionAllowed({
      pathwayId: 'inbound_booking_intake',
      action: 'unknown_action',
    }),
    false
  )
})

test('booking intake can create inquiry but cannot send binding quote', () => {
  assert.equal(getVoicePathway('inbound_booking_intake')?.id, 'inbound_booking_intake')
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
