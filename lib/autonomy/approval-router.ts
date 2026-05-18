import type {
  ApprovalGate,
  AutonomyAction,
  AutonomyMode,
  AutonomyPreferences,
  AutonomyRiskLevel,
} from '@/lib/autonomy/types'

const DEFAULT_MIN_AUTO_CONFIDENCE = 0.85

export function buildDefaultAutonomyPreferences(tenantId: string): AutonomyPreferences {
  return {
    tenantId,
    defaultMode: 'approval',
    minAutoConfidence: DEFAULT_MIN_AUTO_CONFIDENCE,
    domainModes: {
      logistics: 'auto',
      operations: 'auto',
      communication: 'approval',
      financial: 'approval',
      marketing: 'approval',
      client: 'approval',
      vendor: 'approval',
      safety: 'manual',
      general: 'approval',
    },
    actionPolicies: [],
    blockedActionTypes: [],
    allowHighRiskAuto: false,
    learningPromotionThreshold: 10,
  }
}

export function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function normalizeUrgency(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(5, Math.max(1, Math.round(value)))
}

export function inferRiskLevel(input: {
  domain: string
  signalType: string
  urgency: number
  actionType?: string
  reversible?: boolean
}): AutonomyRiskLevel {
  const normalizedSignal =
    `${input.domain}.${input.signalType}.${input.actionType ?? ''}`.toLowerCase()

  if (
    normalizedSignal.includes('delete') ||
    normalizedSignal.includes('payment') ||
    normalizedSignal.includes('refund') ||
    normalizedSignal.includes('contract') ||
    normalizedSignal.includes('legal')
  ) {
    return 'high'
  }

  if (input.domain === 'financial') return 'high'
  if (input.domain === 'safety') return 'high'
  if (input.domain === 'communication' || input.domain === 'marketing') return 'medium'
  if (!input.reversible && input.urgency >= 4) return 'medium'
  return 'low'
}

export function resolveApprovalGate(
  action: AutonomyAction,
  preferences: AutonomyPreferences
): ApprovalGate {
  const confidence = normalizeConfidence(action.confidenceScore)
  const actionPolicy = preferences.actionPolicies.find(
    (policy) => policy.actionType === action.actionType
  )
  const minConfidence =
    actionPolicy?.minConfidence ?? preferences.minAutoConfidence ?? DEFAULT_MIN_AUTO_CONFIDENCE

  if (action.riskLevel === 'restricted') {
    return buildGate(
      'block',
      'Restricted actions cannot be performed autonomously.',
      minConfidence,
      'risk'
    )
  }

  if (preferences.blockedActionTypes.includes(action.actionType)) {
    return buildGate(
      'block',
      'This action type is blocked in autonomy preferences.',
      minConfidence,
      'blocked_action'
    )
  }

  if (action.riskLevel === 'high' && !preferences.allowHighRiskAuto) {
    return buildGate(
      'queue_for_approval',
      'High-risk actions require chef approval by default.',
      minConfidence,
      'risk'
    )
  }

  const mode =
    actionPolicy?.mode ?? preferences.domainModes[action.domain] ?? preferences.defaultMode
  const riskAllowedByPolicy = isRiskAllowed(action.riskLevel, actionPolicy?.maxRiskLevel)

  if (!riskAllowedByPolicy) {
    return buildGate(
      'queue_for_approval',
      'The action risk is above the configured auto-execute limit.',
      minConfidence,
      'action_policy'
    )
  }

  if (mode === 'manual') {
    return buildGate(
      'manual_only',
      'This action type is configured for manual handling.',
      minConfidence,
      'mode'
    )
  }

  if (mode === 'approval') {
    return buildGate(
      'queue_for_approval',
      'This action type is configured for approval.',
      minConfidence,
      'mode'
    )
  }

  if (confidence < minConfidence) {
    return buildGate(
      'queue_for_approval',
      `Confidence ${confidence.toFixed(2)} is below the auto-execute threshold ${minConfidence.toFixed(2)}.`,
      minConfidence,
      'confidence'
    )
  }

  return buildGate(
    'auto_execute',
    'Low-risk action passed policy and confidence checks.',
    minConfidence,
    'mode'
  )
}

function buildGate(
  decision: ApprovalGate['decision'],
  reason: string,
  minConfidence: number,
  matchedPolicy: string
): ApprovalGate {
  return {
    decision,
    reason,
    minConfidence,
    matchedPolicy,
    requiresChefReview: decision === 'queue_for_approval' || decision === 'manual_only',
  }
}

function isRiskAllowed(
  riskLevel: AutonomyRiskLevel,
  maxRiskLevel: Exclude<AutonomyRiskLevel, 'restricted'> | undefined
): boolean {
  if (!maxRiskLevel) return true
  const rank: Record<AutonomyRiskLevel, number> = {
    low: 1,
    medium: 2,
    high: 3,
    restricted: 4,
  }
  return rank[riskLevel] <= rank[maxRiskLevel]
}

export function modeFromApprovalDecision(decision: ApprovalGate['decision']): AutonomyMode {
  if (decision === 'auto_execute') return 'auto'
  if (decision === 'manual_only' || decision === 'block') return 'manual'
  return 'approval'
}
