import type { PreferenceSignalLedgerEntry } from '@/lib/discovery/preference-contract'

export type DietaryTrustLevel = 'verified' | 'declared' | 'review_needed' | 'weak'
export type DietarySafetyAction = 'hard_block' | 'review_before_use' | 'soft_preference'

export interface DietaryTrustAssessment {
  signalId: string
  label: string
  trustLevel: DietaryTrustLevel
  safetyAction: DietarySafetyAction
  confidence: number
  source: PreferenceSignalLedgerEntry['source']
  reviewState: PreferenceSignalLedgerEntry['reviewState']
  chefVisible: boolean
  reason: string
}

export interface DietaryTrustProfile {
  ownerId: string
  generatedAt: string
  assessments: DietaryTrustAssessment[]
  hardBlocks: DietaryTrustAssessment[]
  reviewQueue: DietaryTrustAssessment[]
  softPreferences: DietaryTrustAssessment[]
  lowestTrustLevel: DietaryTrustLevel | null
}

const SAFETY_POLARITIES = new Set(['allergy', 'restriction', 'never_show'])
const DEFAULT_GENERATED_AT = '1970-01-01T00:00:00.000Z'

export function assessDietaryTrustSignal(
  signal: PreferenceSignalLedgerEntry
): DietaryTrustAssessment | null {
  const dietaryRelevant =
    SAFETY_POLARITIES.has(signal.polarity) ||
    signal.normalizedTerm.kind === 'allergen' ||
    signal.normalizedTerm.kind === 'dietary'

  if (!dietaryRelevant) return null

  const trustLevel = trustLevelForSignal(signal)
  const safetyAction = safetyActionForSignal(signal, trustLevel)

  return {
    signalId: signal.id,
    label: signal.normalizedTerm.displayLabel,
    trustLevel,
    safetyAction,
    confidence: signal.confidence,
    source: signal.source,
    reviewState: signal.reviewState,
    chefVisible: signal.consent.chefSharing || signal.shareCategory === 'chef_visible',
    reason: reasonForAssessment(signal, trustLevel, safetyAction),
  }
}

export function buildDietaryTrustProfile(
  signals: PreferenceSignalLedgerEntry[],
  options: { ownerId?: string; generatedAt?: string } = {}
): DietaryTrustProfile {
  const assessments = signals
    .map(assessDietaryTrustSignal)
    .filter((assessment): assessment is DietaryTrustAssessment => assessment !== null)
    .sort((left, right) => {
      const byAction = safetyActionRank(left.safetyAction) - safetyActionRank(right.safetyAction)
      if (byAction !== 0) return byAction
      return right.confidence - left.confidence
    })

  return {
    ownerId: options.ownerId ?? signals[0]?.ownerId ?? 'unknown',
    generatedAt: normalizeTimestamp(options.generatedAt ?? DEFAULT_GENERATED_AT),
    assessments,
    hardBlocks: assessments.filter((assessment) => assessment.safetyAction === 'hard_block'),
    reviewQueue: assessments.filter(
      (assessment) => assessment.safetyAction === 'review_before_use'
    ),
    softPreferences: assessments.filter(
      (assessment) => assessment.safetyAction === 'soft_preference'
    ),
    lowestTrustLevel: lowestTrustLevel(assessments),
  }
}

function trustLevelForSignal(signal: PreferenceSignalLedgerEntry): DietaryTrustLevel {
  if (signal.reviewState === 'accepted' && signal.explicit && signal.confidence >= 0.95) {
    return signal.source === 'user_entered' || signal.source === 'intake_form'
      ? 'declared'
      : 'verified'
  }
  if (signal.reviewState === 'accepted' && signal.confidence >= 0.75) return 'declared'
  if (signal.reviewState === 'pending_review') return 'review_needed'
  return 'weak'
}

function safetyActionForSignal(
  signal: PreferenceSignalLedgerEntry,
  trustLevel: DietaryTrustLevel
): DietarySafetyAction {
  if (signal.reviewState === 'accepted' && SAFETY_POLARITIES.has(signal.polarity)) {
    return 'hard_block'
  }
  if (trustLevel === 'review_needed' || SAFETY_POLARITIES.has(signal.polarity)) {
    return 'review_before_use'
  }
  return 'soft_preference'
}

function reasonForAssessment(
  signal: PreferenceSignalLedgerEntry,
  trustLevel: DietaryTrustLevel,
  safetyAction: DietarySafetyAction
): string {
  if (safetyAction === 'hard_block') {
    return `${signal.normalizedTerm.displayLabel} is an accepted ${signal.polarity} signal and must block unsafe matches.`
  }
  if (trustLevel === 'review_needed') {
    return `${signal.normalizedTerm.displayLabel} came from ${signal.source} and needs review before durable dietary use.`
  }
  return `${signal.normalizedTerm.displayLabel} is dietary context, not a safety block.`
}

function safetyActionRank(action: DietarySafetyAction): number {
  if (action === 'hard_block') return 0
  if (action === 'review_before_use') return 1
  return 2
}

function lowestTrustLevel(assessments: DietaryTrustAssessment[]): DietaryTrustLevel | null {
  const order: DietaryTrustLevel[] = ['weak', 'review_needed', 'declared', 'verified']
  for (const level of order) {
    if (assessments.some((assessment) => assessment.trustLevel === level)) return level
  }
  return null
}

function normalizeTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? DEFAULT_GENERATED_AT : date.toISOString()
}
