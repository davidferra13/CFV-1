import type { PreferenceSignalLedgerEntry } from '@/lib/discovery/preference-contract'
import { sharedPreferenceSignalsFromLedger } from '@/lib/remy/group-decision-contracts'

export type CircleMemoryInteractionKind =
  | 'liked'
  | 'rejected'
  | 'ordered'
  | 'saved'
  | 'final_pick'
  | 'usual_rotation'
  | 'try_soon'
  | 'never_again'

export type CircleMemoryTargetType = 'restaurant' | 'menu_item' | 'cuisine' | 'meal_concept'

export type CircleMemoryEvent = {
  id: string
  circleId: string
  memberId: string
  targetType: CircleMemoryTargetType
  targetId: string
  label: string
  cuisineTags?: readonly string[]
  kind: CircleMemoryInteractionKind
  occurredAt: string
  visibility: 'circle_shared' | 'aggregate_allowed' | 'private'
}

export type CircleMemoryLabel =
  | 'you_both_liked_this'
  | 'had_this_recently'
  | 'saved_but_never_tried'
  | 'usual_spot'
  | 'one_usually_says_no'
  | 'try_soon'
  | 'never_again'

export type CircleTasteMemorySummary = {
  circleId: string
  generatedAt: string
  visibleEventCount: number
  redactedPrivateEventCount: number
  recentlyPickedTargetIds: string[]
  usualRotationTargetIds: string[]
  trySoonTargetIds: string[]
  neverAgainTargetIds: string[]
  labelsByTargetId: Record<string, CircleMemoryLabel[]>
}

export type CircleMemoryCandidate = {
  id: string
  label: string
  targetType: CircleMemoryTargetType
  cuisineTags?: readonly string[]
}

export function buildCircleTasteMemorySummary(input: {
  circleId: string
  events: readonly CircleMemoryEvent[]
  memberIds: readonly string[]
  now: string
  recentDays?: number
}): CircleTasteMemorySummary {
  const recentDays = input.recentDays ?? 21
  const recentCutoff = Date.parse(input.now) - recentDays * 24 * 60 * 60 * 1000
  const circleEvents = input.events.filter((event) => event.circleId === input.circleId)
  const visibleEvents = circleEvents.filter((event) => event.visibility !== 'private')
  const labelsByTargetId: Record<string, CircleMemoryLabel[]> = {}

  for (const targetId of new Set(visibleEvents.map((event) => event.targetId))) {
    const targetEvents = visibleEvents.filter((event) => event.targetId === targetId)
    const labels = deriveLabelsForTarget(targetEvents, input.memberIds, recentCutoff)
    if (labels.length > 0) labelsByTargetId[targetId] = labels
  }

  return {
    circleId: input.circleId,
    generatedAt: input.now,
    visibleEventCount: visibleEvents.length,
    redactedPrivateEventCount: circleEvents.length - visibleEvents.length,
    recentlyPickedTargetIds: visibleEvents
      .filter(
        (event) => event.kind === 'final_pick' && Date.parse(event.occurredAt) >= recentCutoff
      )
      .map((event) => event.targetId),
    usualRotationTargetIds: visibleEvents
      .filter((event) => event.kind === 'usual_rotation')
      .map((event) => event.targetId),
    trySoonTargetIds: visibleEvents
      .filter((event) => event.kind === 'try_soon')
      .map((event) => event.targetId),
    neverAgainTargetIds: visibleEvents
      .filter((event) => event.kind === 'never_again')
      .map((event) => event.targetId),
    labelsByTargetId,
  }
}

export function decorateCandidatesWithCircleMemory<
  TCandidate extends CircleMemoryCandidate,
>(input: {
  candidates: readonly TCandidate[]
  summary: CircleTasteMemorySummary
}): Array<TCandidate & { memoryLabels: CircleMemoryLabel[]; repeatPenalty: number }> {
  return input.candidates.map((candidate) => {
    const labels = input.summary.labelsByTargetId[candidate.id] ?? []
    return {
      ...candidate,
      memoryLabels: labels,
      repeatPenalty:
        labels.includes('had_this_recently') || labels.includes('never_again')
          ? labels.includes('never_again')
            ? 1
            : 0.45
          : 0,
    }
  })
}

export function circleMemoryEventsFromPreferenceSignals(input: {
  circleId: string
  signals: readonly PreferenceSignalLedgerEntry[]
  observedAtFallback?: string
}): CircleMemoryEvent[] {
  return sharedPreferenceSignalsFromLedger(input.signals).map((signal) => ({
    id: signal.sourceSignalId ?? `${input.circleId}:${signal.memberId}:${signal.label}`,
    circleId: input.circleId,
    memberId: signal.memberId,
    targetType: 'cuisine',
    targetId: signal.label.toLowerCase().replace(/\s+/g, '-'),
    label: signal.label,
    kind:
      signal.polarity === 'like'
        ? 'liked'
        : signal.polarity === 'dislike' || signal.polarity === 'never_show'
          ? 'rejected'
          : 'ordered',
    occurredAt: input.observedAtFallback ?? new Date(0).toISOString(),
    visibility: signal.visibility === 'private' ? 'private' : 'aggregate_allowed',
  }))
}

function deriveLabelsForTarget(
  events: readonly CircleMemoryEvent[],
  memberIds: readonly string[],
  recentCutoff: number
): CircleMemoryLabel[] {
  const labels = new Set<CircleMemoryLabel>()
  const likedMembers = new Set(
    events.filter((event) => event.kind === 'liked').map((event) => event.memberId)
  )
  const pickedRecently = events.some(
    (event) => event.kind === 'final_pick' && Date.parse(event.occurredAt) >= recentCutoff
  )
  const saved = events.some((event) => event.kind === 'saved')
  const tried = events.some((event) => event.kind === 'ordered' || event.kind === 'final_pick')
  const rejectedMembers = new Set(
    events
      .filter((event) => event.kind === 'rejected' || event.kind === 'never_again')
      .map((event) => event.memberId)
  )

  if (memberIds.length > 1 && likedMembers.size >= Math.min(2, memberIds.length)) {
    labels.add('you_both_liked_this')
  }
  if (pickedRecently) labels.add('had_this_recently')
  if (saved && !tried) labels.add('saved_but_never_tried')
  if (events.some((event) => event.kind === 'usual_rotation')) labels.add('usual_spot')
  if (rejectedMembers.size > 0) labels.add('one_usually_says_no')
  if (events.some((event) => event.kind === 'try_soon')) labels.add('try_soon')
  if (events.some((event) => event.kind === 'never_again')) labels.add('never_again')

  return [...labels]
}
