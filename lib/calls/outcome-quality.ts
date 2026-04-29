export type CallOutcomeQualityInput = {
  status: string
  outcome_summary?: string | null
  call_notes?: string | null
  next_action?: string | null
  next_action_due_at?: string | null
  actual_duration_minutes?: number | null
}

export type CallOutcomeQuality = {
  score: number
  level: 'missing' | 'weak' | 'usable' | 'strong'
  label: string
  summary: string
  strengths: string[]
  gaps: string[]
  nextStep: string | null
}

export function evaluateCallOutcomeQuality(input: CallOutcomeQualityInput): CallOutcomeQuality {
  if (input.status !== 'completed') {
    return {
      score: 0,
      level: 'missing',
      label: 'Not completed',
      summary: 'Outcome quality is evaluated after a call is completed.',
      strengths: [],
      gaps: [],
      nextStep: null,
    }
  }

  const summary = clean(input.outcome_summary)
  const notes = clean(input.call_notes)
  const nextAction = clean(input.next_action)
  const hasDueDate = hasText(input.next_action_due_at)
  const hasDuration =
    typeof input.actual_duration_minutes === 'number' && input.actual_duration_minutes > 0
  const decisionSignal = hasDecisionSignal(`${summary} ${notes}`)

  const strengths: string[] = []
  const gaps: string[] = []
  let score = 0

  if (summary) {
    score += summary.length >= 24 ? 25 : 12
    strengths.push('Outcome summary captured')
  } else {
    gaps.push('Add the decision or status after the call')
  }

  if (decisionSignal) {
    score += 20
    strengths.push('Decision language is present')
  } else {
    gaps.push('Clarify what was decided, approved, declined, paid, changed, or still blocked')
  }

  if (notes) {
    score += notes.length >= 40 ? 15 : 8
    strengths.push('Context notes captured')
  } else {
    gaps.push('Add useful context, objections, preferences, or risks discussed')
  }

  if (nextAction) {
    score += 20
    strengths.push('Next action captured')
  } else {
    gaps.push('Add the next action or explicitly close the loop')
  }

  if (nextAction && hasDueDate) {
    score += 10
    strengths.push('Next action has a due date')
  } else if (nextAction) {
    gaps.push('Add a due date for the next action')
  }

  if (hasDuration) {
    score += 10
    strengths.push('Actual call duration captured')
  } else {
    gaps.push('Add actual duration for call analytics')
  }

  const boundedScore = Math.min(100, score)
  const level = outcomeLevel(boundedScore, gaps)

  return {
    score: boundedScore,
    level,
    label: outcomeLabel(level),
    summary: outcomeSummary(level),
    strengths,
    gaps,
    nextStep: gaps[0] ?? null,
  }
}

function outcomeLevel(score: number, gaps: string[]): CallOutcomeQuality['level'] {
  if (score === 0 || gaps.length >= 5) return 'missing'
  if (score < 45 || gaps.length >= 4) return 'weak'
  if (score < 80 || gaps.length >= 2) return 'usable'
  return 'strong'
}

function outcomeLabel(level: CallOutcomeQuality['level']): string {
  if (level === 'strong') return 'Strong outcome'
  if (level === 'usable') return 'Usable outcome'
  if (level === 'weak') return 'Weak outcome'
  return 'Outcome missing'
}

function outcomeSummary(level: CallOutcomeQuality['level']): string {
  if (level === 'strong') return 'This call has enough detail to drive follow-up and analytics.'
  if (level === 'usable') return 'This call has usable detail, but one or two fields would improve it.'
  if (level === 'weak') return 'This call is logged, but it may not explain what changed or who acts next.'
  return 'This completed call does not have enough outcome detail yet.'
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasDecisionSignal(value: string): boolean {
  const normalized = value.toLowerCase()
  return [
    'approved',
    'accepted',
    'confirmed',
    'declined',
    'decided',
    'paid',
    'deposit',
    'send',
    'revise',
    'change',
    'blocked',
    'waiting',
    'not a fit',
    'ready',
  ].some((signal) => normalized.includes(signal))
}
