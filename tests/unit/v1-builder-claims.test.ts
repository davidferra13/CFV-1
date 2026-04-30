import test from 'node:test'
import assert from 'node:assert/strict'
import { getClaimState, writeClaim } from '../../lib/v1-builder/claims'
import { selectNextTask } from '../../lib/v1-builder/select-next'
import { createBuilderFixture, queueRecord, writeQueue } from './v1-builder-test-helpers'

test('fresh claims block selecting another task', async () => {
  const root = await createBuilderFixture()
  await writeQueue(root, [queueRecord()])
  await writeClaim({
    taskId: 'v1-fixture',
    claimedAt: '2026-04-30T12:35:00.000Z',
    branch: 'feature/v1-fixture',
    agent: 'codex',
    status: 'claimed',
    expiresAt: '2026-04-30T14:35:00.000Z',
  }, root, new Date('2026-04-30T12:35:00.000Z'))

  const result = await selectNextTask({ root, now: new Date('2026-04-30T13:00:00.000Z') })

  assert.equal(result.ok, false)
  assert.equal(result.activeClaim?.taskId, 'v1-fixture')
})

test('stale claims stop automatic reclaim', async () => {
  const root = await createBuilderFixture()
  await writeQueue(root, [queueRecord()])
  await writeClaim({
    taskId: 'v1-fixture',
    claimedAt: '2026-04-30T12:35:00.000Z',
    branch: 'feature/v1-fixture',
    agent: 'codex',
    status: 'claimed',
    expiresAt: '2026-04-30T14:35:00.000Z',
  }, root, new Date('2026-04-30T12:35:00.000Z'))

  const state = await getClaimState(root, new Date('2026-04-30T15:00:00.000Z'))
  const result = await selectNextTask({ root, now: new Date('2026-04-30T15:00:00.000Z') })

  assert.equal(state.staleClaims.length, 1)
  assert.equal(result.ok, false)
  assert.match(result.skipped[0], /stale claim/)
})
