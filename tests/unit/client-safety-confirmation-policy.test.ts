import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { decideClientSafetyConfirmation } from '../../lib/clients/client-safety-confirmation-policy'

describe('client safety confirmation policy', () => {
  it('requires chef review and notification when a client removes an allergy', () => {
    const decision = decideClientSafetyConfirmation({
      fieldKey: 'allergies',
      oldValue: ['peanuts', 'shellfish'],
      newValue: ['shellfish'],
      actor: 'client',
      freshnessStatus: 'current',
      daysUntilEvent: 30,
    })

    assert.equal(decision.allowWrite, true)
    assert.equal(decision.requiresChefReview, true)
    assert.equal(decision.blocksEventProgression, false)
    assert.equal(decision.shouldNotifyChef, true)
    assert.deepEqual(decision.reasonCodes, ['safety_field_changed', 'allergy_removed_by_client'])
    assert.equal(decision.nextStep, 'queue_chef_safety_review')
  })

  it('allows chef allergy updates while keeping them reviewable and visible', () => {
    const decision = decideClientSafetyConfirmation({
      fieldKey: 'allergies',
      oldValue: ['peanuts'],
      newValue: ['peanuts', 'sesame'],
      actor: 'chef',
      freshnessStatus: 'current',
      daysUntilEvent: 21,
    })

    assert.equal(decision.allowWrite, true)
    assert.equal(decision.requiresChefReview, true)
    assert.equal(decision.blocksEventProgression, false)
    assert.equal(decision.shouldNotifyChef, true)
    assert.deepEqual(decision.reasonCodes, ['safety_field_changed', 'chef_safety_update'])
    assert.equal(decision.nextStep, 'queue_chef_safety_review')
  })

  it('blocks event progression for stale safety facts near an event', () => {
    const decision = decideClientSafetyConfirmation({
      fieldKey: 'dietary_restrictions',
      oldValue: 'gluten free',
      newValue: 'gluten free',
      actor: 'client',
      freshnessStatus: 'stale',
      daysUntilEvent: 3,
    })

    assert.equal(decision.allowWrite, true)
    assert.equal(decision.requiresChefReview, false)
    assert.equal(decision.blocksEventProgression, true)
    assert.equal(decision.shouldNotifyChef, true)
    assert.deepEqual(decision.reasonCodes, ['stale_safety_fact_near_event'])
    assert.equal(decision.nextStep, 'confirm_before_event_progression')
  })

  it('passes through non-critical fields without review', () => {
    const decision = decideClientSafetyConfirmation({
      fieldKey: 'favorite_cuisines',
      oldValue: ['Italian'],
      newValue: ['Italian', 'Thai'],
      actor: 'client',
      freshnessStatus: 'current',
      daysUntilEvent: 1,
    })

    assert.equal(decision.allowWrite, true)
    assert.equal(decision.requiresChefReview, false)
    assert.equal(decision.blocksEventProgression, false)
    assert.equal(decision.shouldNotifyChef, false)
    assert.deepEqual(decision.reasonCodes, ['non_safety_field'])
    assert.equal(decision.nextStep, 'write_profile_fact')
  })

  it('does not notify or review no-op safety updates', () => {
    const decision = decideClientSafetyConfirmation({
      fieldKey: 'kitchen_constraints',
      oldValue: 'No oven, limited counter space',
      newValue: ' limited counter space ; no oven ',
      actor: 'client',
      freshnessStatus: 'current',
      daysUntilEvent: 7,
    })

    assert.equal(decision.allowWrite, true)
    assert.equal(decision.requiresChefReview, false)
    assert.equal(decision.blocksEventProgression, false)
    assert.equal(decision.shouldNotifyChef, false)
    assert.deepEqual(decision.reasonCodes, ['no_meaningful_change'])
    assert.equal(decision.nextStep, 'none')
  })
})
