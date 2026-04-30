import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import type { RiskEvent, RiskSeverity } from './types'

export type HygieneFindingKind = 'source_map' | 'secret_like_file' | 'debug_artifact' | 'internal_artifact'

export type HygieneFinding = {
  path: string
  kind: HygieneFindingKind
  severity: RiskSeverity
  reason: string
}

const DEFAULT_EXCLUDES = new Set([
  '.auth',
  '.git',
  '.next',
  '.next-dev',
  '.next-local',
  '.next-verify',
  '.openclaw-deploy',
  '.ts-trace',
  '.v1-builder-worktrees',
  'backups',
  'data',
  'logs',
  'node_modules',
  'playwright-report',
  'test-screenshots',
  'tmp',
])

export function scanReleaseHygiene(root = process.cwd(), scanRoot = root): HygieneFinding[] {
  if (!existsSync(scanRoot)) return []

  const findings: HygieneFinding[] = []
  walk(scanRoot, root, findings)
  return findings.sort((a, b) => a.path.localeCompare(b.path))
}

export function hygieneRiskEvents(runId: string, findings: HygieneFinding[]): RiskEvent[] {
  return findings.map((finding) => ({
    runId,
    kind: 'release_hygiene',
    severity: finding.severity,
    details: `${finding.kind}: ${finding.path} (${finding.reason})`,
  }))
}

function walk(dir: string, root: string, findings: HygieneFinding[]) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (DEFAULT_EXCLUDES.has(entry.name)) continue
      walk(join(dir, entry.name), root, findings)
      continue
    }

    if (!entry.isFile()) continue

    const absolutePath = join(dir, entry.name)
    const relativePath = relative(root, absolutePath).replace(/\\/g, '/')
    const stat = statSync(absolutePath)

    if (entry.name.endsWith('.map')) {
      findings.push({
        path: relativePath,
        kind: 'source_map',
        severity: 'high',
        reason: 'Source maps must not be present in release surfaces.',
      })
    }

    if (isSecretLikeFile(entry.name, relativePath)) {
      findings.push({
        path: relativePath,
        kind: 'secret_like_file',
        severity: 'critical',
        reason: 'Secret-like files require explicit handling before release.',
      })
    }

    if (isDebugArtifact(entry.name)) {
      findings.push({
        path: relativePath,
        kind: 'debug_artifact',
        severity: 'medium',
        reason: 'Debug artifacts should not be shipped as release assets.',
      })
    }

    if (
      relativePath.startsWith('public/') &&
      /builder-agent|agent-journal|run-journal|internal-agent/i.test(entry.name)
    ) {
      findings.push({
        path: relativePath,
        kind: 'internal_artifact',
        severity: 'high',
        reason: 'Internal builder-agent artifacts must not be public.',
      })
    }

    if (stat.size > 25 * 1024 * 1024 && /debug|trace|dump/i.test(entry.name)) {
      findings.push({
        path: relativePath,
        kind: 'debug_artifact',
        severity: 'medium',
        reason: 'Large debug or trace files should stay out of release surfaces.',
      })
    }
  }
}

function isSecretLikeFile(name: string, relativePath: string) {
  if (name === '.env.example' || name.endsWith('.example')) return false
  if (/^\.env(\.|$)/.test(name)) return true
  if (/\.(pem|key|p12|pfx)$/i.test(name)) return true
  if (/\.(ts|tsx|js|jsx|mjs|cjs|md|sql|ps1)$/i.test(name)) return false
  return /(^|[._-])(secret|credentials?|private-key)([._-]|$)/i.test(relativePath)
}

function isDebugArtifact(name: string) {
  return /\.(log|trace|dump)$/i.test(name) || /\.(debug|trace|dump)\./i.test(name)
}
