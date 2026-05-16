import type {
  EvidenceLabel,
  LoopState,
  OperatingLoopItem,
  ResumeTrail,
  ResumeTrailCollection,
  ResumeTrailEmptyState,
  ResumeTrailEvidence,
  ResumeTrailOptions,
} from './types'

const DEFAULT_LIMIT = 6

const EMPTY_MESSAGES: Record<ResumeTrailEmptyState['reason'], string> = {
  no_sources: 'No operating-loop work was available to inspect.',
  no_resumable_sources: 'No interrupted work has enough evidence to resume.',
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeRoute(value: string | null | undefined): string | null {
  const route = normalizeText(value)
  if (!route) {
    return null
  }

  return route
}

function timestampMs(value: string | null): number {
  if (!value) {
    return 0
  }

  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function recencyTieBreaker(value: string | null): number {
  return Math.floor(timestampMs(value) / 100_000)
}

function evidencePriority(label: EvidenceLabel): number {
  switch (label) {
    case 'confirmed':
    case 'user_entered':
      return 5
    case 'computed':
      return 4
    case 'claimed':
      return 3
    case 'inferred':
      return 2
    case 'stale':
    case 'disputed':
      return 1
    case 'unknown':
      return 0
  }
}

function loopStatePriority(loopState: LoopState): number {
  switch (loopState) {
    case 'active':
      return 6
    case 'blocked':
    case 'waiting':
      return 5
    case 'uncertain':
      return 3
    case 'stale':
      return 2
    case 'snoozed':
      return 1
    case 'done':
    case 'dismissed':
      return 0
  }
}

function isClosed(loopState: LoopState): boolean {
  return loopState === 'done' || loopState === 'dismissed'
}

function evidenceIsWeak(
  label: EvidenceLabel,
  confidence: number | null,
  inferredLastAction: boolean
): boolean {
  return (
    inferredLastAction ||
    label === 'inferred' ||
    label === 'unknown' ||
    label === 'stale' ||
    label === 'disputed' ||
    (confidence != null && confidence < 0.5)
  )
}

function evidenceReason(label: EvidenceLabel, inferredLastAction: boolean): string {
  if (inferredLastAction) {
    return 'timestamp_without_explicit_last_action'
  }

  if (label === 'confirmed' || label === 'user_entered') {
    return 'source_record'
  }

  if (label === 'computed') {
    return 'computed_from_operating_loop'
  }

  return 'weak_operating_loop_evidence'
}

function candidateRoute(item: OperatingLoopItem): string | null {
  return (
    normalizeRoute(item.resumeContext?.sourceRoute) ??
    normalizeRoute(item.sourceRoute) ??
    normalizeRoute(item.proofHref)
  )
}

function candidateNextAction(item: OperatingLoopItem): string | null {
  return normalizeText(item.resumeContext?.nextStep) ?? normalizeText(item.nextAction)
}

function candidateTimestamp(item: OperatingLoopItem): string | null {
  return normalizeText(item.resumeContext?.timestamp) ?? normalizeText(item.createdAt)
}

function buildTrail(item: OperatingLoopItem): ResumeTrail | null {
  if (isClosed(item.loopState)) {
    return null
  }

  const route = candidateRoute(item)
  const nextAction = candidateNextAction(item)
  const explicitLastAction = normalizeText(item.resumeContext?.lastAction)
  const lastActionAt = candidateTimestamp(item)

  if (!route || !nextAction) {
    return null
  }

  if (!explicitLastAction && !lastActionAt) {
    return null
  }

  const inferredLastAction = !explicitLastAction
  const evidence: ResumeTrailEvidence = {
    label: item.evidenceLabel,
    sourceKind: item.sourceKind,
    sourceId: item.sourceId,
    sourceItemId: item.id,
    confidence: item.confidence,
    proofHref: normalizeRoute(item.proofHref),
    weak: evidenceIsWeak(item.evidenceLabel, item.confidence, inferredLastAction),
    reason: evidenceReason(item.evidenceLabel, inferredLastAction),
  }

  return {
    id: `resume:${item.sourceKind}:${item.sourceId}`,
    sourceId: item.sourceId,
    sourceKind: item.sourceKind,
    sourceItemId: item.id,
    title: item.title,
    description: item.description,
    lastAction: explicitLastAction ?? 'Last saved',
    lastActionAt,
    nextAction,
    route,
    evidence,
  }
}

function dedupeKey(trail: ResumeTrail): string {
  return trail.route || `${trail.sourceKind}:${trail.sourceId}`
}

function scoreTrail(trail: ResumeTrail, source: OperatingLoopItem): number {
  const confidence = source.confidence ?? 0
  const lastActionScore = trail.lastAction === 'Last saved' ? 0 : 2

  return (
    loopStatePriority(source.loopState) * 100_000_000 +
    evidencePriority(trail.evidence.label) * 10_000_000 +
    lastActionScore * 1_000_000 +
    confidence * 100_000 +
    recencyTieBreaker(trail.lastActionAt)
  )
}

function emptyState(reason: ResumeTrailEmptyState['reason']): ResumeTrailEmptyState {
  return {
    reason,
    message: EMPTY_MESSAGES[reason],
  }
}

export function deriveResumeTrails(
  items: OperatingLoopItem[],
  options: ResumeTrailOptions = {}
): ResumeTrailCollection {
  if (items.length === 0) {
    return {
      state: 'empty',
      trails: [],
      emptyState: emptyState('no_sources'),
    }
  }

  const deduped = new Map<string, ResumeTrail>()
  const dedupedScores = new Map<string, number>()

  for (const item of items) {
    const trail = buildTrail(item)
    if (!trail) {
      continue
    }

    const key = dedupeKey(trail)
    const score = scoreTrail(trail, item)
    const previousScore = dedupedScores.get(key)

    if (previousScore == null || score > previousScore) {
      deduped.set(key, trail)
      dedupedScores.set(key, score)
    }
  }

  const limit = Math.max(0, options.limit ?? DEFAULT_LIMIT)
  const trails = [...deduped.entries()]
    .sort(([leftKey], [rightKey]) => {
      return (dedupedScores.get(rightKey) ?? 0) - (dedupedScores.get(leftKey) ?? 0)
    })
    .map(([, trail]) => trail)
    .slice(0, limit)

  if (trails.length === 0) {
    return {
      state: 'empty',
      trails,
      emptyState: emptyState('no_resumable_sources'),
    }
  }

  return {
    state: 'ready',
    trails,
    emptyState: null,
  }
}
