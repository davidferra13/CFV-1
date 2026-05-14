import {
  buildCompareSignals,
  type DiscoveryCompareCandidate,
  type DiscoveryCompareContext,
} from '@/lib/discovery/compare-contracts'

export type RemyCompressionMode =
  | 'best'
  | 'safest'
  | 'most_interesting'
  | 'lowest_risk'
  | 'compromise'
  | 'adventurous'
  | 'host_safe'

export type RemyCompressedCandidate = DiscoveryCompareCandidate & {
  compressionScore: number
  mode: RemyCompressionMode
  tradeoffs: string[]
  railItemId: string
}

export type RemyCompressionResult = {
  mode: RemyCompressionMode
  candidates: RemyCompressedCandidate[]
  preservedRailCandidateIds: string[]
  reversible: true
  explanation: string
}

const MODE_WEIGHTS: Record<
  RemyCompressionMode,
  {
    strongSignal: number
    confidence: number
    availability: number
    budget: number
    novelty: number
    groupFit: number
    penalty: number
  }
> = {
  best: {
    strongSignal: 2,
    confidence: 2,
    availability: 2,
    budget: 1,
    novelty: 1,
    groupFit: 1,
    penalty: 2,
  },
  safest: {
    strongSignal: 1,
    confidence: 3,
    availability: 3,
    budget: 2,
    novelty: 0,
    groupFit: 2,
    penalty: 4,
  },
  most_interesting: {
    strongSignal: 1,
    confidence: 1,
    availability: 1,
    budget: 0,
    novelty: 4,
    groupFit: 1,
    penalty: 1,
  },
  lowest_risk: {
    strongSignal: 1,
    confidence: 3,
    availability: 3,
    budget: 2,
    novelty: -1,
    groupFit: 3,
    penalty: 5,
  },
  compromise: {
    strongSignal: 2,
    confidence: 2,
    availability: 2,
    budget: 1,
    novelty: 1,
    groupFit: 4,
    penalty: 3,
  },
  adventurous: {
    strongSignal: 1,
    confidence: 1,
    availability: 1,
    budget: 0,
    novelty: 5,
    groupFit: 1,
    penalty: 1,
  },
  host_safe: {
    strongSignal: 2,
    confidence: 3,
    availability: 3,
    budget: 1,
    novelty: 0,
    groupFit: 3,
    penalty: 4,
  },
}

export function compressDiscoveryDecision(input: {
  mode: RemyCompressionMode
  candidates: readonly DiscoveryCompareCandidate[]
  context?: DiscoveryCompareContext
  limit?: number
}): RemyCompressionResult {
  const limit = input.limit ?? 3
  const scored = input.candidates
    .map((candidate) => scoreCandidateForMode(candidate, input.mode, input.context ?? {}))
    .sort((left, right) => right.compressionScore - left.compressionScore)

  return {
    mode: input.mode,
    candidates: scored.slice(0, limit),
    preservedRailCandidateIds: input.candidates.map((candidate) => candidate.id),
    reversible: true,
    explanation: explainMode(input.mode),
  }
}

export function parseCompressionMode(message: string): RemyCompressionMode | null {
  const normalized = message.toLowerCase()
  if (/\b(safest|safe 3)\b/.test(normalized)) return 'safest'
  if (/\b(lowest-risk|lowest risk|least risky|offends the fewest)\b/.test(normalized)) {
    return 'lowest_risk'
  }
  if (/\b(host-safe|host safe)\b/.test(normalized)) return 'host_safe'
  if (/\b(compromise|works for everyone|middle ground)\b/.test(normalized)) return 'compromise'
  if (/\b(adventurous|surprise|bold)\b/.test(normalized)) return 'adventurous'
  if (/\b(interesting|novel|most interesting)\b/.test(normalized)) return 'most_interesting'
  if (/\b(best|top)\b/.test(normalized)) return 'best'
  return null
}

function scoreCandidateForMode(
  candidate: DiscoveryCompareCandidate,
  mode: RemyCompressionMode,
  context: DiscoveryCompareContext
): RemyCompressedCandidate {
  const weights = MODE_WEIGHTS[mode]
  const signals = buildCompareSignals(candidate, context)
  const strongCount = signals.filter((signal) => signal.status === 'strong').length
  const weakCount = signals.filter((signal) => signal.status === 'weak').length
  const missingCount = signals.filter((signal) => signal.status === 'missing').length
  const confidence = Math.round((candidate.confidence ?? 0.45) * 10)
  const availability = candidate.available === true ? 3 : candidate.available === false ? -3 : 0
  const budget =
    signals.find((signal) => signal.dimension === 'budget')?.status === 'strong' ? 2 : 0
  const groupFit =
    signals.find((signal) => signal.dimension === 'group_fit')?.status === 'strong' ? 2 : 0
  const novelty = noveltyScore(candidate)
  const compressionScore =
    strongCount * weights.strongSignal +
    confidence * weights.confidence +
    availability * weights.availability +
    budget * weights.budget +
    groupFit * weights.groupFit +
    novelty * weights.novelty -
    (weakCount * 2 + missingCount) * weights.penalty

  return {
    ...candidate,
    mode,
    compressionScore,
    railItemId: candidate.id,
    tradeoffs: buildTradeoffs(candidate, weakCount, missingCount, novelty),
  }
}

function noveltyScore(candidate: DiscoveryCompareCandidate): number {
  const text = [...(candidate.cuisineTags ?? []), ...(candidate.whyRecommended ?? [])]
    .join(' ')
    .toLowerCase()
  let score = 0
  if (/(omakase|tasting|chef|seasonal|pop-up|popup|new|rare|regional)/.test(text)) score += 3
  if (candidate.type === 'private_dinner' || candidate.type === 'chef') score += 1
  if ((candidate.confidence ?? 0) < 0.4) score -= 1
  return score
}

function buildTradeoffs(
  candidate: DiscoveryCompareCandidate,
  weakCount: number,
  missingCount: number,
  novelty: number
): string[] {
  const tradeoffs: string[] = []
  if (weakCount > 0) tradeoffs.push(`${weakCount} weak fit signal${weakCount === 1 ? '' : 's'}`)
  if (missingCount > 0) {
    tradeoffs.push(`${missingCount} missing signal${missingCount === 1 ? '' : 's'}`)
  }
  if (novelty >= 3) tradeoffs.push('More novel than the baseline rail')
  if (candidate.available === false) tradeoffs.push('Availability is not confirmed')
  return tradeoffs
}

function explainMode(mode: RemyCompressionMode): string {
  switch (mode) {
    case 'safest':
      return 'Prioritizes confidence, availability, budget fit, and fewer weak signals.'
    case 'lowest_risk':
      return 'Minimizes weak, missing, and group-fit risks before novelty.'
    case 'host_safe':
      return 'Prioritizes reliable, group-ready choices a host can defend.'
    case 'compromise':
      return 'Balances group fit with confidence and avoids obvious blockers.'
    case 'adventurous':
      return 'Raises novelty while still keeping basic confidence and availability in view.'
    case 'most_interesting':
      return 'Surfaces distinctive choices without discarding the broader rail.'
    case 'best':
      return 'Uses the general fit score across visible compare signals.'
  }
}
