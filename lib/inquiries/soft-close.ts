export interface SoftCloseIntent {
  futureInterest: boolean
  matchedSignals: string[]
}

const SOFT_CLOSE_PATTERNS: Array<{ label: string; regex: RegExp; strength: 'weak' | 'strong' }> = [
  { label: 'plans changed', regex: /\bplans?\s+(?:have\s+)?changed\b/i, strength: 'weak' },
  {
    label: 'skip this trip',
    regex: /\bskip\s+(?:this|the)\s+(?:experience|trip|visit|time)\b/i,
    strength: 'strong',
  },
  { label: 'not this trip', regex: /\bnot\s+this\s+(?:trip|time|visit)\b/i, strength: 'strong' },
  {
    label: 'cannot make it',
    regex: /\b(?:can'?t|cannot|won't)\s+(?:make it|do this|move forward)\b/i,
    strength: 'strong',
  },
  { label: 'have to pass', regex: /\b(?:have|need|going)\s+to\s+pass\b/i, strength: 'strong' },
  { label: 'pass for now', regex: /\bpass\s+for\s+now\b/i, strength: 'strong' },
  { label: 'not moving forward', regex: /\bnot\s+moving\s+forward\b/i, strength: 'strong' },
  { label: 'skip for now', regex: /\bskip\s+(?:it|this)\s+for\s+now\b/i, strength: 'strong' },
]

const CONTINUE_PLANNING_PATTERNS = [
  /\bstill\s+interested\b/i,
  /\bcan\s+we\s+(?:move|switch|reschedule)\b/i,
  /\breschedule\b/i,
  /\binstead\b/i,
  /\bwhat\s+(?:other\s+)?dates?\b/i,
  /\bdo\s+you\s+have\s+availability\b/i,
]

const FUTURE_INTEREST_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'future visit', regex: /\bfuture\s+(?:visit|trip|stay)\b/i },
  { label: 'next time', regex: /\bnext\s+time\b/i },
  { label: 'next trip', regex: /\bnext\s+trip\b/i },
  { label: 'another time', regex: /\banother\s+time\b/i },
  { label: 'in the future', regex: /\bin\s+the\s+future\b/i },
  { label: 'sometime in the future', regex: /\bsometime\s+in\s+the\s+future\b/i },
  { label: 'would love in future', regex: /\bwould\s+really\s+love\s+to\b[\s\S]{0,80}\bfuture\b/i },
  { label: 'hope for future opportunity', regex: /\bhope\s+we\s+get\s+the\s+opportunity\b/i },
]

export function detectSoftCloseIntent(text: string | null | undefined): SoftCloseIntent | null {
  if (!text) return null

  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length === 0) return null

  const matchedClosePatterns = SOFT_CLOSE_PATTERNS.filter(({ regex }) => regex.test(normalized))
  const matchedSignals = matchedClosePatterns.map(({ label }) => label)

  if (matchedSignals.length === 0) return null

  const hasStrongCloseSignal = matchedClosePatterns.some(({ strength }) => strength === 'strong')
  const hasContinuationSignal = CONTINUE_PLANNING_PATTERNS.some((regex) => regex.test(normalized))

  if (!hasStrongCloseSignal && hasContinuationSignal) return null

  const futureInterestSignals = FUTURE_INTEREST_PATTERNS.filter(({ regex }) =>
    regex.test(normalized)
  ).map(({ label }) => label)

  return {
    futureInterest: futureInterestSignals.length > 0,
    matchedSignals: [...matchedSignals, ...futureInterestSignals],
  }
}
