import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  remyApprovalPolicyInternals,
  resolveRemyApprovalDecision,
  type RemyApprovalPolicyMap,
} from '@/lib/ai/remy-approval-policy-core'

describe('remy approval policy resolver', () => {
  it('always blocks restricted actions even when tenant override allows', () => {
    const policyMap: RemyApprovalPolicyMap = new Map([
      [
        'agent.delete_event',
        {
          taskType: 'agent.delete_event',
          decision: 'require_approval',
          reason: 'Tenant override',
          enabled: true,
        },
      ],
    ])

    const decision = resolveRemyApprovalDecision({
      taskType: 'agent.delete_event',
      safety: 'restricted',
      policyMap,
    })

    assert.equal(decision.decision, 'block')
    assert.equal(decision.source, 'system_safety')
    assert.equal(decision.taskType, 'agent.delete_event')
  })

  it('applies enabled tenant override for non-restricted actions', () => {
    const policyMap: RemyApprovalPolicyMap = new Map([
      [
        'event.create_draft',
        {
          taskType: 'event.create_draft',
          decision: 'block',
          reason: 'Event drafting is manually controlled.',
          enabled: true,
        },
      ],
    ])

    const decision = resolveRemyApprovalDecision({
      taskType: 'event.create_draft',
      safety: 'significant',
      policyMap,
    })

    assert.equal(decision.decision, 'block')
    assert.equal(decision.source, 'tenant_override')
    assert.equal(decision.reason, 'Event drafting is manually controlled.')
  })

  it('ignores disabled overrides and falls back to default decision', () => {
    const policyMap: RemyApprovalPolicyMap = new Map([
      [
        'event.create_draft',
        {
          taskType: 'event.create_draft',
          decision: 'block',
          reason: 'Disabled override',
          enabled: false,
        },
      ],
    ])

    const decision = resolveRemyApprovalDecision({
      taskType: 'event.create_draft',
      safety: 'significant',
      policyMap,
    })

    assert.equal(decision.decision, 'require_approval')
    assert.equal(decision.source, 'default')
    assert.equal(decision.reason, null)
  })

  it('normalizes task type key before lookup', () => {
    const policyMap: RemyApprovalPolicyMap = new Map([
      [
        'event.create_draft',
        {
          taskType: 'event.create_draft',
          decision: 'block',
          reason: null,
          enabled: true,
        },
      ],
    ])

    const decision = resolveRemyApprovalDecision({
      taskType: '  EVENT.CREATE_DRAFT  ',
      safety: 'reversible',
      policyMap,
    })

    assert.equal(decision.taskType, 'event.create_draft')
    assert.equal(decision.decision, 'block')
  })
})

describe('remy approval policy internals', () => {
  it('defaults to block for restricted and require approval otherwise', () => {
    assert.equal(remyApprovalPolicyInternals.defaultDecisionForSafety('restricted'), 'block')
    assert.equal(
      remyApprovalPolicyInternals.defaultDecisionForSafety('significant'),
      'require_approval'
    )
    assert.equal(
      remyApprovalPolicyInternals.defaultDecisionForSafety('reversible'),
      'require_approval'
    )
  })

  it('detects missing table errors by postgres code or message', () => {
    assert.equal(remyApprovalPolicyInternals.isMissingTableError({ code: '42P01' }), true)
    assert.equal(
      remyApprovalPolicyInternals.isMissingTableError({
        message: 'relation "remy_approval_policies" does not exist',
      }),
      true
    )
    assert.equal(remyApprovalPolicyInternals.isMissingTableError({ code: 'XX000' }), false)
  })
})
