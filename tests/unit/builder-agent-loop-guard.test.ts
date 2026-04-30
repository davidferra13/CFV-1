import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateLoopGuard, loopRiskEvent } from '../../lib/builder-agent/loop-guard'
import { detectFrustrationSignals } from '../../lib/builder-agent/frustration-signals'

test('loop guard trips at the repeated failure threshold', () => {
  const state = evaluateLoopGuard(
    [
      { actionKey: 'npm test', status: 'failed' },
      { actionKey: 'npm test', status: 'failed' },
      { actionKey: 'npm test', status: 'failed' },
    ],
    3,
  )

  assert.equal(state.tripped, true)
  assert.equal(state.failureCount, 3)
  assert.equal(state.repeatedAction, 'npm test')
  assert.equal(loopRiskEvent('run-1', state)?.kind, 'loop')
})

test('loop guard resets a command after success', () => {
  const state = evaluateLoopGuard(
    [
      { actionKey: 'npm test', status: 'failed' },
      { actionKey: 'npm test', status: 'success' },
      { actionKey: 'npm test', status: 'failed' },
    ],
    2,
  )

  assert.equal(state.tripped, false)
  assert.equal(state.failureCount, 1)
})

test('frustration detector switches to conservative mode', () => {
  const scan = detectFrustrationSignals('This is still broken, stop guessing and prove it.')

  assert.equal(scan.conservativeMode, true)
  assert.ok(scan.signals.some((signal) => signal.severity === 'high'))
  assert.match(scan.planGuidance, /conservative mode/)
})

