import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  LoadedContinuitySource,
  WorkContinuityLane,
  WorkContinuityStatus,
  WorkContinuityWarning,
} from './types'
import { WORK_CONTINUITY_LANES, WORK_CONTINUITY_STATUSES } from './types'

export const WORK_CONTINUITY_SOURCE_PATHS = [
  'docs/session-log.md',
  'docs/archive/session-log-archive.md',
  'docs/build-state.md',
  'docs/research/current-builder-start-handoff-2026-04-02.md',
  'docs/research/built-specs-verification-queue.md',
  'docs/research/builder-docket-runtime-ownership-map-2026-04-03.md',
  'docs/research/foundations/2026-04-03-system-improvement-control-tower.md',
  'docs/research/foundations/2026-04-03-system-completeness-gap-map.md',
  'docs/anthropic-system-audit-2026-04-18.md',
  'docs/anthropic-follow-on-audit-answers-2026-04-18.md',
  'docs/anthropic-follow-on-audit-supplement-2026-04-18.md',
  'memory/project_openclaw_social_media_orchestration.md',
  'memory/project_openclaw_vr_spatial_dashboard.md',
  'obsidian_export/live_pipeline_report.md',
] as const

export type WorkContinuitySourcePath = (typeof WORK_CONTINUITY_SOURCE_PATHS)[number]

export function readWorkContinuitySources(rootDir = process.cwd()): {
  sources: Map<string, LoadedContinuitySource>
  warnings: WorkContinuityWarning[]
} {
  const sources = new Map<string, LoadedContinuitySource>()
  const warnings: WorkContinuityWarning[] = []

  for (const sourcePath of WORK_CONTINUITY_SOURCE_PATHS) {
    const absolutePath = join(rootDir, sourcePath)
    if (!existsSync(absolutePath)) {
      warnings.push({
        path: sourcePath,
        message: 'Source file is missing; skipped without failing generation.',
      })
      continue
    }

    const text = readFileSync(absolutePath, 'utf8')
    sources.set(sourcePath, {
      path: sourcePath,
      text,
      lines: text.split(/\r?\n/),
    })
  }

  return { sources, warnings }
}

export function findLineNumber(
  source: LoadedContinuitySource | undefined,
  pattern: string | RegExp
): number | undefined {
  if (!source) {
    return undefined
  }

  const matcher =
    typeof pattern === 'string'
      ? (line: string) => line.includes(pattern)
      : (line: string) => pattern.test(line)

  const index = source.lines.findIndex(matcher)
  return index >= 0 ? index + 1 : undefined
}

export function findLastLineNumber(
  source: LoadedContinuitySource | undefined,
  pattern: string | RegExp
): number | undefined {
  if (!source) {
    return undefined
  }

  const matcher =
    typeof pattern === 'string'
      ? (line: string) => line.includes(pattern)
      : (line: string) => pattern.test(line)

  for (let index = source.lines.length - 1; index >= 0; index -= 1) {
    if (matcher(source.lines[index])) {
      return index + 1
    }
  }

  return undefined
}

export function normalizeLane(value: string): WorkContinuityLane {
  const normalized = value.trim().toLowerCase()
  return WORK_CONTINUITY_LANES.includes(normalized as WorkContinuityLane)
    ? (normalized as WorkContinuityLane)
    : 'docs-owned'
}

export function normalizeStatus(value: string): WorkContinuityStatus {
  const normalized = value.trim().toLowerCase()
  return WORK_CONTINUITY_STATUSES.includes(normalized as WorkContinuityStatus)
    ? (normalized as WorkContinuityStatus)
    : 'needs_triage'
}

export function slugifyWorkContinuityId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
