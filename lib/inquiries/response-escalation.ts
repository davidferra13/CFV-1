// Response Time Escalation Engine
// Converts passive response tracking into active enforcement with escalation tiers.
// Pure computation, no side effects. Consumers call this to get current escalation level.

export type EscalationLevel = 'ok' | 'yellow' | 'remy_alert' | 'remy_draft' | 'red' | 'auto_send'

export interface EscalationState {
  level: EscalationLevel
  hoursSinceLastResponse: number
  badgeColor: 'green' | 'yellow' | 'orange' | 'red' | null
  label: string
  shouldDraftHoldingMessage: boolean
  shouldAutoSend: boolean
  shouldBumpPriority: boolean
}

// Escalation thresholds (in hours)
const THRESHOLDS = {
  yellow: 4,
  remy_alert: 12,
  remy_draft: 24,
  red: 48,
  auto_send: 72,
} as const

/**
 * Compute the escalation state for an inquiry based on time since last response.
 * @param lastResponseAt - ISO timestamp of last outbound message, or null if never responded
 * @param createdAt - ISO timestamp of inquiry creation (fallback reference)
 * @param autoResponseEnabled - whether the chef has auto-response enabled for 72h
 */
export function computeEscalation(
  lastResponseAt: string | null,
  createdAt: string,
  autoResponseEnabled: boolean = false
): EscalationState {
  const referenceTime = lastResponseAt || createdAt
  const hoursSince = (Date.now() - new Date(referenceTime).getTime()) / (1000 * 60 * 60)

  if (hoursSince >= THRESHOLDS.auto_send) {
    return {
      level: 'auto_send',
      hoursSinceLastResponse: Math.round(hoursSince),
      badgeColor: 'red',
      label: autoResponseEnabled ? 'Auto-sending holding message' : '72h+ no response',
      shouldDraftHoldingMessage: true,
      shouldAutoSend: autoResponseEnabled,
      shouldBumpPriority: true,
    }
  }

  if (hoursSince >= THRESHOLDS.red) {
    return {
      level: 'red',
      hoursSinceLastResponse: Math.round(hoursSince),
      badgeColor: 'red',
      label: '48h+ no response',
      shouldDraftHoldingMessage: true,
      shouldAutoSend: false,
      shouldBumpPriority: true,
    }
  }

  if (hoursSince >= THRESHOLDS.remy_draft) {
    return {
      level: 'remy_draft',
      hoursSinceLastResponse: Math.round(hoursSince),
      badgeColor: 'orange',
      label: '24h+ waiting',
      shouldDraftHoldingMessage: true,
      shouldAutoSend: false,
      shouldBumpPriority: false,
    }
  }

  if (hoursSince >= THRESHOLDS.remy_alert) {
    return {
      level: 'remy_alert',
      hoursSinceLastResponse: Math.round(hoursSince),
      badgeColor: 'yellow',
      label: 'Client waiting 12h+',
      shouldDraftHoldingMessage: false,
      shouldAutoSend: false,
      shouldBumpPriority: false,
    }
  }

  if (hoursSince >= THRESHOLDS.yellow) {
    return {
      level: 'yellow',
      hoursSinceLastResponse: Math.round(hoursSince),
      badgeColor: 'yellow',
      label: '4h since last response',
      shouldDraftHoldingMessage: false,
      shouldAutoSend: false,
      shouldBumpPriority: false,
    }
  }

  return {
    level: 'ok',
    hoursSinceLastResponse: Math.round(hoursSince),
    badgeColor: null,
    label: 'On track',
    shouldDraftHoldingMessage: false,
    shouldAutoSend: false,
    shouldBumpPriority: false,
  }
}

/**
 * Compute average response time for a chef (in hours).
 * Returns null if insufficient data.
 */
export function computeAverageResponseTime(
  responseTimes: number[] // array of response times in milliseconds
): number | null {
  if (responseTimes.length < 3) return null
  const totalMs = responseTimes.reduce((sum, t) => sum + t, 0)
  const avgHours = totalMs / responseTimes.length / (1000 * 60 * 60)
  return Math.round(avgHours * 10) / 10 // one decimal place
}

/**
 * Whether the average response time is good enough to display publicly.
 * Only show if < 24h average.
 */
export function shouldDisplayResponseTime(avgHours: number | null): boolean {
  if (avgHours === null) return false
  return avgHours < 24
}
