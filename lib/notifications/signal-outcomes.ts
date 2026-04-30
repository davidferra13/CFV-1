import type { EvaluatedChefSignal } from './noise-simulator'

export type SignalOutcomeInput = {
  signalId: string
  openedAt?: string | null
  clickedAt?: string | null
  dismissedAt?: string | null
  actionCompletedAt?: string | null
  escalatedLater?: boolean
  demotedByChef?: boolean
}

export type SignalOutcomeScore = {
  signalId: string
  useful: boolean
  score: number
  reasons: string[]
}

export function scoreSignalOutcome(
  signal: EvaluatedChefSignal,
  outcome: SignalOutcomeInput
): SignalOutcomeScore {
  const reasons: string[] = []
  let score = 0

  if (outcome.openedAt) {
    score += 1
    reasons.push('Chef opened the signal.')
  }

  if (outcome.clickedAt) {
    score += 2
    reasons.push('Chef clicked through from the signal.')
  }

  if (outcome.actionCompletedAt) {
    score += 4
    reasons.push('Signal led to completed action.')
  }

  if (outcome.dismissedAt && !outcome.actionCompletedAt) {
    score -= 2
    reasons.push('Signal was dismissed without action.')
  }

  if (outcome.demotedByChef) {
    score -= 3
    reasons.push('Chef demoted this signal type.')
  }

  if (outcome.escalatedLater) {
    score += signal.decision === 'suppress' ? 3 : 1
    reasons.push(
      'Signal later escalated, which means the system should review its original routing.'
    )
  }

  if (signal.risk === 'safety' || signal.risk === 'money') {
    score += 1
    reasons.push('Safety and money signals carry higher baseline value.')
  }

  return {
    signalId: signal.id,
    useful: score > 0,
    score,
    reasons,
  }
}

export function summarizeSignalOutcomes(scores: SignalOutcomeScore[]) {
  const useful = scores.filter((score) => score.useful).length
  const noisy = scores.length - useful
  const averageScore =
    scores.length === 0
      ? 0
      : scores.reduce((total, score) => total + score.score, 0) / scores.length

  return {
    total: scores.length,
    useful,
    noisy,
    averageScore,
  }
}
