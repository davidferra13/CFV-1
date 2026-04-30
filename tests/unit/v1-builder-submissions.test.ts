import test from 'node:test'
import assert from 'node:assert/strict'
import { readJsonl, resolveBuilderPath } from '../../lib/v1-builder/store'
import { queueRecordSchema } from '../../lib/v1-builder/types'
import { promoteQueueRecord, submitQueueRecord } from '../../lib/v1-builder/submissions'
import { selectNextTask } from '../../lib/v1-builder/select-next'
import { createBuilderFixture } from './v1-builder-test-helpers'

test('submitQueueRecord defaults raw submissions to research queue', async () => {
  const root = await createBuilderFixture()

  await submitQueueRecord({
    id: 'v1-research',
    title: 'Research this',
    reason: 'Needs evidence before build.',
    createdAt: new Date('2026-04-30T12:35:00.000Z'),
  }, root)

  const research = await readJsonl(resolveBuilderPath('research-queue.jsonl', root), queueRecordSchema)
  const approved = await readJsonl(resolveBuilderPath('approved-queue.jsonl', root), queueRecordSchema)

  assert.equal(research.ok, true)
  assert.equal(research.records[0].classification, 'research_required')
  assert.equal(approved.records.length, 0)
})

test('submitQueueRecord refuses approved V1 records without governor approval flag', async () => {
  const root = await createBuilderFixture()

  await assert.rejects(() => submitQueueRecord({
    id: 'v1-no-approval',
    title: 'Approved without approval',
    reason: 'Should fail.',
    classification: 'approved_v1_blocker',
  }, root), /v1-governor-approved/)
})

test('submitQueueRecord writes approved V1 records to buildable queue when explicitly approved', async () => {
  const root = await createBuilderFixture()

  await submitQueueRecord({
    id: 'v1-approved',
    title: 'Approved task',
    reason: 'V1 governor approved this blocker.',
    classification: 'approved_v1_blocker',
    v1GovernorApproved: true,
    createdAt: new Date('2026-04-30T12:35:00.000Z'),
  }, root)

  const selected = await selectNextTask({ root })

  assert.equal(selected.ok, true)
  assert.equal(selected.task.id, 'v1-approved')
})

test('promoteQueueRecord appends a new approved record without removing the source record', async () => {
  const root = await createBuilderFixture()

  await submitQueueRecord({
    id: 'v1-research-source',
    title: 'Promote me',
    reason: 'Starts as research.',
    classification: 'research_required',
    createdAt: new Date('2026-04-30T12:35:00.000Z'),
  }, root)

  await promoteQueueRecord({
    fromId: 'v1-research-source',
    classification: 'approved_v1_blocker',
    reason: 'Evidence confirmed this is a V1 blocker.',
    v1GovernorApproved: true,
    createdAt: new Date('2026-04-30T12:36:00.000Z'),
  }, root)

  const research = await readJsonl(resolveBuilderPath('research-queue.jsonl', root), queueRecordSchema)
  const approved = await readJsonl(resolveBuilderPath('approved-queue.jsonl', root), queueRecordSchema)

  assert.equal(research.records.length, 1)
  assert.equal(approved.records.length, 1)
  assert.equal(approved.records[0].source, 'governor')
  assert.equal(approved.records[0].classification, 'approved_v1_blocker')
})
