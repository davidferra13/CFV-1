import {
  buildClientSafeStrategySummary,
  deriveMostRestrictiveStrategySignal,
  type PrivateRemyStrategySummary,
  type StrategyGoalArea,
  type StrategyReviewCadence,
  type StrategyReviewRitualContract,
  type StrategySignalContract,
  type StrategySignalFactor,
} from './chef-life-strategy-map-contract'

export type StrategySignalInput = {
  tenantId: string
  subjectType: StrategySignalContract['subjectType']
  subjectId: string | null
  factors: StrategySignalFactor[]
  expectedAreas: StrategyGoalArea[]
  staleGoalIds?: string[]
}

export type StrategyReviewRitualInput = {
  tenantId: string
  cadence: StrategyReviewCadence
  periodStart: string
  periodEnd: string
  strategyAreas: StrategyGoalArea[]
  staleGoalIds?: string[]
}

export type PrivateRemyStrategySummaryInput = {
  tenantId: string
  signal: StrategySignalContract
  reviewRitual: StrategyReviewRitualContract
}

export function deriveStrategySignal(input: StrategySignalInput): StrategySignalContract {
  const coveredAreas = new Set(input.factors.map((factor) => factor.area))
  const unknownAreas = input.expectedAreas.filter((area) => !coveredAreas.has(area))
  const staleGoalIds = [...(input.staleGoalIds ?? [])]
  const state =
    input.factors.length === 0
      ? 'unknown'
      : deriveMostRestrictiveStrategySignal(input.factors.map((factor) => factor.state))
  const confidence =
    unknownAreas.length > 0 || staleGoalIds.length > 0 ? 'low' : deriveConfidence(input.factors)
  const signal: StrategySignalContract = {
    tenantId: input.tenantId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    state,
    factors: [...input.factors],
    unknownAreas,
    staleGoalIds,
    confidence,
    chefOnlySummary: buildChefOnlyStrategySummary({
      state,
      factorCount: input.factors.length,
      unknownCount: unknownAreas.length,
      staleCount: staleGoalIds.length,
    }),
    clientSafeSummary: null,
  }

  return {
    ...signal,
    clientSafeSummary: buildClientSafeStrategySummary(signal),
  }
}

export function buildStrategyReviewRitual(
  input: StrategyReviewRitualInput
): StrategyReviewRitualContract {
  const promptAreas = dedupeAreas(input.strategyAreas)
  return {
    tenantId: input.tenantId,
    cadence: input.cadence,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    promptAreas,
    staleGoalIds: [...(input.staleGoalIds ?? [])],
    recommendedQuestions: promptAreas.map((area) => questionForStrategyArea(area)),
    visibility: 'private_only',
  }
}

export function buildPrivateRemyStrategySummary(
  input: PrivateRemyStrategySummaryInput
): PrivateRemyStrategySummary {
  const staleCopy =
    input.reviewRitual.staleGoalIds.length > 0
      ? `${input.reviewRitual.staleGoalIds.length} stale goal(s) need review.`
      : 'No stale goals were flagged.'

  return {
    tenantId: input.tenantId,
    summary: `Strategy fit is ${input.signal.state}. ${input.reviewRitual.cadence} review covers ${input.reviewRitual.promptAreas.length} area(s). ${staleCopy}`,
    signalState: input.signal.state,
    sourceRefs: input.signal.factors.flatMap((factor) => factor.sourceRefs),
    redactedForClient: true,
    visibility: 'private_only',
  }
}

function deriveConfidence(factors: StrategySignalFactor[]): 'low' | 'medium' | 'high' {
  if (factors.length === 0) return 'low'
  if (factors.some((factor) => factor.confidence === 'low')) return 'low'
  if (factors.some((factor) => factor.confidence === 'medium')) return 'medium'
  return 'high'
}

function buildChefOnlyStrategySummary(input: {
  state: StrategySignalContract['state']
  factorCount: number
  unknownCount: number
  staleCount: number
}): string {
  const parts = [`${input.factorCount} strategy factor(s) produced a ${input.state} fit signal.`]
  if (input.unknownCount > 0)
    parts.push(`${input.unknownCount} unknown area(s) need strategy input.`)
  if (input.staleCount > 0) parts.push(`${input.staleCount} stale goal(s) should be reviewed.`)
  return parts.join(' ')
}

function dedupeAreas(areas: StrategyGoalArea[]): StrategyGoalArea[] {
  return Array.from(new Set(areas))
}

function questionForStrategyArea(area: StrategyGoalArea): string {
  const questions: Record<StrategyGoalArea, string> = {
    client_mix: 'Which client types moved the business closer to the intended mix?',
    cuisine_identity: 'Does the current work still express the cuisine identity the chef wants?',
    income: 'Did income progress match the needed life and business runway?',
    capacity_boundary: 'Which commitments respected or strained the chef capacity boundary?',
    family_constraint:
      'Did the work calendar protect the private family and caregiving constraints?',
    reputation: 'Which choices strengthened the reputation the chef is building?',
    geography: 'Did geography, travel, and neighborhood focus support the strategy?',
    new_revenue: 'Which new revenue paths deserve more focus or retirement?',
    values: 'Where did day-to-day decisions align with or drift from the chef values?',
    exit_legacy: 'What should change now to support the eventual exit, legacy, or succession path?',
  }

  return questions[area]
}
