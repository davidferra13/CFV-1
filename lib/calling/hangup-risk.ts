import type { VoiceProfessionalRiskLevel } from '@/lib/calling/voice-ops-types'

export interface HangupRiskInput {
  openingScript?: string | null
  transcript?: string | null
  identityDisclosed?: boolean
  recordingDisclosed?: boolean
  averageLatencyMs?: number | null
  lowestSpeechConfidence?: number | null
  recoveryPromptCount?: number
}

export interface HangupRiskScore {
  level: VoiceProfessionalRiskLevel
  score: number
  reasons: string[]
  recommendedAdjustment: string
}

const TRUST_RISK_PATTERNS = [
  /\bwho is this\b/i,
  /\bwhat is this\b/i,
  /\bare you (?:a )?(?:robot|ai|person|human)\b/i,
  /\bstop calling\b/i,
  /\bdon't call\b/i,
  /\btake me off\b/i,
  /\bspeak to (?:a )?(?:person|human|chef)\b/i,
]

export function scoreHangupRisk(input: HangupRiskInput): HangupRiskScore {
  const reasons: string[] = []
  let score = 0
  const opening = (input.openingScript ?? '').trim()
  const transcript = (input.transcript ?? '').trim()

  if (opening.split(/\s+/).filter(Boolean).length > 42) {
    score += 25
    reasons.push('Opening script is too long for a cold voice call.')
  }

  if (input.identityDisclosed === false) {
    score += 35
    reasons.push('AI identity disclosure is missing.')
  }

  if (input.recordingDisclosed === false) {
    score += 20
    reasons.push('Recording disclosure is missing.')
  }

  if ((input.averageLatencyMs ?? 0) > 1600) {
    score += 15
    reasons.push('Response latency may feel awkward.')
  }

  if ((input.lowestSpeechConfidence ?? 1) < 0.55) {
    score += 15
    reasons.push('Speech confidence is low.')
  }

  if ((input.recoveryPromptCount ?? 0) >= 2) {
    score += 15
    reasons.push('Repeated recovery prompts increase hang-up risk.')
  }

  for (const pattern of TRUST_RISK_PATTERNS) {
    if (pattern.test(transcript)) {
      score += 25
      reasons.push('Caller expressed trust, identity, human handoff, or opt-out concern.')
      break
    }
  }

  const level: VoiceProfessionalRiskLevel = score >= 60 ? 'high' : score >= 25 ? 'medium' : 'low'

  return {
    level,
    score,
    reasons,
    recommendedAdjustment: recommendation(level, reasons),
  }
}

function recommendation(level: VoiceProfessionalRiskLevel, reasons: string[]): string {
  if (level === 'high') {
    return 'Shorten the opening, disclose AI and recording immediately, and route to human review.'
  }
  if (level === 'medium') {
    return 'Use a shorter first sentence and ask one narrow question before collecting detail.'
  }
  if (reasons.length === 0) {
    return 'Current call pattern is low risk.'
  }
  return 'Keep the call concise and preserve the existing disclosures.'
}
