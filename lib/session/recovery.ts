// Session recovery utilities
// Stores the last active path so users can resume after re-authentication

const STORAGE_KEY = 'cf:last-active-path'

/** Paths that should NOT be stored as recovery targets */
const EXCLUDED_PATHS = ['/auth', '/onboarding', '/api', '/embed', '/intake']

/**
 * Store the current path as the last active path.
 * Called from the chef layout on route changes.
 */
export function storeLastActivePath(path: string): void {
  if (!path) return
  if (EXCLUDED_PATHS.some((prefix) => path.startsWith(prefix))) return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ path, timestamp: Date.now() }))
  } catch {
    // localStorage unavailable
  }
}

/**
 * Retrieve the stored last active path.
 * Returns null if expired (older than 24 hours) or unavailable.
 */
export function getLastActivePath(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const { path, timestamp } = JSON.parse(raw) as {
      path: string
      timestamp: number
    }

    // Expire after 24 hours
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
    if (Date.now() - timestamp > TWENTY_FOUR_HOURS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return path
  } catch {
    return null
  }
}

/**
 * Clear stored path after successful recovery redirect.
 */
export function clearLastActivePath(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
