export const MILESTONE_ANIMATIONS_ENABLED_KEY = 'cf_milestone_animations_enabled'
export const MILESTONE_ANIMATIONS_PREF_EVENT = 'cf:milestone-animations:change'

export function readMilestoneAnimationsEnabled(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(MILESTONE_ANIMATIONS_ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeMilestoneAnimationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(MILESTONE_ANIMATIONS_ENABLED_KEY, enabled ? 'true' : 'false')
  } catch {
    // Ignore storage failures so the toggle never crashes the settings page.
  }

  window.dispatchEvent(
    new CustomEvent(MILESTONE_ANIMATIONS_PREF_EVENT, {
      detail: { enabled },
    })
  )
}
