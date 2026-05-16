import type {
  WeeklyAccuracyValidationComparison,
  WeeklyAccuracyValidationReport,
} from '@/lib/pricing/weekly-accuracy-validation'

export const PRICE_LIFECYCLE_STATES = [
  'observed',
  'resolved',
  'stale',
  'fallback-served',
  'disputed',
  'reviewed',
  'reconciled',
  'archived',
] as const

export type PriceLifecycleState = (typeof PRICE_LIFECYCLE_STATES)[number]

export type PriceLifecycleActorType = 'system' | 'chef' | 'staff' | 'admin' | 'partner'

export interface PriceLifecycleActor {
  type: PriceLifecycleActorType
  id: string
  displayName?: string
}

export interface PriceLifecycleSource {
  system: string
  producer: string
  runId?: string
}

export interface PriceLifecycleEvidence {
  label: string
  ref?: string
}

export interface PriceLifecycleContext {
  confidenceLabel: string | null
  confidenceScore: number | null
  trustLevel: string | null
  freshnessLabel: string | null
  freshnessDays: number | null
  observedAt: string | null
}

export interface PriceLifecycleNextAction {
  label: string
  owner: PriceLifecycleActor
  dueAt?: string
}

export interface PriceLifecycleTransition {
  sequence: number
  state: PriceLifecycleState
  actor: PriceLifecycleActor
  source: PriceLifecycleSource
  reason: string
  evidence: PriceLifecycleEvidence
  context: PriceLifecycleContext
  nextAction: PriceLifecycleNextAction | null
  occurredAt: string
}

export interface PriceLifecycleSubject {
  kind: 'weekly-accuracy-validation' | 'apple-test-diagnostic' | 'price'
  id: string
  ingredientId?: string
  region?: string
}

export interface PriceLifecycleLedger {
  subject: PriceLifecycleSubject
  transitions: readonly PriceLifecycleTransition[]
}

export interface PriceLifecycleTransitionInput extends Omit<
  PriceLifecycleTransition,
  'sequence' | 'nextAction'
> {
  nextAction?: PriceLifecycleNextAction | null
}

const WAITING_STATES = new Set<PriceLifecycleState>([
  'stale',
  'fallback-served',
  'disputed',
  'reviewed',
])

const VALID_NEXT_STATES: Record<'initial' | PriceLifecycleState, readonly PriceLifecycleState[]> = {
  initial: ['observed'],
  observed: ['resolved', 'stale', 'fallback-served', 'disputed', 'archived'],
  resolved: ['stale', 'disputed', 'archived'],
  stale: ['fallback-served', 'resolved', 'reviewed', 'archived'],
  'fallback-served': ['reviewed', 'disputed', 'reconciled', 'archived'],
  disputed: ['reviewed', 'reconciled', 'archived'],
  reviewed: ['resolved', 'reconciled', 'disputed', 'archived'],
  reconciled: ['resolved', 'archived'],
  archived: [],
}

const DEFAULT_WEEKLY_ACTOR: PriceLifecycleActor = {
  type: 'system',
  id: 'weekly-accuracy-validation',
  displayName: 'Weekly accuracy validation',
}

const DEFAULT_REVIEW_OWNER: PriceLifecycleActor = {
  type: 'staff',
  id: 'pie-price-review',
  displayName: 'PIE price review',
}

export function createPriceLifecycleLedger(subject: PriceLifecycleSubject): PriceLifecycleLedger {
  return deepFreeze({
    subject: { ...subject },
    transitions: [],
  })
}

export function appendPriceLifecycleTransition(
  ledger: PriceLifecycleLedger,
  input: PriceLifecycleTransitionInput
): PriceLifecycleLedger {
  const priorState = ledger.transitions.at(-1)?.state ?? 'initial'
  validateTransition(priorState, input)

  const transition: PriceLifecycleTransition = {
    ...input,
    sequence: ledger.transitions.length + 1,
    actor: { ...input.actor },
    source: { ...input.source },
    evidence: { ...input.evidence },
    context: { ...input.context },
    nextAction: input.nextAction ? cloneNextAction(input.nextAction) : null,
  }

  return deepFreeze({
    subject: { ...ledger.subject },
    transitions: [...ledger.transitions, transition],
  })
}

export function buildWeeklyAccuracyLifecycleLedgers(
  report: WeeklyAccuracyValidationReport,
  options: {
    actor?: PriceLifecycleActor
    reviewOwner?: PriceLifecycleActor
    runId?: string
  } = {}
): PriceLifecycleLedger[] {
  const actor = options.actor ?? DEFAULT_WEEKLY_ACTOR
  const reviewOwner = options.reviewOwner ?? DEFAULT_REVIEW_OWNER
  const source: PriceLifecycleSource = {
    system: 'pie',
    producer: 'weekly-accuracy-validation',
    runId: options.runId,
  }

  const comparedLedgers = report.comparisons.map((comparison) =>
    buildComparisonLedger(report, comparison, actor, reviewOwner, source)
  )

  const missingLedgers = report.missingSamples.map((sample) => {
    const observed = appendPriceLifecycleTransition(
      createPriceLifecycleLedger({
        kind: 'weekly-accuracy-validation',
        id: `weekly:${report.generatedAt}:${sample.ingredientId}:${sample.region}`,
        ingredientId: sample.ingredientId,
        region: sample.region,
      }),
      {
        state: 'observed',
        actor,
        source,
        reason: `${sample.ingredientName} was configured for weekly validation in ${sample.region}.`,
        evidence: {
          label: 'weekly_accuracy_validation.configured_sample',
          ref: `${sample.ingredientId}:${sample.region}`,
        },
        context: emptyContext(report.generatedAt),
        occurredAt: report.generatedAt,
      }
    )

    return appendPriceLifecycleTransition(observed, {
      state: 'stale',
      actor,
      source,
      reason:
        'Served price or ground-truth price was missing, so the lifecycle is waiting on evidence.',
      evidence: {
        label: 'weekly_accuracy_validation.missing_sample',
        ref: `${sample.ingredientId}:${sample.region}`,
      },
      context: emptyContext(report.generatedAt),
      nextAction: {
        label: 'Collect served and ground-truth price evidence before resolving.',
        owner: reviewOwner,
      },
      occurredAt: report.generatedAt,
    })
  })

  return [...comparedLedgers, ...missingLedgers]
}

function buildComparisonLedger(
  report: WeeklyAccuracyValidationReport,
  comparison: WeeklyAccuracyValidationComparison,
  actor: PriceLifecycleActor,
  reviewOwner: PriceLifecycleActor,
  source: PriceLifecycleSource
): PriceLifecycleLedger {
  const observed = appendPriceLifecycleTransition(
    createPriceLifecycleLedger({
      kind: 'weekly-accuracy-validation',
      id: `weekly:${report.generatedAt}:${comparison.ingredientId}:${comparison.region}`,
      ingredientId: comparison.ingredientId,
      region: comparison.region,
    }),
    {
      state: 'observed',
      actor,
      source,
      reason: `${comparison.ingredientName} was compared against ${comparison.groundTruthSource}.`,
      evidence: {
        label: 'weekly_accuracy_validation.comparison',
        ref: `${comparison.ingredientId}:${comparison.region}`,
      },
      context: contextFromComparison(report, comparison),
      occurredAt: report.generatedAt,
    }
  )

  if (comparison.withinSla) {
    return appendPriceLifecycleTransition(observed, {
      state: 'resolved',
      actor,
      source,
      reason: `Absolute error ${comparison.absoluteErrorPct}% is inside the weekly SLA.`,
      evidence: {
        label: 'weekly_accuracy_validation.within_sla',
        ref: `${comparison.ingredientId}:${comparison.region}`,
      },
      context: contextFromComparison(report, comparison),
      occurredAt: report.generatedAt,
    })
  }

  return appendPriceLifecycleTransition(observed, {
    state: 'disputed',
    actor,
    source,
    reason: `Absolute error ${comparison.absoluteErrorPct}% is outside the weekly SLA.`,
    evidence: {
      label: 'weekly_accuracy_validation.outside_sla',
      ref: `${comparison.ingredientId}:${comparison.region}`,
    },
    context: contextFromComparison(report, comparison),
    nextAction: {
      label: 'Review source quality and reconcile the served price against ground truth.',
      owner: reviewOwner,
    },
    occurredAt: report.generatedAt,
  })
}

function validateTransition(
  priorState: 'initial' | PriceLifecycleState,
  input: PriceLifecycleTransitionInput
) {
  if (!PRICE_LIFECYCLE_STATES.includes(input.state)) {
    throw new Error(`Invalid price lifecycle state: ${input.state}`)
  }

  const allowed = VALID_NEXT_STATES[priorState]
  if (!allowed.includes(input.state)) {
    throw new Error(`Invalid price lifecycle transition: ${priorState} -> ${input.state}`)
  }

  if (!input.actor?.id || !input.actor.type) {
    throw new Error('Price lifecycle transition requires an actor.')
  }

  if (!input.source?.system || !input.source.producer) {
    throw new Error('Price lifecycle transition requires a source system and producer.')
  }

  if (!input.reason.trim()) {
    throw new Error('Price lifecycle transition requires a reason.')
  }

  if (!input.evidence?.label.trim()) {
    throw new Error('Price lifecycle transition requires an evidence label.')
  }

  if (!input.context || typeof input.context !== 'object') {
    throw new Error('Price lifecycle transition requires confidence/freshness context.')
  }

  if (input.context.confidenceLabel === undefined || input.context.freshnessLabel === undefined) {
    throw new Error('Price lifecycle transition requires confidence/freshness context.')
  }

  if (WAITING_STATES.has(input.state) && !input.nextAction?.label.trim()) {
    throw new Error(`Price lifecycle state ${input.state} requires a next action.`)
  }
}

function contextFromComparison(
  report: WeeklyAccuracyValidationReport,
  comparison: WeeklyAccuracyValidationComparison
): PriceLifecycleContext {
  return {
    confidenceLabel: comparison.confidenceTier,
    confidenceScore: comparison.confidenceScore,
    trustLevel: comparison.trustLevel,
    freshnessLabel: 'weekly-validation',
    freshnessDays: null,
    observedAt: report.generatedAt,
  }
}

function emptyContext(generatedAt: string): PriceLifecycleContext {
  return {
    confidenceLabel: null,
    confidenceScore: null,
    trustLevel: null,
    freshnessLabel: 'missing-weekly-evidence',
    freshnessDays: null,
    observedAt: generatedAt,
  }
}

function cloneNextAction(nextAction: PriceLifecycleNextAction): PriceLifecycleNextAction {
  return {
    ...nextAction,
    owner: { ...nextAction.owner },
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value)) {
      deepFreeze(nested)
    }
  }

  return value
}
