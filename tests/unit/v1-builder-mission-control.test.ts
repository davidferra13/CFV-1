import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  classifyRawInput,
  readBuilderMode,
  submitRawInput,
  writeBuilderMode,
} from '../../lib/admin/v1-builder-intake'

function tempRoot() {
  return mkdtempSync(join(tmpdir(), 'v1-builder-mission-control-'))
}

test('classifies explicit approved V1 blocker raw input without treating all raw data as proof', () => {
  const result = classifyRawInput(
    'Approved V1 blocker: pricing proof must show quote safety before launch.'
  )

  assert.equal(result.classification, 'approved_v1_blocker')
  assert.equal(result.reviewRequired, false)
  assert.match(result.reasons.join(' '), /V1 blocker/)
})

test('classifies ordinary pricing raw input as research until evidence is attached', () => {
  const result = classifyRawInput('Pricing feels wrong in several zip codes. Please look into it.')

  assert.equal(result.classification, 'research_required')
  assert.equal(result.reviewRequired, true)
})

test('classifies blocked and rejected raw input before it can enter the build queue', () => {
  assert.equal(classifyRawInput('Deploy this and push to main now.').classification, 'blocked')
  assert.equal(
    classifyRawInput('Use AI to generate recipes for the client.').classification,
    'rejected'
  )
})

test('submits repeated simulated human raw data into durable pipeline sinks', async () => {
  const root = tempRoot()

  const inputs = [
    'Approved V1 blocker: payment ledger receipts need visible proof on Mission Control.',
    'Future V2 idea: social planning calendar for chef collaborations.',
    'Pricing data looks suspicious in rural zip codes, needs evidence before build.',
    'Deploy this straight to production after changing the database.',
  ]

  const signals = []
  for (const text of inputs) {
    signals.push(await submitRawInput({ text, sourceLabel: 'test human paste' }, root))
  }

  assert.deepEqual(
    signals.map((signal) => signal.classification),
    ['approved_v1_blocker', 'parked_v2', 'research_required', 'blocked']
  )

  const builderDir = join(root, 'system', 'v1-builder')
  assert.match(readFileSync(join(builderDir, 'approved-queue.jsonl'), 'utf8'), /payment ledger/)
  assert.match(readFileSync(join(builderDir, 'parked-v2.jsonl'), 'utf8'), /social planning/)
  assert.match(readFileSync(join(builderDir, 'research-queue.jsonl'), 'utf8'), /rural zip/)
  assert.match(readFileSync(join(builderDir, 'blocked.jsonl'), 'utf8'), /production/)
  assert.match(readFileSync(join(builderDir, 'request-ledger.jsonl'), 'utf8'), /test human paste/)
})

test('builder mode persists governed build and emergency stop states', async () => {
  const root = tempRoot()

  assert.equal((await readBuilderMode(root)).mode, 'watch')
  const governed = await writeBuilderMode('governed_build', 'testing supervised queue drain', root)
  assert.equal(governed.mode, 'governed_build')
  assert.equal((await readBuilderMode(root)).reason, 'testing supervised queue drain')

  const stopped = await writeBuilderMode('emergency_stop', '', root)
  assert.equal(stopped.mode, 'emergency_stop')
  assert.equal((await readBuilderMode(root)).label, 'Emergency Stop')
})
