import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  canMarkReadinessGatePassed,
  getReadinessTransitionGates,
} from '../../lib/events/readiness-config.js'

describe('event readiness transition gates', () => {
  it('requires menu approval and documents before confirming a paid event', () => {
    const gates = getReadinessTransitionGates('paid', 'confirmed')

    assert.deepEqual(gates, [
      'allergies_verified',
      'menu_client_approved',
      'documents_generated',
      'deposit_collected',
    ])
  })

  it('requires both packing review and equipment confirmation before starting service', () => {
    const gates = getReadinessTransitionGates('confirmed', 'in_progress')

    assert.deepEqual(gates, ['packing_reviewed', 'equipment_confirmed'])
  })

  it('requires day-of wrap checks before completing service', () => {
    const gates = getReadinessTransitionGates('in_progress', 'completed')

    assert.deepEqual(gates, [
      'receipts_uploaded',
      'kitchen_clean',
      'dop_complete',
      'financial_reconciled',
    ])
  })
})

describe('manual readiness gate completion policy', () => {
  it('allows chef-confirmed operational checklist items to be marked done directly', () => {
    assert.equal(canMarkReadinessGatePassed('packing_reviewed'), true)
    assert.equal(canMarkReadinessGatePassed('equipment_confirmed'), true)
    assert.equal(canMarkReadinessGatePassed('dop_complete'), true)
  })

  it('prevents auto-evaluated gates from being manually marked done without an override reason', () => {
    assert.equal(canMarkReadinessGatePassed('allergies_verified'), false)
    assert.equal(canMarkReadinessGatePassed('menu_client_approved'), false)
    assert.equal(canMarkReadinessGatePassed('documents_generated'), false)
    assert.equal(canMarkReadinessGatePassed('deposit_collected'), false)
  })
})
