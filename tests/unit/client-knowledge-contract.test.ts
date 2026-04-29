import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canAudienceSeeClientKnowledgeField,
  getClientKnowledgeContract,
  getClientKnowledgeContracts,
  getClientKnowledgeFieldsForAudience,
  getClientKnowledgeSyncTargets,
  getRemyClientSourceLabels,
} from '@/lib/clients/client-knowledge-contract'

describe('client knowledge contract', () => {
  it('maps every client knowledge field to an explicit source and visibility contract', () => {
    const contracts = getClientKnowledgeContracts()

    assert.ok(contracts.length >= 20)
    for (const contract of contracts) {
      assert.ok(contract.key)
      assert.ok(contract.label)
      assert.ok(contract.sourceOfTruth)
      assert.ok(contract.editableBy.length > 0)
      assert.ok(contract.visibleTo.length > 0)
      assert.ok(contract.syncTargets.length > 0)
    }
  })

  it('requires allergy changes to fan out to safety, events, Remy, notifications, and audit logs', () => {
    const allergyTargets = getClientKnowledgeSyncTargets('allergies')

    assert.deepEqual(
      [
        'active_events',
        'audit_log',
        'chef_client_profile',
        'client_profile',
        'menu_safety',
        'notifications',
        'remy_context_cache',
      ].sort(),
      allergyTargets.sort()
    )
    assert.equal(getClientKnowledgeContract('allergies').safetyCritical, true)
    assert.equal(getClientKnowledgeContract('allergies').freshness, 'review_30d')
  })

  it('keeps private chef notes out of client and client-side Remy context', () => {
    assert.equal(canAudienceSeeClientKnowledgeField('client', 'private_chef_notes'), false)
    assert.equal(canAudienceSeeClientKnowledgeField('remy_client', 'private_chef_notes'), false)
    assert.equal(canAudienceSeeClientKnowledgeField('chef', 'private_chef_notes'), true)
    assert.equal(canAudienceSeeClientKnowledgeField('remy_chef', 'private_chef_notes'), true)
  })

  it('exposes only client-safe fields to client-side Remy with source labels', () => {
    const remyFields = getClientKnowledgeFieldsForAudience('remy_client')
    const fieldKeys = remyFields.map((field) => field.key)
    const labels = getRemyClientSourceLabels()

    assert.ok(fieldKeys.includes('allergies'))
    assert.ok(fieldKeys.includes('event_history'))
    assert.ok(fieldKeys.includes('loyalty_status'))
    assert.equal(fieldKeys.includes('private_chef_notes'), false)
    assert.deepEqual(
      ['dietary', 'dinner_circle', 'event', 'ledger', 'loyalty', 'preferences', 'profile'],
      labels
    )
  })
})
