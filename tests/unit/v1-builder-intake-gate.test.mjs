import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  createBuilderContext,
  ensureBuilderStore,
  readJsonl,
} from '../../scripts/v1-builder/core.mjs'
import { normalizeIntake } from '../../scripts/v1-builder/normalize-intake.mjs'

function tempContext() {
  const root = mkdtempSync(join(tmpdir(), 'v1-builder-intake-gate-'))
  mkdirSync(join(root, 'docs', 'specs'), { recursive: true })
  writeFileSync(
    join(root, 'docs', 'v1-v2-governor.md'),
    '## Current Active Lane\n\n`V1 event spine stabilization`\n',
    'utf8',
  )

  const context = createBuilderContext(root)
  ensureBuilderStore(context)
  return context
}

function writeReadySpec(context, fileName, { priority = 'P1', title = fileName } = {}) {
  const specDir = join(context.root, 'docs', 'specs')
  mkdirSync(specDir, { recursive: true })
  writeFileSync(
    join(specDir, fileName),
    [
      `# ${title}`,
      '',
      `**Status:** ready`,
      `**Priority:** ${priority}`,
      '',
      'Repair the V1 event spine so client, event, quote, payment, and ledger work stays trustworthy.',
    ].join('\n'),
    'utf8',
  )
}

function writeResearchFinding(context, fileName, title = fileName) {
  const researchDir = join(context.root, 'docs', 'research')
  mkdirSync(researchDir, { recursive: true })
  writeFileSync(
    join(researchDir, fileName),
    [
      `# ${title}`,
      '',
      'This research artifact contains speculative backlog notes and should not enter live intake by default.',
    ].join('\n'),
    'utf8',
  )
}

function writeLegacyBacklogItem(context, fileName, title = fileName) {
  const backlogDir = join(context.root, 'system', 'build-queue')
  mkdirSync(backlogDir, { recursive: true })
  writeFileSync(
    join(backlogDir, fileName),
    [
      `# ${title}`,
      '',
      'Old backlog candidate from a noisy source that still needs V1 governor validation.',
    ].join('\n'),
    'utf8',
  )
}

function records(context, fileName) {
  return readJsonl(join(context.builderDir, fileName)).records
}

test('intake gate prioritizes ready P0 and P1 specs over noisy sources when intake is limited', () => {
  const context = tempContext()
  writeResearchFinding(context, 'aaa-noisy-research.md')
  writeLegacyBacklogItem(context, 'aaa-noisy-backlog.md')
  writeReadySpec(context, 'zzz-v1-blocker.md', {
    priority: 'P0',
    title: 'V1 Payment Ledger Blocker',
  })
  writeReadySpec(context, 'zzz-v1-support.md', {
    priority: 'P1',
    title: 'V1 Quote Support',
  })

  const summary = normalizeIntake({
    context,
    write: true,
    limit: 2,
    now: new Date('2026-04-30T12:00:00Z'),
  })

  assert.equal(summary.newRecords, 2)
  assert.deepEqual(
    records(context, 'approved-queue.jsonl').map((record) => record.canonicalOwner),
    ['docs/specs/zzz-v1-blocker.md', 'docs/specs/zzz-v1-support.md'],
  )
  assert.equal(records(context, 'research-queue.jsonl').length, 0)
})

test('live intake caps default approved queue writes to three buildable specs', () => {
  const context = tempContext()
  for (let index = 1; index <= 5; index += 1) {
    writeReadySpec(context, `v1-ready-${index}.md`, {
      priority: index === 1 ? 'P0' : 'P1',
      title: `V1 Ready Spec ${index}`,
    })
  }

  normalizeIntake({
    context,
    write: true,
    now: new Date('2026-04-30T12:00:00Z'),
  })

  assert.equal(records(context, 'approved-queue.jsonl').length, 3)
})

test('default live intake does not write research or backlog noise into sinks', () => {
  const context = tempContext()
  writeReadySpec(context, 'v1-ready.md', {
    priority: 'P0',
    title: 'V1 Ready Builder Intake',
  })

  for (let index = 1; index <= 4; index += 1) {
    writeResearchFinding(context, `research-noise-${index}.md`)
    writeLegacyBacklogItem(context, `backlog-noise-${index}.md`)
  }

  normalizeIntake({
    context,
    write: true,
    now: new Date('2026-04-30T12:00:00Z'),
  })

  assert.equal(records(context, 'approved-queue.jsonl').length, 1)
  assert.equal(records(context, 'research-queue.jsonl').length, 0)
})

test('research and backlog noise can be written when explicitly enabled', () => {
  const context = tempContext()
  writeResearchFinding(context, 'research-noise.md')
  writeLegacyBacklogItem(context, 'backlog-noise.md')

  normalizeIntake({
    context,
    write: true,
    includeNoisySources: true,
    now: new Date('2026-04-30T12:00:00Z'),
  })

  assert.equal(records(context, 'research-queue.jsonl').length, 2)
})

test('included hard-stop and rejected items keep honest classifications', () => {
  const context = tempContext()
  writeResearchFinding(context, 'blocked-hard-stop.md', 'Blocked Hard Stop')
  writeFileSync(
    join(context.root, 'docs', 'research', 'blocked-hard-stop.md'),
    [
      '# Blocked Hard Stop',
      '',
      'This item asks the builder to push to main after changing release wiring.',
    ].join('\n'),
    'utf8',
  )
  writeLegacyBacklogItem(context, 'rejected-recipe-generation.md', 'Rejected Recipe Generation')
  writeFileSync(
    join(context.root, 'system', 'build-queue', 'rejected-recipe-generation.md'),
    [
      '# Rejected Recipe Generation',
      '',
      'Use AI to generate recipes for a chef event.',
    ].join('\n'),
    'utf8',
  )

  normalizeIntake({
    context,
    write: true,
    includeNoisySources: true,
    now: new Date('2026-04-30T12:00:00Z'),
  })

  const ledgerByOwner = new Map(
    records(context, 'request-ledger.jsonl').map((record) => [record.canonicalOwner, record.status]),
  )
  assert.equal(ledgerByOwner.get('docs/research/blocked-hard-stop.md'), 'blocked')
  assert.equal(ledgerByOwner.get('system/build-queue/rejected-recipe-generation.md'), 'rejected')
  assert.equal(records(context, 'blocked.jsonl').length, 1)
  assert.equal(records(context, 'approved-queue.jsonl').length, 0)
})
