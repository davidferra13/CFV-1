import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseSessionLogItems } from './parse-session-log'
import { parseBuiltSpecQueue } from './parse-spec-status'
import {
  findLineNumber,
  findLastLineNumber,
  readWorkContinuitySources,
  WORK_CONTINUITY_SOURCE_PATHS,
} from './sources'
import {
  WORK_CONTINUITY_CATEGORIES,
  WORK_CONTINUITY_LANES,
  WORK_CONTINUITY_STATUSES,
  type WorkContinuityCounts,
  type WorkContinuityIndex,
  type WorkContinuityItem,
  type WorkContinuityWarning,
} from './types'

const START_HERE_ID = 'ticketed-events-critical-blockers'

export const REQUIRED_WORK_CONTINUITY_SEED_IDS = [
  'built-but-unverified-specs',
  'ticketed-events-critical-blockers',
  'openclaw-health-split',
  'openclaw-cadence-policy-scattered',
  'survey-handoff-demotion',
  'preserved-dirty-checkout-policy',
  'openclaw-social-ingestion-boundary',
  'vr-mr-source-drift',
  'ingredient-pricing-coverage-risk',
  'mempalace-live-query-failure',
] as const

export type WorkContinuityContractResult = {
  failures: string[]
  warnings: WorkContinuityWarning[]
}

export function buildWorkContinuityIndex(rootDir = process.cwd()): WorkContinuityIndex {
  const { sources, warnings } = readWorkContinuitySources(rootDir)
  const items = stableSortWorkContinuityItems(
    dedupeItems([
      ...parseBuiltSpecQueue(sources.get('docs/research/built-specs-verification-queue.md')),
      ...parseSessionLogItems(sources.get('docs/session-log.md')),
      ...buildSeedItems(sources, warnings),
    ])
  )

  const startItem =
    items.find((item) => item.id === START_HERE_ID) ??
    items.find((item) => item.status === 'blocked') ??
    items[0]

  if (!startItem) {
    throw new Error('Work continuity index generated no items.')
  }

  return {
    schemaVersion: 1,
    sourcePaths: [...WORK_CONTINUITY_SOURCE_PATHS],
    warnings,
    counts: countItems(items),
    startHere: {
      id: startItem.id,
      title: startItem.title,
      nextAction: startItem.nextAction,
    },
    items,
  }
}

export function generateWorkContinuityArtifacts(rootDir = process.cwd()): WorkContinuityIndex {
  const index = buildWorkContinuityIndex(rootDir)
  writeStableFile(
    rootDir,
    'reports/work-continuity-index.json',
    `${JSON.stringify(index, null, 2)}\n`
  )
  writeStableFile(
    rootDir,
    'docs/research/work-continuity-index.md',
    renderWorkContinuityReport(index)
  )
  return index
}

export function renderWorkContinuityReport(index: WorkContinuityIndex): string {
  const lines: string[] = [
    '# Work Continuity Index',
    '',
    'Generated from repo-local source files. Missing source files produce warnings, not generation failures.',
    '',
    '## Summary Counts',
    '',
    '### By Category',
    ...renderCounts(index.counts.category),
    '',
    '### By Lane',
    ...renderCounts(index.counts.lane),
    '',
    '### By Status',
    ...renderCounts(index.counts.status),
    '',
    '## Start Here',
    '',
    `- **${index.startHere.title}:** ${index.startHere.nextAction}`,
    '',
  ]

  appendSection(
    lines,
    'Built-Unverified Queue',
    index.items.filter((item) => item.status === 'built_unverified')
  )
  appendSection(
    lines,
    'Blocked Work',
    index.items.filter((item) => item.status === 'blocked')
  )
  appendSection(
    lines,
    'Buried Decisions',
    index.items.filter((item) => item.category === 'buried_decision')
  )
  appendSection(
    lines,
    'OpenClaw/ChefFlow Bridge Gaps',
    index.items.filter((item) => item.category === 'openclaw_gap' || item.lane === 'bridge-owned')
  )
  appendSection(
    lines,
    'Stale Or Contradictory Handoff Pointers',
    index.items.filter(
      (item) =>
        item.category === 'handoff_drift' || item.status === 'stale' || Boolean(item.contradiction)
    )
  )

  lines.push('## Source Coverage And Warnings', '')
  lines.push(`- Source files configured: ${index.sourcePaths.length}`)
  lines.push(
    `- Source files with warnings: ${new Set(index.warnings.map((warning) => warning.path)).size}`
  )
  if (index.warnings.length === 0) {
    lines.push('- No missing source files or parse warnings.')
  } else {
    for (const warning of index.warnings) {
      lines.push(`- ${warning.path}: ${warning.message}`)
    }
  }

  lines.push('')
  return `${lines.join('\n')}\n`
}

export function validateWorkContinuityArtifactContract({
  index,
  markdown,
  rootDir = process.cwd(),
}: {
  index: WorkContinuityIndex
  markdown: string
  rootDir?: string
}): WorkContinuityContractResult {
  const failures: string[] = []
  const itemIds = new Set(index.items.map((item) => item.id))

  for (const seedId of REQUIRED_WORK_CONTINUITY_SEED_IDS) {
    if (!itemIds.has(seedId)) {
      failures.push(`Missing required seed item: ${seedId}`)
    }
  }

  for (const item of index.items) {
    if (item.sourcePaths.length === 0) {
      failures.push(`Item has no source paths: ${item.id}`)
      continue
    }

    for (const sourcePath of item.sourcePaths) {
      if (!sourcePath.line) {
        continue
      }

      const absolutePath = join(rootDir, sourcePath.path)
      if (!existsSync(absolutePath)) {
        failures.push(
          `${item.id} source line references missing file: ${sourcePath.path}:${sourcePath.line}`
        )
        continue
      }

      const lines = readFileSync(absolutePath, 'utf8').split(/\r?\n/)
      const lineText = lines[sourcePath.line - 1]
      if (lineText === undefined) {
        failures.push(
          `${item.id} source line is out of range: ${sourcePath.path}:${sourcePath.line}`
        )
        continue
      }

      if (sourcePath.label && sourcePath.label.trim().length === 0) {
        failures.push(`${item.id} source label is empty: ${sourcePath.path}:${sourcePath.line}`)
      }

      if (sourcePath.label && lineText.trim().length === 0) {
        failures.push(
          `${item.id} labelled source line is empty: ${sourcePath.path}:${sourcePath.line}`
        )
      }
    }
  }

  const startHereHeadingCount = markdown.match(/^## Start Here\s*$/gm)?.length ?? 0
  if (startHereHeadingCount !== 1) {
    failures.push(`Expected exactly one "## Start Here" heading, found ${startHereHeadingCount}`)
  }

  const expectedStartHereLine = formatStartHereRecommendation(index)
  if (!markdown.includes(expectedStartHereLine)) {
    failures.push(
      `Markdown Start Here recommendation does not match JSON startHere: ${expectedStartHereLine}`
    )
  }

  for (const failure of validateCounts(index)) {
    failures.push(failure)
  }

  for (const warning of index.warnings) {
    if (!isAllowedWorkContinuityWarning(warning)) {
      failures.push(`Unexpected warning type for ${warning.path}: ${warning.message}`)
    }
  }

  return {
    failures,
    warnings: index.warnings,
  }
}

export function formatStartHereRecommendation(
  index: Pick<WorkContinuityIndex, 'startHere'>
): string {
  return `- **${index.startHere.title}:** ${index.startHere.nextAction}`
}

function validateCounts(index: WorkContinuityIndex): string[] {
  const failures: string[] = []
  const actualCounts = countItems(index.items)

  for (const category of WORK_CONTINUITY_CATEGORIES) {
    if (index.counts.category[category] !== actualCounts.category[category]) {
      failures.push(
        `Category count mismatch for ${category}: expected ${actualCounts.category[category]}, found ${index.counts.category[category]}`
      )
    }
  }

  for (const lane of WORK_CONTINUITY_LANES) {
    if (index.counts.lane[lane] !== actualCounts.lane[lane]) {
      failures.push(
        `Lane count mismatch for ${lane}: expected ${actualCounts.lane[lane]}, found ${index.counts.lane[lane]}`
      )
    }
  }

  for (const status of WORK_CONTINUITY_STATUSES) {
    if (index.counts.status[status] !== actualCounts.status[status]) {
      failures.push(
        `Status count mismatch for ${status}: expected ${actualCounts.status[status]}, found ${index.counts.status[status]}`
      )
    }
  }

  const itemCount = index.items.length
  const categoryTotal = sumCounts(index.counts.category)
  const laneTotal = sumCounts(index.counts.lane)
  const statusTotal = sumCounts(index.counts.status)
  if (categoryTotal !== itemCount) {
    failures.push(`Category count total mismatch: expected ${itemCount}, found ${categoryTotal}`)
  }
  if (laneTotal !== itemCount) {
    failures.push(`Lane count total mismatch: expected ${itemCount}, found ${laneTotal}`)
  }
  if (statusTotal !== itemCount) {
    failures.push(`Status count total mismatch: expected ${itemCount}, found ${statusTotal}`)
  }

  return failures
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, count) => total + count, 0)
}

function isAllowedWorkContinuityWarning(warning: WorkContinuityWarning): boolean {
  return (
    warning.message.includes('Source file is missing; skipped') ||
    warning.message.includes('Could not find expected evidence')
  )
}

function buildSeedItems(
  sources: Map<string, { path: string; text: string; lines: string[] }>,
  warnings: WorkContinuityWarning[]
): WorkContinuityItem[] {
  const sourcePath = (path: string, pattern: string | RegExp, label: string) => {
    return findSourcePath(sources, warnings, path, pattern, label)
  }
  const lastSourcePath = (path: string, pattern: string | RegExp, label: string) => {
    return findSourcePath(sources, warnings, path, pattern, label, true)
  }

  return [
    {
      id: 'openclaw-health-split',
      title: 'OpenClaw health split',
      category: 'openclaw_gap',
      lane: 'bridge-owned',
      status: 'ready_spec',
      sourcePaths: [
        sourcePath(
          'docs/anthropic-system-audit-2026-04-18.md',
          'two competing truths about whether price intelligence is healthy',
          'audit identifies competing OpenClaw health truths'
        ),
        sourcePath(
          'docs/anthropic-follow-on-audit-answers-2026-04-18.md',
          'There is no one truthful answer to "Is OpenClaw healthy?"',
          'follow-on audit confirms no canonical health answer'
        ),
      ],
      contradiction:
        'Wrapper health, downstream price data, local mirror freshness, and sync-run state answer different questions.',
      nextAction: 'Build canonical stage-aware OpenClaw health contract.',
      lastSeen: '2026-04-18',
    },
    {
      id: 'openclaw-cadence-policy-scattered',
      title: 'OpenClaw cadence policy scattered',
      category: 'openclaw_gap',
      lane: 'runtime-owned',
      status: 'research_backed_unspecced',
      sourcePaths: [
        sourcePath(
          'docs/anthropic-follow-on-audit-answers-2026-04-18.md',
          'OpenClaw cadence is spread across daemon code',
          'cadence policy is not centralized'
        ),
      ],
      nextAction: 'Create code/config cadence authority.',
      lastSeen: '2026-04-18',
    },
    {
      id: 'survey-handoff-demotion',
      title: 'Survey handoff demotion',
      category: 'buried_decision',
      lane: 'docs-owned',
      status: 'verified',
      sourcePaths: [
        sourcePath(
          'docs/research/current-builder-start-handoff-2026-04-02.md',
          'Absent explicit reassignment',
          'default builder queue starts elsewhere'
        ),
        sourcePath(
          'docs/research/current-builder-start-handoff-2026-04-02.md',
          'The survey lane remains real',
          'survey is explicitly not the default queue'
        ),
      ],
      canonicalDecision: 'Survey is explicit validation branch, not default builder queue.',
      nextAction: 'Keep survey work behind explicit branch selection.',
      lastSeen: '2026-04-02',
    },
    {
      id: 'preserved-dirty-checkout-policy',
      title: 'Preserved dirty checkout policy',
      category: 'buried_decision',
      lane: 'docs-owned',
      status: 'verified',
      sourcePaths: [
        sourcePath(
          'docs/archive/session-log-archive.md',
          'preserved-dirty-checkout mode is explicit',
          'dirty checkout policy clarified'
        ),
      ],
      canonicalDecision:
        'Preserved dirty mode is allowed only when build-state and active handoff both authorize it.',
      nextAction:
        'Continue requiring build-state plus active handoff authorization before preserving dirty mode.',
      lastSeen: '2026-04-03',
    },
    {
      id: 'openclaw-social-ingestion-boundary',
      title: 'OpenClaw social ingestion boundary',
      category: 'openclaw_gap',
      lane: 'bridge-owned',
      status: 'research_backed_unspecced',
      sourcePaths: [
        sourcePath(
          'memory/project_openclaw_social_media_orchestration.md',
          'Fix truth and drift in the existing `/social` UI and routing',
          'existing social truth/drift must be fixed first'
        ),
        sourcePath(
          'memory/project_openclaw_social_media_orchestration.md',
          'Add a normalized OpenClaw-to-ChefFlow ingestion boundary',
          'normalized ingestion boundary still needed'
        ),
      ],
      nextAction:
        'Normalized OpenClaw-to-ChefFlow package ingestion, ChefFlow owns approval/publishing.',
      lastSeen: '2026-04-24',
    },
    {
      id: 'vr-mr-source-drift',
      title: 'VR/MR source drift',
      category: 'openclaw_gap',
      lane: 'host-owned',
      status: 'blocked',
      sourcePaths: [
        sourcePath(
          'memory/project_openclaw_vr_spatial_dashboard.md',
          'should treat the live page and its backing API as the source of truth',
          'Pi-hosted live page is source of truth'
        ),
        sourcePath(
          'memory/project_openclaw_vr_spatial_dashboard.md',
          'The live `http://10.0.0.177:8090/game` surface appears',
          'Pi source must be reconciled first'
        ),
      ],
      nextAction: 'Reconcile Pi-side source before feature work.',
      lastSeen: '2026-04-24',
    },
    {
      id: 'ingredient-pricing-coverage-risk',
      title: 'Ingredient pricing coverage risk',
      category: 'release_gap',
      lane: 'bridge-owned',
      status: 'needs_triage',
      sourcePaths: [
        sourcePath(
          'docs/archive/session-log-archive.md',
          'ingredient pricing coverage',
          'pricing coverage concern in prior session log'
        ),
      ],
      nextAction: 'Tie OpenClaw health/provenance to costing confidence.',
      lastSeen: '2026-04-02',
    },
    {
      id: 'mempalace-live-query-failure',
      title: 'MemPalace live query failure',
      category: 'forgotten_leverage',
      lane: 'docs-owned',
      status: 'blocked',
      sourcePaths: [
        sourcePath(
          'obsidian_export/live_pipeline_report.md',
          'latest errors: [codex-conversations] MemPalace mine failed',
          'latest live pipeline MemPalace error'
        ),
        lastSourcePath(
          'obsidian_export/live_pipeline_report.md',
          'chromadb.errors.InternalError: Error in compaction',
          'Chroma compaction/deserialization failure'
        ),
      ],
      nextAction: 'Source-backed continuity index remains required until vector path is repaired.',
      lastSeen: '2026-04-24',
    },
  ]
}

function findSourcePath(
  sources: Map<string, { path: string; text: string; lines: string[] }>,
  warnings: WorkContinuityWarning[],
  path: string,
  pattern: string | RegExp,
  label: string,
  useLast = false
) {
  const source = sources.get(path)
  if (!source) {
    return { path, label }
  }
  const line = useLast ? findLastLineNumber(source, pattern) : findLineNumber(source, pattern)
  if (!line) {
    warnings.push({
      path,
      message: `Could not find expected evidence for "${label}".`,
    })
  }
  return { path, line, label }
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

function dedupeItems(items: WorkContinuityItem[]): WorkContinuityItem[] {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

export function stableSortWorkContinuityItems(items: WorkContinuityItem[]): WorkContinuityItem[] {
  return [...items].sort((a, b) =>
    [a.category, a.lane, a.status, a.title, a.id]
      .join('\u0000')
      .localeCompare([b.category, b.lane, b.status, b.title, b.id].join('\u0000'))
  )
}

function renderCounts(counts: Record<string, number>): string[] {
  return Object.entries(counts).map(([key, count]) => `- ${key}: ${count}`)
}

function appendSection(lines: string[], title: string, items: WorkContinuityItem[]) {
  lines.push(`## ${title}`, '')
  if (items.length === 0) {
    lines.push('- None indexed.', '')
    return
  }

  for (const item of items) {
    lines.push(`### ${item.title}`)
    lines.push('')
    lines.push(`- Category: ${item.category}`)
    lines.push(`- Lane: ${item.lane}`)
    lines.push(`- Status: ${item.status}`)
    if (item.canonicalDecision) {
      lines.push(`- Canonical decision: ${item.canonicalDecision}`)
    }
    if (item.contradiction) {
      lines.push(`- Contradiction: ${item.contradiction}`)
    }
    lines.push(`- Next action: ${item.nextAction}`)
    lines.push(`- Sources: ${item.sourcePaths.map(formatSourcePath).join('; ')}`)
    lines.push('')
  }
}

function formatSourcePath(source: { path: string; line?: number; label?: string }) {
  const location = source.line ? `${source.path}:${source.line}` : source.path
  return source.label ? `${location} (${source.label})` : location
}

function writeStableFile(rootDir: string, relativePath: string, text: string) {
  const absolutePath = join(rootDir, relativePath)
  mkdirSync(dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, text, 'utf8')
}
