import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RECOVERY_LIMITS,
  createRecoveryEnvironment,
  evaluateRecoverySnapshot,
  isAllowedRecoveryScript,
} from '../../lib/recovery/runtime-safety.mjs'

function safeSnapshot(overrides = {}) {
  return {
    branch: 'codex/cheflo-recovery-test',
    freeMemoryGb: 64,
    freeDiskGb: 100,
    nodeCount: 4,
    nodeWorkingSetGb: 2,
    llamaCount: 1,
    llamaWorkingSetGb: 4,
    recoveryPortInUse: false,
    ...overrides,
  }
}

test('blocks main branches and resource saturation', () => {
  const result = evaluateRecoverySnapshot(
    safeSnapshot({
      branch: 'main',
      freeMemoryGb: 4,
      freeDiskGb: 3,
      nodeCount: 177,
      nodeWorkingSetGb: 28,
      llamaCount: 9,
      llamaWorkingSetGb: 20,
      recoveryPortInUse: true,
    })
  )

  assert.equal(result.safe, false)
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    [
      'unsafe_branch',
      'low_free_memory',
      'low_free_disk',
      'node_process_count',
      'node_memory',
      'llama_process_count',
      'llama_memory',
      'recovery_port_in_use',
    ]
  )
})
test('only permits bounded recovery verification scripts', () => {
  assert.equal(isAllowedRecoveryScript('test:unit:fsm'), true)
  assert.equal(isAllowedRecoveryScript('regression:firewall:fast'), true)
  assert.equal(isAllowedRecoveryScript('dev'), false)
  assert.equal(isAllowedRecoveryScript('prod'), false)
  assert.equal(isAllowedRecoveryScript('drizzle:push'), false)
})

test('forces bounded child-process settings', () => {
  const environment = createRecoveryEnvironment({
    NODE_OPTIONS: '--trace-warnings --max-old-space-size=16384',
  })

  assert.equal(environment.CHEFFLOW_RECOVERY_MODE, '1')
  assert.equal(environment.CI, '1')
  assert.equal(environment.PLAYWRIGHT_WORKERS, '1')
  assert.match(
    environment.NODE_OPTIONS,
    new RegExp('--max-old-space-size=' + RECOVERY_LIMITS.maxNodeHeapMb)
  )
  assert.doesNotMatch(environment.NODE_OPTIONS, /16384/)
})
