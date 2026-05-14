import type {
  CircleMemoryCandidate,
  CircleTasteMemorySummary,
} from '@/lib/hub/circle-memory-contracts'

export type DinnerRotationDecision = {
  candidateId: string
  shouldSuppress: boolean
  freshnessPenalty: number
  reason: 'recent_repeat' | 'never_again' | 'usual_rotation_allowed' | 'fresh'
}

export function evaluateDinnerRotation(input: {
  candidate: CircleMemoryCandidate
  summary: CircleTasteMemorySummary
  allowUsualRotation?: boolean
}): DinnerRotationDecision {
  const labels = input.summary.labelsByTargetId[input.candidate.id] ?? []

  if (labels.includes('never_again')) {
    return {
      candidateId: input.candidate.id,
      shouldSuppress: true,
      freshnessPenalty: 1,
      reason: 'never_again',
    }
  }

  if (labels.includes('had_this_recently')) {
    const usual =
      labels.includes('usual_spot') ||
      input.summary.usualRotationTargetIds.includes(input.candidate.id)
    if (usual && input.allowUsualRotation) {
      return {
        candidateId: input.candidate.id,
        shouldSuppress: false,
        freshnessPenalty: 0.15,
        reason: 'usual_rotation_allowed',
      }
    }
    return {
      candidateId: input.candidate.id,
      shouldSuppress: false,
      freshnessPenalty: 0.55,
      reason: 'recent_repeat',
    }
  }

  return {
    candidateId: input.candidate.id,
    shouldSuppress: false,
    freshnessPenalty: 0,
    reason: 'fresh',
  }
}
