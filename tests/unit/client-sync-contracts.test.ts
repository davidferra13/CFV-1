import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildClientSyncPlan,
  buildClientSyncPlans,
  getRequiredClientSyncTargets,
  summarizeClientSyncPlans,
} from '@/lib/clients/client-sync-contracts'

describe('client sync contracts', () => {
  it('turns allergy changes into required safety work plus non-blocking follow-through', () => {
    const plan = buildClientSyncPlan({
      field: 'allergies',
      actor: 'client',
      trigger: 'client_profile_update',
      changed: true,
    })

    assert.equal(plan.safetyCritical, true)
    assert.deepEqual(getRequiredClientSyncTargets('allergies').sort(), [
      'active_events',
      'chef_client_profile',
      'client_profile',
      'menu_safety',
    ])
    assert.ok(
      plan.steps.some(
        (step) => step.target === 'remy_context_cache' && step.status === 'non_blocking'
      )
    )
    assert.ok(
      plan.steps.some((step) => step.target === 'notifications' && step.status === 'non_blocking')
    )
    assert.ok(
      plan.steps.some((step) => step.target === 'audit_log' && step.status === 'non_blocking')
    )
  })

  it('skips side effects when a tracked field did not change', () => {
    const plan = buildClientSyncPlan({
      field: 'favorite_dishes',
      actor: 'client',
      trigger: 'client_profile_update',
      changed: false,
    })

    assert.deepEqual(plan.steps, [])
    assert.equal(plan.nextStep, 'No sync work is needed because this field did not change.')
  })

  it('keeps payment history tied to ledger-first required sync', () => {
    const plan = buildClientSyncPlan({
      field: 'payment_history',
      actor: 'system',
      trigger: 'system_reconciliation',
      changed: true,
    })

    assert.ok(plan.steps.some((step) => step.target === 'ledger' && step.status === 'required'))
    assert.ok(plan.steps.some((step) => step.target === 'client_dashboard'))
    assert.ok(plan.steps.some((step) => step.target === 'remy_context_cache'))
  })

  it('summarizes mixed sync plans for orchestration', () => {
    const plans = buildClientSyncPlans([
      {
        field: 'allergies',
        actor: 'client',
        trigger: 'client_profile_update',
        changed: true,
      },
      {
        field: 'favorite_cuisines',
        actor: 'chef',
        trigger: 'chef_client_update',
        changed: true,
      },
      {
        field: 'phone',
        actor: 'client',
        trigger: 'client_profile_update',
        changed: false,
      },
    ])
    const summary = summarizeClientSyncPlans(plans)

    assert.equal(summary.changedFieldCount, 2)
    assert.equal(summary.safetyCriticalFieldCount, 1)
    assert.equal(summary.requiredStepCount, 6)
    assert.ok(summary.nonBlockingStepCount > 0)
    assert.match(summary.nextStep, /safety sync/)
  })
})
