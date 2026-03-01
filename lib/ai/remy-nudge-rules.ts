// Remy Nudge Rules — Deterministic rules for proactive mascot nudges.
// All messages are pre-defined strings — no LLM calls.
// Each rule evaluates against the activity tracker's session data.

import type { SessionActivity } from '@/lib/ai/remy-activity-tracker'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NudgeRule {
  /** Unique identifier for cooldown tracking */
  id: string
  /** Deterministic condition — pure function, no side effects */
  condition: (activity: SessionActivity) => boolean
  /** What the speech bubble says */
  message: (activity: SessionActivity) => string
  /** Minimum minutes between firings of this specific rule */
  cooldownMinutes: number
  /** If true, this rule can only fire once ever (tracked in sessionStorage) */
  oncePerSession?: boolean
}

// ─── Rules ───────────────────────────────────────────────────────────────────

export const NUDGE_RULES: NudgeRule[] = [
  {
    id: 'error-help',
    condition: (activity) => {
      const fiveMinAgo = Date.now() - 5 * 60_000
      const recentErrors = activity.recentErrors.filter(
        (e) => new Date(e.at).getTime() > fiveMinAgo
      )
      return recentErrors.length >= 2
    },
    message: () => 'Spotted some errors — want help?',
    cooldownMinutes: 15,
  },
  {
    id: 'long-settings',
    condition: (activity) => {
      const onSettings = activity.recentPages.some(
        (p) => p.path.startsWith('/settings') && p.path !== '/settings'
      )
      if (!onSettings) return false
      // Check if they've been on settings pages for > 5 min
      const settingsVisits = activity.recentPages.filter((p) => p.path.startsWith('/settings'))
      if (settingsVisits.length === 0) return false
      const firstSettingsAt = new Date(settingsVisits[0].at).getTime()
      return Date.now() - firstSettingsAt > 5 * 60_000
    },
    message: () => 'Need help finding a setting?',
    cooldownMinutes: 30,
  },
  {
    id: 'long-session',
    condition: (activity) => activity.sessionMinutes > 120,
    message: () => "You've been at it a while — take a break, chef!",
    cooldownMinutes: 60,
  },
  {
    id: 'idle-check',
    condition: (activity) => {
      if (activity.activeForm) return false // don't nudge during form work
      if (activity.recentActions.length === 0) return false // need at least some activity first
      const lastAction = activity.recentActions[activity.recentActions.length - 1]
      const minutesSinceAction = (Date.now() - new Date(lastAction.at).getTime()) / 60_000
      return minutesSinceAction >= 10
    },
    message: () => "I'm here if you need anything!",
    cooldownMinutes: 30,
  },
  {
    id: 'survey-nudge',
    condition: (activity) => {
      // Only nudge if they've been active for 3+ minutes (not brand new)
      return activity.sessionMinutes >= 3
    },
    message: () => 'Want to do a quick get-to-know-you?',
    oncePerSession: true,
    cooldownMinutes: 999, // effectively once-ever via oncePerSession
  },
]

// ─── Evaluator ───────────────────────────────────────────────────────────────

const COOLDOWN_KEY = 'remy-nudge-cooldowns'
const GLOBAL_LAST_KEY = 'remy-nudge-global-last'
const NUDGE_COUNT_KEY = 'remy-nudge-count'
const GLOBAL_COOLDOWN_MS = 3 * 60_000 // 3 minutes between any nudge
const MAX_NUDGES_PER_SESSION = 5

interface NudgeCooldowns {
  [ruleId: string]: string // ISO timestamp of last fire
}

function getCooldowns(): NudgeCooldowns {
  try {
    const raw = sessionStorage.getItem(COOLDOWN_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function getGlobalLast(): number {
  try {
    const raw = sessionStorage.getItem(GLOBAL_LAST_KEY)
    return raw ? new Date(raw).getTime() : 0
  } catch {
    return 0
  }
}

function getNudgeCount(): number {
  try {
    return parseInt(sessionStorage.getItem(NUDGE_COUNT_KEY) || '0', 10)
  } catch {
    return 0
  }
}

/**
 * Evaluate all nudge rules against current activity.
 * Returns the first matching rule, or null if none match or cooldowns block.
 */
export function evaluateNudges(activity: SessionActivity): NudgeRule | null {
  if (typeof window === 'undefined') return null

  // Session cap
  if (getNudgeCount() >= MAX_NUDGES_PER_SESSION) return null

  // Global cooldown
  const globalLast = getGlobalLast()
  if (Date.now() - globalLast < GLOBAL_COOLDOWN_MS) return null

  const cooldowns = getCooldowns()

  for (const rule of NUDGE_RULES) {
    // Per-rule cooldown
    const lastFired = cooldowns[rule.id]
    if (lastFired) {
      if (rule.oncePerSession) continue // already fired this session
      const elapsed = (Date.now() - new Date(lastFired).getTime()) / 60_000
      if (elapsed < rule.cooldownMinutes) continue
    }

    // Evaluate condition
    if (rule.condition(activity)) {
      return rule
    }
  }

  return null
}

/**
 * Record that a nudge was fired. Call after displaying the nudge.
 */
export function recordNudgeFired(ruleId: string): void {
  if (typeof window === 'undefined') return
  try {
    const cooldowns = getCooldowns()
    cooldowns[ruleId] = new Date().toISOString()
    sessionStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldowns))
    sessionStorage.setItem(GLOBAL_LAST_KEY, new Date().toISOString())
    sessionStorage.setItem(NUDGE_COUNT_KEY, String(getNudgeCount() + 1))
  } catch {
    // sessionStorage unavailable
  }
}

/**
 * Extend global cooldown (e.g., when user dismisses a nudge).
 */
export function extendNudgeCooldown(): void {
  if (typeof window === 'undefined') return
  try {
    // Set global last to 7 minutes in the future effectively (10 min total cooldown)
    const extended = new Date(Date.now() + 7 * 60_000).toISOString()
    sessionStorage.setItem(GLOBAL_LAST_KEY, extended)
  } catch {
    // sessionStorage unavailable
  }
}
