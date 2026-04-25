import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  REQUIRED_WORK_CONTINUITY_SEED_IDS,
  renderWorkContinuityReport,
  validateWorkContinuityArtifactContract,
} from '../../lib/work-continuity/build-index'
import type {
  WorkContinuityCounts,
  WorkContinuityIndex,
  WorkContinuityItem,
} from '../../lib/work-continuity/types'
import {
  WORK_CONTINUITY_CATEGORIES,
  WORK_CONTINUITY_LANES,
  WORK_CONTINUITY_STATUSES,
} from '../../lib/work-continuity/types'

function makeTempRoot(): string {
  const rootDir = mkdtempSync(join(tmpdir(), 'work-continuity-contract-'))
  const sourcePath = join(rootDir, 'docs/source.md')
  mkdirSync(dirname(sourcePath), { recursive: true })
  writeFileSync(sourcePath, 'Evidence line\n', 'utf8')
  return rootDir
}

function makeIndex(overrides: Partial<WorkContinuityIndex> = {}): WorkContinuityIndex {
  const items = REQUIRED_WORK_CONTINUITY_SEED_IDS.map<WorkContinuityItem>((id) => ({
    id,
    title: titleFromId(id),
    category: 'release_gap',
    lane: 'website-owned',
    status: id === 'ticketed-events-critical-blockers' ? 'blocked' : 'verified',
    sourcePaths: [
      {
        path: 'docs/source.md',
        line: 1,
        label: `${id} evidence`,
      },
    ],
    nextAction: `Resolve ${id}.`,
    lastSeen: '2026-04-24',
  }))
  const startItem = items.find((item) => item.id === 'ticketed-events-critical-blockers')!

  return {
    schemaVersion: 1,
    sourcePaths: ['docs/source.md'],
    warnings: [],
    counts: countItems(items),
    startHere: {
      id: startItem.id,
      title: startItem.title,
      nextAction: startItem.nextAction,
    },
    items,
    ...overrides,
  }
}

function titleFromId(id: string): string {
  return id
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function countItems(items: WorkContinuityItem[]): WorkContinuityCounts {
  const counts: WorkContinuityCounts = {
    category: Object.fromEntries(
      WORK_CONTINUITY_CATEGORIES.map((category) => [category, 0])
    ) as WorkContinuityCounts['category'],
    lane: Object.fromEntries(
      WORK_CONTINUITY_LANES.map((lane) => [lane, 0])
    ) as WorkContinuityCounts['lane'],
    status: Object.fromEntries(
      WORK_CONTINUITY_STATUSES.map((status) => [status, 0])
    ) as WorkContinuityCounts['status'],
  }

  for (const item of items) {
    counts.category[item.category] += 1
    counts.lane[item.lane] += 1
    counts.status[item.status] += 1
  }

  return counts
}

function validate(index: WorkContinuityIndex, rootDir = makeTempRoot()) {
  return validateWorkContinuityArtifactContract({
    index,
    markdown: renderWorkContinuityReport(index),
    rootDir,
  })
}

test('required seed IDs are enforced', () => {
  const index = makeIndex()
  index.items = index.items.filter((item) => item.id !== 'mempalace-live-query-failure')
  index.counts = countItems(index.items)

  const result = validate(index)

  assert.match(
    result.failures.join('\n'),
    /Missing required seed item: mempalace-live-query-failure/
  )
})

test('source line references resolve against real files', () => {
  const index = makeIndex()
  index.items[0].sourcePaths[0].line = 99

  const result = validate(index)

  assert.match(result.failures.join('\n'), /source line is out of range/)
})

test('report Start Here count is exactly one', () => {
  const index = makeIndex()
  const markdown = `${renderWorkContinuityReport(index)}\n## Start Here\n`

  const result = validateWorkContinuityArtifactContract({
    index,
    markdown,
    rootDir: makeTempRoot(),
  })

  assert.match(result.failures.join('\n'), /Expected exactly one "## Start Here" heading, found 2/)
})

test('report Start Here text matches JSON', () => {
  const index = makeIndex()
  const markdown = renderWorkContinuityReport(index).replace(
    index.startHere.nextAction,
    'Do something else.'
  )

  const result = validateWorkContinuityArtifactContract({
    index,
    markdown,
    rootDir: makeTempRoot(),
  })

  assert.match(
    result.failures.join('\n'),
    /Markdown Start Here recommendation does not match JSON startHere/
  )
})

test('count totals match indexed items', () => {
  const index = makeIndex()
  index.counts.category.release_gap += 1

  const result = validate(index)

  assert.match(result.failures.join('\n'), /Category count mismatch/)
  assert.match(result.failures.join('\n'), /Category count total mismatch/)
})

test('missing optional source warnings remain warning-based, not fatal', () => {
  const index = makeIndex({
    warnings: [
      {
        path: 'docs/missing-optional.md',
        message: 'Source file is missing; skipped without failing generation.',
      },
      {
        path: 'docs/source.md',
        message: 'Could not find expected evidence for "legacy marker".',
      },
    ],
  })

  const result = validate(index)

  assert.equal(result.failures.length, 0)
  assert.equal(result.warnings.length, 2)
})
