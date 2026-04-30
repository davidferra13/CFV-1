import test from 'node:test'
import assert from 'node:assert/strict'
import { writeReceipt, readReceipts } from '../../lib/v1-builder/receipts'
import { createBuilderFixture } from './v1-builder-test-helpers'

const receipt = {
  taskId: 'v1-fixture',
  branch: 'feature/v1-fixture',
  status: 'validated' as const,
  startedAt: '2026-04-30T12:35:00.000Z',
  finishedAt: '2026-04-30T13:20:00.000Z',
  touchedFiles: ['lib/v1-builder/types.ts'],
  validations: [{ command: 'node --test', ok: true, summary: 'tests passed' }],
  commit: 'abc1234',
  pushed: false,
  blockedReason: null,
  missionControlSummary: 'Fixture validated.',
}

test('receipts are written and read as append-only records', async () => {
  const root = await createBuilderFixture()
  const now = new Date('2026-04-30T13:20:00.000Z')

  await writeReceipt(receipt, root, now)
  const result = await readReceipts(root)

  assert.equal(result.ok, true)
  assert.equal(result.records.length, 1)
  assert.equal(result.records[0].taskId, 'v1-fixture')
})

test('receipt writer refuses to overwrite an existing receipt path', async () => {
  const root = await createBuilderFixture()
  const now = new Date('2026-04-30T13:20:00.000Z')

  await writeReceipt(receipt, root, now)
  await assert.rejects(() => writeReceipt(receipt, root, now), /Refusing to overwrite/)
})
