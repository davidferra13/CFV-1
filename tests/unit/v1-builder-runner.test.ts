import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runOnce } from '../../lib/v1-builder/runner'
import { getClaimState } from '../../lib/v1-builder/claims'
import { readReceipts } from '../../lib/v1-builder/receipts'
import { readRunnerStatus } from '../../lib/v1-builder/runner-state'
import { createBuilderFixture, queueRecord, writeQueue } from './v1-builder-test-helpers'

test('runOnce builds one approved task through an executor and records receipt', async () => {
  const root = await createBuilderFixture()
  await writeQueue(root, [queueRecord()])

  const result = await runOnce({
    root,
    now: new Date('2026-04-30T13:00:00.000Z'),
    executorCommand: process.execPath,
    executorArgs: ['-e', 'process.stdout.write("built")'],
    skipGitCheck: true,
  })

  assert.equal(result.ok, true)
  assert.equal(result.task?.id, 'v1-fixture')
  assert.ok(result.claimPath)
  assert.ok(result.packetPath)
  assert.ok(result.receiptPath)
  assert.equal(result.executor?.ok, true)

  const packet = await readFile(result.packetPath!, 'utf-8')
  assert.match(packet, /V1 Builder Autonomous Work Packet/)
  assert.match(packet, /Fixture task/)

  const receipts = await readReceipts(root)
  assert.equal(receipts.records.length, 1)
  assert.equal(receipts.records[0].status, 'validated')

  const claims = await getClaimState(root, new Date('2026-04-30T13:10:00.000Z'))
  assert.equal(claims.activeClaim, null)
})

test('runOnce stops on stale claims before invoking executor', async () => {
  const root = await createBuilderFixture()
  await writeQueue(root, [queueRecord()])
  await runOnce({
    root,
    now: new Date('2026-04-30T13:00:00.000Z'),
    executorCommand: process.execPath,
    executorArgs: ['-e', 'process.exit(0)'],
    skipGitCheck: true,
  })

  const blocked = await runOnce({
    root,
    now: new Date('2026-04-30T16:00:00.000Z'),
    executorCommand: process.execPath,
    executorArgs: ['-e', 'process.exit(0)'],
    skipGitCheck: true,
  })

  assert.equal(blocked.ok, true)
  assert.equal(blocked.status, 'waiting')
  assert.equal(blocked.task, null)
})

test('runOnce records failed executor as blocked runner state', async () => {
  const root = await createBuilderFixture()
  await writeQueue(root, [queueRecord()])

  const result = await runOnce({
    root,
    now: new Date('2026-04-30T13:00:00.000Z'),
    executorCommand: process.execPath,
    executorArgs: ['-e', 'process.stderr.write("nope"); process.exit(2)'],
    skipGitCheck: true,
  })

  assert.equal(result.ok, false)
  assert.equal(result.status, 'blocked')
  assert.equal(result.executor?.exitCode, 2)

  const receipts = await readReceipts(root)
  assert.equal(receipts.records[0].status, 'failed')

  const runner = await readRunnerStatus(root)
  assert.equal(runner.status, 'blocked')
  assert.match(runner.lastError || '', /nope/)
})
