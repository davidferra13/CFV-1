import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseSessionLogItems } from '../../lib/work-continuity/parse-session-log'
import { parseBuiltSpecQueue } from '../../lib/work-continuity/parse-spec-status'
import {
  normalizeLane,
  normalizeStatus,
  readWorkContinuitySources,
} from '../../lib/work-continuity/sources'
import { stableSortWorkContinuityItems } from '../../lib/work-continuity/build-index'
import type { LoadedContinuitySource, WorkContinuityItem } from '../../lib/work-continuity/types'

function source(path: string, text: string): LoadedContinuitySource {
  return {
    path,
    text,
    lines: text.split(/\r?\n/),
  }
}

test('session-log item extraction finds ticketed event blockers', () => {
  const items = parseSessionLogItems(
    source(
      'docs/session-log.md',
      [
        '## 2026-04-24',
        '- Task: Deep audit of Codex-built ticketed events feature',
        '- Notes: Found 5 critical bugs in ticketed events.',
      ].join('\n')
    )
  )

  assert.equal(items.length, 1)
  assert.equal(items[0].id, 'ticketed-events-critical-blockers')
  assert.equal(items[0].status, 'blocked')
  assert.equal(items[0].lane, 'website-owned')
  assert.equal(items[0].sourcePaths[0].line, 3)
})

test('built-spec queue extraction creates aggregate and per-spec items', () => {
  const items = parseBuiltSpecQueue(
    source(
      'docs/research/built-specs-verification-queue.md',
      [
        '8 specs remain in active "built" status.',
        '### 1. Chef Golden Path Reliability',
        '- **Spec:** `docs/specs/p0-chef-golden-path-reliability.md`',
        '- **Priority:** P0',
      ].join('\n')
    )
  )

  assert.equal(items.length, 2)
  assert.equal(items[0].id, 'built-but-unverified-specs')
  assert.equal(items[1].id, 'built-unverified-chef-golden-path-reliability')
  assert.equal(items[1].status, 'built_unverified')
  assert.match(items[1].nextAction, /p0-chef-golden-path-reliability/)
})

test('lane and status normalization falls back conservatively', () => {
  assert.equal(normalizeLane(' runtime-owned '), 'runtime-owned')
  assert.equal(normalizeLane('unknown-lane'), 'docs-owned')
  assert.equal(normalizeStatus(' verified '), 'verified')
  assert.equal(normalizeStatus('maybe-built'), 'needs_triage')
})

test('missing source warning behavior does not hard-fail source loading', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'work-continuity-'))
  const { sources, warnings } = readWorkContinuitySources(tempRoot)

  assert.equal(sources.size, 0)
  assert.ok(warnings.length > 0)
  assert.ok(
    warnings.every((warning) => warning.message.includes('skipped without failing generation'))
  )
})

test('stable output ordering uses category, lane, status, title, then id', () => {
  const first: WorkContinuityItem = {
    id: 'z-id',
    title: 'Zulu',
    category: 'release_gap',
    lane: 'website-owned',
    status: 'blocked',
    sourcePaths: [{ path: 'z.md' }],
    nextAction: 'Fix Zulu.',
  }
  const second: WorkContinuityItem = {
    id: 'a-id',
    title: 'Alpha',
    category: 'built_unverified',
    lane: 'website-owned',
    status: 'built_unverified',
    sourcePaths: [{ path: 'a.md' }],
    nextAction: 'Fix Alpha.',
  }

  assert.deepEqual(
    stableSortWorkContinuityItems([first, second]).map((item) => item.id),
    ['a-id', 'z-id']
  )
})
