import type {
  LaunchReadinessCheck,
  LaunchReadinessCheckKey,
  LaunchReadinessReport,
} from '@/lib/validation/launch-readiness'

export type LaunchReadinessRiskSeverity = 'critical' | 'high' | 'medium' | 'low'

export type LaunchReadinessRiskOwnerHint =
  | 'operator'
  | 'product'
  | 'engineering'
  | 'growth'
  | 'data'

export type LaunchReadinessRiskBlockerClass =
  | 'validation'
  | 'booking'
  | 'money'
  | 'feedback'
  | 'survey'
  | 'onboarding'
  | 'acquisition'
  | 'release'
  | 'backup'

export type LaunchReadinessRiskRegisterInput = {
  checks: ReadonlyArray<LaunchReadinessRiskCheck>
  nextActions?: ReadonlyArray<LaunchReadinessRiskNextAction>
}

export type LaunchReadinessRiskCheck = Pick<
  LaunchReadinessCheck,
  'key' | 'label' | 'status' | 'evidence' | 'evidenceItems' | 'nextStep' | 'href'
>

export type LaunchReadinessRiskNextAction = LaunchReadinessReport['nextActions'][number]

export type LaunchReadinessRiskRegisterEntry = {
  checkKey: LaunchReadinessCheckKey
  label: string
  severity: LaunchReadinessRiskSeverity
  ownerHint: LaunchReadinessRiskOwnerHint
  blockerClass: LaunchReadinessRiskBlockerClass
  evidenceSource: string
  evidence: string
  nextAction: string
  href: string | null
  launchBlocking: boolean
}

type RiskMetadata = {
  ownerHint: LaunchReadinessRiskOwnerHint
  blockerClass: LaunchReadinessRiskBlockerClass
  verifiedSeverity: LaunchReadinessRiskSeverity
  operatorReviewSeverity: LaunchReadinessRiskSeverity
  needsActionSeverity: LaunchReadinessRiskSeverity
  priority: number
}

const RISK_METADATA: Record<LaunchReadinessCheckKey, RiskMetadata> = {
  backup_integrity: {
    ownerHint: 'engineering',
    blockerClass: 'backup',
    verifiedSeverity: 'low',
    operatorReviewSeverity: 'high',
    needsActionSeverity: 'critical',
    priority: 10,
  },
  build_integrity: {
    ownerHint: 'engineering',
    blockerClass: 'release',
    verifiedSeverity: 'low',
    operatorReviewSeverity: 'high',
    needsActionSeverity: 'critical',
    priority: 20,
  },
  public_booking_test: {
    ownerHint: 'operator',
    blockerClass: 'booking',
    verifiedSeverity: 'low',
    operatorReviewSeverity: 'high',
    needsActionSeverity: 'critical',
    priority: 30,
  },
  first_booking_loop: {
    ownerHint: 'operator',
    blockerClass: 'booking',
    verifiedSeverity: 'low',
    operatorReviewSeverity: 'high',
    needsActionSeverity: 'critical',
    priority: 40,
  },
  event_money_loop: {
    ownerHint: 'operator',
    blockerClass: 'money',
    verifiedSeverity: 'low',
    operatorReviewSeverity: 'high',
    needsActionSeverity: 'critical',
    priority: 50,
  },
  real_chef_two_weeks: {
    ownerHint: 'operator',
    blockerClass: 'validation',
    verifiedSeverity: 'low',
    operatorReviewSeverity: 'high',
    needsActionSeverity: 'high',
    priority: 60,
  },
  operator_survey_signal: {
    ownerHint: 'product',
    blockerClass: 'survey',
    verifiedSeverity: 'low',
    operatorReviewSeverity: 'high',
    needsActionSeverity: 'high',
    priority: 70,
  },
  operator_survey: {
    ownerHint: 'product',
    blockerClass: 'survey',
    verifiedSeverity: 'low',
    operatorReviewSeverity: 'medium',
    needsActionSeverity: 'high',
    priority: 80,
  },
  onboarding_test: {
    ownerHint: 'operator',
    blockerClass: 'onboarding',
    verifiedSeverity: 'low',
    operatorReviewSeverity: 'medium',
    needsActionSeverity: 'high',
    priority: 90,
  },
  acquisition_attribution: {
    ownerHint: 'growth',
    blockerClass: 'acquisition',
    verifiedSeverity: 'low',
    operatorReviewSeverity: 'medium',
    needsActionSeverity: 'high',
    priority: 100,
  },
  feedback_captured: {
    ownerHint: 'product',
    blockerClass: 'feedback',
    verifiedSeverity: 'low',
    operatorReviewSeverity: 'medium',
    needsActionSeverity: 'high',
    priority: 110,
  },
}

const SEVERITY_PRIORITY: Record<LaunchReadinessRiskSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function severityFor(check: LaunchReadinessRiskCheck, metadata: RiskMetadata) {
  if (check.status === 'needs_action') return metadata.needsActionSeverity
  if (check.status === 'operator_review') return metadata.operatorReviewSeverity
  return metadata.verifiedSeverity
}

function evidenceSourceFor(check: LaunchReadinessRiskCheck): string {
  const sources = check.evidenceItems
    .map((item) => item.source.trim())
    .filter(
      (source, index, allSources) => source.length > 0 && allSources.indexOf(source) === index
    )

  return sources.length > 0 ? sources.join('; ') : 'launch readiness check'
}

function nextActionFor(
  check: LaunchReadinessRiskCheck,
  nextActions: ReadonlyArray<LaunchReadinessRiskNextAction>
): string {
  const matchedAction = nextActions.find((action) => action.label === check.label)
  return matchedAction?.reason.trim() || check.nextStep.trim()
}

export function buildLaunchReadinessRiskRegister(
  input: LaunchReadinessRiskRegisterInput
): LaunchReadinessRiskRegisterEntry[] {
  const nextActions = input.nextActions ?? []

  return input.checks
    .filter((check) => check.status !== 'verified')
    .map((check) => {
      const metadata = RISK_METADATA[check.key]

      return {
        checkKey: check.key,
        label: check.label,
        severity: severityFor(check, metadata),
        ownerHint: metadata.ownerHint,
        blockerClass: metadata.blockerClass,
        evidenceSource: evidenceSourceFor(check),
        evidence: check.evidence,
        nextAction: nextActionFor(check, nextActions),
        href: check.href,
        launchBlocking: true,
      }
    })
    .sort((a, b) => {
      const severityDelta = SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity]
      if (severityDelta !== 0) return severityDelta

      const priorityDelta = RISK_METADATA[a.checkKey].priority - RISK_METADATA[b.checkKey].priority
      if (priorityDelta !== 0) return priorityDelta

      return a.label.localeCompare(b.label)
    })
}
