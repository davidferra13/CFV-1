import {
  decorateCandidatesWithCircleMemory,
  type CircleMemoryCandidate,
  type CircleTasteMemorySummary,
} from '@/lib/hub/circle-memory-contracts'
import { evaluateDinnerRotation } from '@/lib/dinner-circles/memory-rotation'

export type CircleFastDecisionMode =
  | 'decide_for_us'
  | 'top_3'
  | 'safe_pick'
  | 'something_new'
  | 'fastest_option'
  | 'date_night'
  | 'cheap_and_easy'
  | 'healthy-ish'

export type CircleFastDecisionCandidate = CircleMemoryCandidate & {
  distanceMinutes?: number | null
  openNow?: boolean
  priceLevel?: 1 | 2 | 3 | 4 | null
  saved?: boolean
  reactionScore?: number
  noveltyScore?: number
  dateNightScore?: number
  healthyScore?: number
}

export type CircleFastDecisionResult = {
  mode: CircleFastDecisionMode
  candidateIds: string[]
  reasonsByCandidateId: Record<string, string[]>
  emptyState: string | null
}

const MODE_LIMITS: Record<CircleFastDecisionMode, number> = {
  decide_for_us: 1,
  top_3: 3,
  safe_pick: 3,
  something_new: 3,
  fastest_option: 3,
  date_night: 3,
  cheap_and_easy: 3,
  'healthy-ish': 3,
}

export function rankCircleFastDecisionCandidates(input: {
  mode: CircleFastDecisionMode
  candidates: readonly CircleFastDecisionCandidate[]
  memory?: CircleTasteMemorySummary | null
}): CircleFastDecisionResult {
  const decorated = input.memory
    ? decorateCandidatesWithCircleMemory({ candidates: input.candidates, summary: input.memory })
    : input.candidates.map((candidate) => ({ ...candidate, memoryLabels: [], repeatPenalty: 0 }))

  const scored = decorated
    .map((candidate) => {
      const rotation =
        input.memory &&
        evaluateDinnerRotation({
          candidate,
          summary: input.memory,
          allowUsualRotation: input.mode === 'safe_pick',
        })
      return {
        candidate,
        suppressed: rotation?.shouldSuppress ?? false,
        score:
          scoreCandidateForMode(input.mode, candidate) -
          (rotation?.freshnessPenalty ?? candidate.repeatPenalty),
        reasons: reasonsForCandidate(input.mode, candidate),
      }
    })
    .filter((entry) => !entry.suppressed && entry.candidate.openNow !== false)
    .sort((left, right) => right.score - left.score)
    .slice(0, MODE_LIMITS[input.mode])

  return {
    mode: input.mode,
    candidateIds: scored.map((entry) => entry.candidate.id),
    reasonsByCandidateId: Object.fromEntries(
      scored.map((entry) => [entry.candidate.id, entry.reasons])
    ),
    emptyState:
      scored.length === 0
        ? 'No circle-ready options match this mode yet. Try widening distance, price, or availability.'
        : null,
  }
}

function scoreCandidateForMode(
  mode: CircleFastDecisionMode,
  candidate: CircleFastDecisionCandidate & { memoryLabels: string[]; repeatPenalty: number }
): number {
  const reaction = candidate.reactionScore ?? 0
  const distance =
    candidate.distanceMinutes == null ? 0 : Math.max(0, 1 - candidate.distanceMinutes / 45)
  const price = candidate.priceLevel == null ? 0.4 : Math.max(0, 1 - (candidate.priceLevel - 1) / 4)
  const saved = candidate.saved ? 0.4 : 0
  const liked = candidate.memoryLabels.includes('you_both_liked_this') ? 0.8 : 0
  const usual = candidate.memoryLabels.includes('usual_spot') ? 0.6 : 0
  const novelty = candidate.noveltyScore ?? (candidate.memoryLabels.length === 0 ? 0.7 : 0.2)
  const healthy = candidate.healthyScore ?? 0
  const dateNight = candidate.dateNightScore ?? 0

  if (mode === 'safe_pick') return liked + usual + reaction + saved + distance
  if (mode === 'something_new') return novelty + reaction + distance - usual
  if (mode === 'fastest_option') return distance * 2 + reaction + price * 0.2
  if (mode === 'date_night') return dateNight * 1.5 + liked + reaction - price * 0.1
  if (mode === 'cheap_and_easy') return price * 1.4 + distance + reaction
  if (mode === 'healthy-ish') return healthy * 1.5 + reaction + distance * 0.3
  if (mode === 'decide_for_us') return liked + reaction + distance + saved + novelty * 0.25
  return liked + reaction + distance + saved + novelty * 0.3
}

function reasonsForCandidate(
  mode: CircleFastDecisionMode,
  candidate: CircleFastDecisionCandidate & { memoryLabels: string[] }
): string[] {
  const reasons: string[] = []
  if (candidate.memoryLabels.includes('you_both_liked_this'))
    reasons.push('You both liked this before')
  if (candidate.saved) reasons.push('Saved by the circle')
  if (candidate.distanceMinutes != null && candidate.distanceMinutes <= 20)
    reasons.push('Fast nearby option')
  if (mode === 'something_new' && (candidate.noveltyScore ?? 0) > 0.6)
    reasons.push('New for this circle')
  if (mode === 'cheap_and_easy' && (candidate.priceLevel ?? 4) <= 2)
    reasons.push('Lower price pick')
  if (mode === 'healthy-ish' && (candidate.healthyScore ?? 0) > 0.6) reasons.push('Lighter option')
  if (mode === 'date_night' && (candidate.dateNightScore ?? 0) > 0.6)
    reasons.push('Good date night fit')
  if (reasons.length === 0) reasons.push('Best available match for this mode')
  return reasons
}
