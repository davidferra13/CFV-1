import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { buildApplyExecutionPlan } from '../../scripts/apply-migration-repair.mjs'

function makeReport(overrides = {}) {
  return {
    invalidFiles: [],
    duplicates: [],
    plan: {
      remoteOnly: ['20260305'],
      repairCommands: [
        {
          version: '20260305',
          action: 'reverted',
          command: 'npx database migration repair --linked --status reverted 20260305',
          reason: 'legacy remote short version',
        },
        {
          version: '20260313000011',
          action: 'applied',
          command: 'npx database migration repair --linked --status applied 20260313000011',
          reason: 'historical overlap',
        },
      ],
      pushableLocalOnly: ['20260322000058', '20260330000033'],
      warnings: [],
      ...overrides.plan,
    },
    ...overrides,
  }
}

describe('Database migration repair apply plan', () => {
  it('builds backup, repair, push, typegen, and test steps by default', () => {
    const report = makeReport()
    const plan = buildApplyExecutionPlan(report)

    assert.equal(plan.ok, true)
    assert.deepEqual(
      plan.steps.map((step) => step.label),
      ['backup', 'repair:20260305', 'repair:20260313000011', 'push', 'types', 'tests']
    )
  })

  it('supports partial execution flags without weakening validation', () => {
    const report = makeReport()
    const plan = buildApplyExecutionPlan(report, {
      skipBackup: true,
      skipPush: true,
      skipTypes: true,
      skipTests: true,
    })

    assert.equal(plan.ok, true)
    assert.deepEqual(
      plan.steps.map((step) => step.label),
      ['repair:20260305', 'repair:20260313000011']
    )
  })

  it('fails closed when unresolved drift or invalid local files remain', () => {
    const invalidReport = makeReport({
      invalidFiles: ['20260305_owner_observability_indexes.sql'],
    })
    const unresolvedReport = makeReport({
      plan: {
        remoteOnly: ['20260305', '20269999999999'],
        repairCommands: [
          {
            version: '20260305',
            action: 'reverted',
            command: 'npx database migration repair --linked --status reverted 20260305',
            reason: 'legacy remote short version',
          },
        ],
      },
    })

    const invalidPlan = buildApplyExecutionPlan(invalidReport)
    const unresolvedPlan = buildApplyExecutionPlan(unresolvedReport)

    assert.equal(invalidPlan.ok, false)
    assert.match(invalidPlan.errors[0], /Invalid migration filenames/)
    assert.equal(unresolvedPlan.ok, false)
    assert.match(unresolvedPlan.errors[0], /Unresolved remote-only versions/)
  })
})
