import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { buildCockpitSummary } from '../../lib/v1-builder/cockpit-summary'
import { resolveBuilderPath } from '../../lib/v1-builder/store'
import { createBuilderFixture, queueRecord, writeQueue } from './v1-builder-test-helpers'

test('cockpit summary reports malformed queue instead of fake empty counts', async () => {
  const root = await createBuilderFixture()
  await writeFile(resolveBuilderPath('approved-queue.jsonl', root), '{bad json\n', 'utf-8')

  const summary = await buildCockpitSummary(root, new Date('2026-04-30T13:20:00.000Z'))

  assert.equal(summary.ok, false)
  assert.match(summary.errors[0], /approved-queue\.jsonl:1/)
})

test('cockpit summary uses real queue counts and keeps pricing blocked', async () => {
  const root = await createBuilderFixture()
  await writeQueue(root, [
    queueRecord({ id: 'v1-blocker', classification: 'approved_v1_blocker' }),
    queueRecord({ id: 'v1-support', classification: 'approved_v1_support' }),
  ])

  const summary = await buildCockpitSummary(root, new Date('2026-04-30T13:20:00.000Z'))

  assert.equal(summary.ok, true)
  assert.equal(summary.queueCounts.v1Blockers, 1)
  assert.equal(summary.queueCounts.v1Support, 1)
  assert.equal(summary.pricingReadiness.status, 'blocked')
  assert.match(summary.pricingReadiness.message, /PRICING DATA/)
})
