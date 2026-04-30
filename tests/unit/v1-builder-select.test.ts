import test from 'node:test'
import assert from 'node:assert/strict'
import { selectNextTask } from '../../lib/v1-builder/select-next'
import { createBuilderFixture, queueRecord, writeQueue } from './v1-builder-test-helpers'

test('selectNextTask picks a V1 blocker before V1 support', async () => {
  const root = await createBuilderFixture()
  await writeQueue(root, [
    queueRecord({ id: 'v1-support', classification: 'approved_v1_support' }),
    queueRecord({ id: 'v1-blocker', classification: 'approved_v1_blocker' }),
  ])

  const result = await selectNextTask({ root })

  assert.equal(result.ok, true)
  assert.equal(result.task.id, 'v1-blocker')
})

test('selectNextTask rejects parked V2 records', async () => {
  const root = await createBuilderFixture()
  await writeQueue(root, [
    queueRecord({ id: 'v2-item', classification: 'parked_v2' }),
  ])

  const result = await selectNextTask({ root })

  assert.equal(result.ok, false)
  assert.equal(result.task, null)
  assert.match(result.skipped[0], /parked_v2/)
})

test('selectNextTask only allows support work in the active lane', async () => {
  const root = await createBuilderFixture()
  await writeQueue(root, [
    queueRecord({ id: 'wrong-lane', classification: 'approved_v1_support', activeLane: 'other' }),
    queueRecord({ id: 'current-lane', classification: 'approved_v1_support', activeLane: 'pricing-reliability' }),
  ])

  const result = await selectNextTask({ root, activeLane: 'pricing-reliability' })

  assert.equal(result.ok, true)
  assert.equal(result.task.id, 'current-lane')
})
