import test from 'node:test'
import assert from 'node:assert/strict'

import { detectDiscoveryLoop, recordRecoveryOutcome } from '@/lib/remy/staleness-recovery-contracts'

test('staleness recovery proposes optional actions without relaxing locked constraints', () => {
  const proposal = detectDiscoveryLoop({
    dwellSeconds: 240,
    repeatedFilterCount: 3,
    resultCount: 0,
    diversityScore: 0.2,
    similarCardCount: 5,
    decisionProgressCount: 0,
    lockedConstraints: [
      {
        field: 'distance',
        value: '5 miles',
        locked: true,
        source: 'user',
        reusable: false,
      },
    ],
  })

  assert.equal(proposal.stuck, true)
  assert.ok(proposal.signals.includes('no_results'))
  assert.ok(proposal.actions.includes('fresh_mix'))
  assert.equal(proposal.actions.includes('widen_radius'), false)
  assert.equal(proposal.preservesLockedConstraints, true)
})

test('recovery cooldown suppresses repeated nudges and records outcome shape', () => {
  const proposal = detectDiscoveryLoop({
    dwellSeconds: 300,
    repeatedFilterCount: 4,
    now: '2026-05-13T01:10:00.000Z',
    lastRecoveryAt: '2026-05-13T01:05:00.000Z',
  })

  assert.equal(proposal.cooldownActive, true)
  assert.deepEqual(proposal.actions, [])

  const event = recordRecoveryOutcome({ proposal, accepted: false })
  assert.equal(event.analyticsName, 'remy_discovery_recovery_outcome')
  assert.equal(event.helped, null)
})
