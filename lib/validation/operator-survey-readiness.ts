export type OperatorSurveyReadinessStatus = 'missing' | 'launched' | 'operator_review' | 'verified'

export type OperatorSurveyReadinessFacts = {
  activeSurveys: number
  totalResponses: number
  submittedResponses: number
  analyzedResponses?: number | null
  launchedAt?: string | null
  lastResponseAt?: string | null
  href?: string | null
}

export type OperatorSurveyReadinessSummary = {
  status: OperatorSurveyReadinessStatus
  evidence: string
  nextStep: string
  href: string
}

const DEFAULT_OPERATOR_SURVEY_HREF = '/admin/beta-surveys'

function normalizeCount(value: number | null | undefined): number {
  if (typeof value !== 'number') return 0
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

function countLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`
}

function hasDate(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function appendDateEvidence(
  parts: string[],
  label: string,
  value: string | null | undefined
): void {
  if (hasDate(value)) parts.push(`${label} ${value}`)
}

export function summarizeOperatorSurveyReadiness(
  facts: OperatorSurveyReadinessFacts
): OperatorSurveyReadinessSummary {
  const activeSurveys = normalizeCount(facts.activeSurveys)
  const totalResponses = normalizeCount(facts.totalResponses)
  const submittedResponses = normalizeCount(facts.submittedResponses)
  const analyzedResponses = normalizeCount(facts.analyzedResponses)
  const href = facts.href?.trim() || DEFAULT_OPERATOR_SURVEY_HREF
  const launched = activeSurveys > 0 || hasDate(facts.launchedAt) || totalResponses > 0
  const hasSubmittedProof = submittedResponses > 0
  const hasAnalyzedProof = analyzedResponses > 0

  const evidenceParts = [
    countLabel(activeSurveys, 'active survey', 'active surveys'),
    countLabel(totalResponses, 'total response', 'total responses'),
    countLabel(submittedResponses, 'submitted response', 'submitted responses'),
  ]

  if (facts.analyzedResponses !== undefined && facts.analyzedResponses !== null) {
    evidenceParts.push(countLabel(analyzedResponses, 'analyzed response', 'analyzed responses'))
  }

  appendDateEvidence(evidenceParts, 'launched at', facts.launchedAt)
  appendDateEvidence(evidenceParts, 'last response at', facts.lastResponseAt)

  if (!launched && !hasSubmittedProof && !hasAnalyzedProof) {
    return {
      status: 'missing',
      evidence: `${evidenceParts.join('; ')}; no Wave-1 operator survey proof yet`,
      nextStep: 'Launch the Wave-1 operator survey before using it as readiness proof.',
      href,
    }
  }

  if (!hasSubmittedProof) {
    return {
      status: 'launched',
      evidence: `${evidenceParts.join('; ')}; survey is live but still needs submitted operator responses`,
      nextStep:
        'Collect submitted operator responses before making launch decisions from the survey.',
      href,
    }
  }

  if (!hasAnalyzedProof) {
    return {
      status: 'operator_review',
      evidence: `${evidenceParts.join('; ')}; submitted responses need operator analysis`,
      nextStep: 'Review the submitted responses and record analyzed findings.',
      href,
    }
  }

  return {
    status: 'verified',
    evidence: `${evidenceParts.join('; ')}; analyzed operator survey proof is available`,
    nextStep:
      'Use the analyzed operator findings to decide which launch claims and backlog items survive.',
    href,
  }
}
