import type {
  LaunchReadinessCheck,
  LaunchReadinessCheckKey,
  LaunchReadinessReport,
} from '@/lib/validation/launch-readiness'

export type LaunchReadinessOperatorReviewDecision = 'verified' | 'rejected'

export type LaunchReadinessOperatorReviewRecord = {
  checkKey: string
  decision: LaunchReadinessOperatorReviewDecision
  reviewerId?: string | null
  reviewedAt?: string | null
  note?: string | null
}

export type LaunchReadinessOperatorReviewConfig = {
  allowedCheckKeys: readonly LaunchReadinessCheckKey[]
}

export type LaunchReadinessOperatorReviewAppliedDecision = {
  index: number
  checkKey: LaunchReadinessCheckKey
  decision: 'verified'
  reviewerId: string | null
  reviewedAt: string | null
  note: string | null
}

export type LaunchReadinessOperatorReviewRejectedDecision = {
  index: number
  checkKey: string | null
  decision: string | null
  reason:
    | 'invalid_record'
    | 'invalid_check_key'
    | 'invalid_decision'
    | 'check_not_found'
    | 'check_not_configured'
    | 'check_not_in_operator_review'
    | 'duplicate_decision'
    | 'operator_rejected'
  message: string
  reviewerId: string | null
  reviewedAt: string | null
  note: string | null
}

export type LaunchReadinessOperatorReviewSummary = {
  status: LaunchReadinessReport['status']
  verifiedChecks: number
  totalChecks: number
  operatorReviewCount: number
  needsActionCount: number
  appliedDecisionCount: number
  rejectedDecisionCount: number
}

export type LaunchReadinessOperatorReviewResult = {
  report: LaunchReadinessReport
  summary: LaunchReadinessOperatorReviewSummary
  appliedDecisions: LaunchReadinessOperatorReviewAppliedDecision[]
  rejectedDecisions: LaunchReadinessOperatorReviewRejectedDecision[]
}

type ParsedReviewRecord = {
  checkKey: string | null
  decision: string | null
  reviewerId: string | null
  reviewedAt: string | null
  note: string | null
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function parseRecord(record: unknown): ParsedReviewRecord | null {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return null

  const value = record as Record<string, unknown>
  return {
    checkKey: normalizeOptionalString(value.checkKey),
    decision: normalizeOptionalString(value.decision),
    reviewerId: normalizeOptionalString(value.reviewerId),
    reviewedAt: normalizeOptionalString(value.reviewedAt),
    note: normalizeOptionalString(value.note),
  }
}

function rejectDecision(
  index: number,
  parsed: ParsedReviewRecord | null,
  reason: LaunchReadinessOperatorReviewRejectedDecision['reason'],
  message: string
): LaunchReadinessOperatorReviewRejectedDecision {
  return {
    index,
    checkKey: parsed?.checkKey ?? null,
    decision: parsed?.decision ?? null,
    reason,
    message,
    reviewerId: parsed?.reviewerId ?? null,
    reviewedAt: parsed?.reviewedAt ?? null,
    note: parsed?.note ?? null,
  }
}

function isKnownCheckKey(
  checkKey: string,
  checksByKey: ReadonlyMap<string, LaunchReadinessCheck>
): checkKey is LaunchReadinessCheckKey {
  return checksByKey.has(checkKey)
}

function cloneCheck(check: LaunchReadinessCheck): LaunchReadinessCheck {
  return {
    ...check,
    evidenceItems: check.evidenceItems.map((item) => ({ ...item })),
  }
}

function summarize(report: LaunchReadinessReport): LaunchReadinessOperatorReviewSummary {
  const verifiedChecks = report.checks.filter((check) => check.status === 'verified').length
  const operatorReviewCount = report.checks.filter(
    (check) => check.status === 'operator_review'
  ).length
  const needsActionCount = report.checks.filter((check) => check.status === 'needs_action').length

  return {
    status: verifiedChecks === report.checks.length ? 'ready' : 'blocked',
    verifiedChecks,
    totalChecks: report.checks.length,
    operatorReviewCount,
    needsActionCount,
    appliedDecisionCount: 0,
    rejectedDecisionCount: 0,
  }
}

function withRecomputedReportSummary(report: LaunchReadinessReport): LaunchReadinessReport {
  const summary = summarize(report)
  const nextActions = report.checks
    .filter((check) => check.status !== 'verified')
    .slice(0, 5)
    .map((check) => ({
      label: check.label,
      reason: check.nextStep,
      href: check.href,
    }))

  return {
    ...report,
    status: summary.status,
    verifiedChecks: summary.verifiedChecks,
    totalChecks: summary.totalChecks,
    checks: report.checks,
    nextActions,
  }
}

export function applyLaunchReadinessOperatorReviews(
  report: LaunchReadinessReport,
  records: readonly unknown[],
  config: LaunchReadinessOperatorReviewConfig
): LaunchReadinessOperatorReviewResult {
  const checks = report.checks.map(cloneCheck)
  const checksByKey = new Map<string, LaunchReadinessCheck>(
    checks.map((check) => [check.key, check])
  )
  const allowedCheckKeys = new Set<string>(config.allowedCheckKeys)
  const decidedCheckKeys = new Set<string>()
  const appliedDecisions: LaunchReadinessOperatorReviewAppliedDecision[] = []
  const rejectedDecisions: LaunchReadinessOperatorReviewRejectedDecision[] = []

  for (const [index, record] of records.entries()) {
    const parsed = parseRecord(record)
    if (!parsed) {
      rejectedDecisions.push(
        rejectDecision(index, null, 'invalid_record', 'Review record must be an object.')
      )
      continue
    }

    if (!parsed.checkKey) {
      rejectedDecisions.push(
        rejectDecision(index, parsed, 'invalid_check_key', 'Review record is missing checkKey.')
      )
      continue
    }

    if (!parsed.decision || !['verified', 'rejected'].includes(parsed.decision)) {
      rejectedDecisions.push(
        rejectDecision(
          index,
          parsed,
          'invalid_decision',
          'Review decision must be verified or rejected.'
        )
      )
      continue
    }

    if (!isKnownCheckKey(parsed.checkKey, checksByKey)) {
      rejectedDecisions.push(
        rejectDecision(index, parsed, 'check_not_found', 'Review checkKey is not in the report.')
      )
      continue
    }

    const check = checksByKey.get(parsed.checkKey)
    if (!check) continue

    if (decidedCheckKeys.has(parsed.checkKey)) {
      rejectedDecisions.push(
        rejectDecision(
          index,
          parsed,
          'duplicate_decision',
          'Only the first review decision for a check is applied or recorded.'
        )
      )
      continue
    }

    decidedCheckKeys.add(parsed.checkKey)

    if (check.status !== 'operator_review') {
      rejectedDecisions.push(
        rejectDecision(
          index,
          parsed,
          'check_not_in_operator_review',
          'Only checks currently in operator_review can receive operator review decisions.'
        )
      )
      continue
    }

    if (parsed.decision === 'rejected') {
      rejectedDecisions.push(
        rejectDecision(
          index,
          parsed,
          'operator_rejected',
          'Operator rejected this check for launch verification.'
        )
      )
      continue
    }

    if (!allowedCheckKeys.has(parsed.checkKey)) {
      rejectedDecisions.push(
        rejectDecision(
          index,
          parsed,
          'check_not_configured',
          'This check is not configured for operator review verification.'
        )
      )
      continue
    }

    check.status = 'verified'
    check.nextStep = 'Operator review verified this launch-readiness check.'
    appliedDecisions.push({
      index,
      checkKey: parsed.checkKey,
      decision: 'verified',
      reviewerId: parsed.reviewerId,
      reviewedAt: parsed.reviewedAt,
      note: parsed.note,
    })
  }

  const updatedReport = withRecomputedReportSummary({
    ...report,
    checks,
    evidenceLog: report.evidenceLog.map((item) => ({ ...item })),
    pilotCandidates: report.pilotCandidates.map((candidate) => ({
      ...candidate,
      evidence: { ...candidate.evidence },
    })),
  })
  const summary = summarize(updatedReport)

  return {
    report: updatedReport,
    summary: {
      ...summary,
      appliedDecisionCount: appliedDecisions.length,
      rejectedDecisionCount: rejectedDecisions.length,
    },
    appliedDecisions,
    rejectedDecisions,
  }
}
