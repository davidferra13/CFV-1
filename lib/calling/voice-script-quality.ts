import { VOICE_AGENT_CONTRACT } from '@/lib/calling/voice-agent-contract'
import { scoreHangupRisk } from '@/lib/calling/hangup-risk'
import type { VoiceProfessionalRiskLevel } from '@/lib/calling/voice-ops-types'

export interface VoiceScriptQualityResult {
  allowedToLaunch: boolean
  level: VoiceProfessionalRiskLevel
  score: number
  reasons: string[]
  requiredFixes: string[]
  recommendedScript: string
}

export function evaluateVoiceScriptQuality(
  script: string | null | undefined
): VoiceScriptQualityResult {
  const normalized = (script ?? '').replace(/\s+/g, ' ').trim()
  const requiredFixes: string[] = []

  if (!normalized) requiredFixes.push('Opening script is missing.')
  if (!/\bAI assistant\b/i.test(normalized))
    requiredFixes.push('AI identity disclosure is missing.')
  if (!/\brecorded\b|\btranscribed\b/i.test(normalized)) {
    requiredFixes.push('Recording or transcription disclosure is missing.')
  }
  if (!/\bstop calling\b|\bopt out\b|\bdo not call\b/i.test(normalized)) {
    requiredFixes.push('Opt-out instruction is missing.')
  }

  const risk = scoreHangupRisk({
    openingScript: normalized,
    transcript: '',
    identityDisclosed: requiredFixes.every((fix) => !fix.includes('identity')),
    recordingDisclosed: requiredFixes.every((fix) => !fix.includes('Recording')),
  })

  const level: VoiceProfessionalRiskLevel =
    requiredFixes.length >= 2 || risk.level === 'high'
      ? 'high'
      : requiredFixes.length === 1 || risk.level === 'medium'
        ? 'medium'
        : 'low'

  return {
    allowedToLaunch: level !== 'high',
    level,
    score: risk.score + requiredFixes.length * 20,
    reasons: [...requiredFixes, ...risk.reasons],
    requiredFixes,
    recommendedScript: buildRecommendedOpening(),
  }
}

export function buildRecommendedOpening(): string {
  return `${VOICE_AGENT_CONTRACT.identityDisclosure} ${VOICE_AGENT_CONTRACT.recordingDisclosure} ${VOICE_AGENT_CONTRACT.optOutInstruction}`
}
