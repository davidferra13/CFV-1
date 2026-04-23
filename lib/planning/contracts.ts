export type PlanningRunSource = 'interactive' | 'scheduled' | 'manual' | 'repair'

export type PlanningRunStatus = 'running' | 'completed' | 'failed'

export type PlanningDataQualityStatus = 'pass' | 'warn' | 'fail'

export type PlanningEvidenceStatus = 'full' | 'partial' | 'empty'

export type PlanningDataQualityCheck = {
  key: string
  label: string
  status: PlanningDataQualityStatus
  message: string
}

export type PlanningDataQualitySummary = {
  overallStatus: PlanningDataQualityStatus
  warningCount: number
  failureCount: number
  checks: PlanningDataQualityCheck[]
}

export type PlanningEvidenceSource = {
  key: string
  label: string
  asOf: string
  recordCount: number
  status: PlanningEvidenceStatus
  coveragePercent: number | null
  note: string | null
}

function normalizeCoveragePercent(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function derivePlanningEvidenceStatus(
  recordCount: number,
  coveragePercent: number | null | undefined
): PlanningEvidenceStatus {
  if (!Number.isFinite(recordCount) || recordCount <= 0) return 'empty'

  const normalizedCoverage = normalizeCoveragePercent(coveragePercent)
  if (normalizedCoverage == null || normalizedCoverage >= 95) return 'full'
  if (normalizedCoverage <= 0) return 'empty'
  return 'partial'
}

export function createPlanningEvidenceSource(input: {
  key: string
  label: string
  asOf: string
  recordCount: number
  coveragePercent?: number | null
  note?: string | null
}): PlanningEvidenceSource {
  const coveragePercent = normalizeCoveragePercent(input.coveragePercent)

  return {
    key: input.key,
    label: input.label,
    asOf: input.asOf,
    recordCount: Math.max(0, Math.round(input.recordCount)),
    status: derivePlanningEvidenceStatus(input.recordCount, coveragePercent),
    coveragePercent,
    note: input.note?.trim() || null,
  }
}

export function summarizePlanningDataQuality(
  checks: PlanningDataQualityCheck[]
): PlanningDataQualitySummary {
  const warningCount = checks.filter((check) => check.status === 'warn').length
  const failureCount = checks.filter((check) => check.status === 'fail').length

  return {
    overallStatus: failureCount > 0 ? 'fail' : warningCount > 0 ? 'warn' : 'pass',
    warningCount,
    failureCount,
    checks,
  }
}
