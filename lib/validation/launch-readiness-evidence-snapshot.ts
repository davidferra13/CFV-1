import { createHash } from 'node:crypto'
import type { LaunchReadinessCheck } from '@/lib/validation/launch-readiness'

export type LaunchReadinessEvidenceSnapshot = {
  key: string
  label: string
  status: string
  evidence: string
  nextStep: string
  href: string | null
  evidenceItems: Array<{
    label: string
    value: string
    source: string
    href: string | null
  }>
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`

  const object = value as Record<string, unknown>
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
    .join(',')}}`
}

export function buildLaunchReadinessEvidenceSnapshot(
  check: LaunchReadinessCheck
): LaunchReadinessEvidenceSnapshot {
  return {
    key: check.key,
    label: check.label,
    status: check.status,
    evidence: check.evidence,
    nextStep: check.nextStep,
    href: check.href,
    evidenceItems: check.evidenceItems.map((item) => ({ ...item })),
  }
}

export function fingerprintLaunchReadinessEvidence(
  snapshot: LaunchReadinessEvidenceSnapshot
): string {
  return createHash('sha256').update(stableJson(snapshot)).digest('hex')
}

export function buildLaunchReadinessEvidenceReviewPayload(check: LaunchReadinessCheck): {
  snapshot: LaunchReadinessEvidenceSnapshot
  fingerprint: string
} {
  const snapshot = buildLaunchReadinessEvidenceSnapshot(check)
  return {
    snapshot,
    fingerprint: fingerprintLaunchReadinessEvidence(snapshot),
  }
}
