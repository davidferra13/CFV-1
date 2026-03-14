/**
 * Remy Activity Tracker — Client-Side Session Awareness
 *
 * Tracks two things in sessionStorage so Remy knows what the chef has been doing:
 *
 * 1. **Navigation trail** — last 10 pages visited this session
 * 2. **Recent actions** — last 10 mutations (create/update/delete) this session
 *
 * Both are ephemeral (sessionStorage = cleared on tab close).
 * Sent with each Remy message so the system prompt includes them.
 *
 * PRIVACY: All data stays in the browser. Nothing leaves unless the chef
 * sends a message to Remy, at which point the trail is included in the request.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PageVisit {
  /** The pathname (e.g. /events/uuid) */
  path: string
  /** Human-readable label (e.g. "Event: Birthday Dinner") */
  label: string
  /** ISO timestamp */
  at: string
}

export interface RecentAction {
  /** What happened (e.g. "created event", "updated client") */
  action: string
  /** Entity involved (e.g. "Birthday Dinner for Sarah") */
  entity: string
  /** ISO timestamp */
  at: string
}

export interface RecentError {
  /** Short error description */
  message: string
  /** Where it happened (e.g. "Event creation") */
  context: string
  /** ISO timestamp */
  at: string
}

export interface SessionActivity {
  recentPages: PageVisit[]
  recentActions: RecentAction[]
  recentErrors: RecentError[]
  /** How long the chef has been active this session (minutes) */
  sessionMinutes: number
  /** What form the chef is currently working on, if any */
  activeForm: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NAV_KEY = 'remy-nav-trail'
const ACTIONS_KEY = 'remy-recent-actions'
const ERRORS_KEY = 'remy-recent-errors'
const SESSION_START_KEY = 'remy-session-start'
const ACTIVE_FORM_KEY = 'remy-active-form'
const MAX_NAV_ENTRIES = 10
const MAX_ACTION_ENTRIES = 10
const MAX_ERROR_ENTRIES = 5

// ─── Navigation Trail ────────────────────────────────────────────────────────

/** Map pathname to a human-readable page label */
function labelForPath(path: string): string {
  // Strip trailing slashes
  const p = path.replace(/\/$/, '') || '/'

  // Static route labels
  const staticLabels: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/events': 'Events',
    '/events/new': 'New Event',
    '/events/upcoming': 'Upcoming Events',
    '/events/board': 'Event Board',
    '/clients': 'Clients',
    '/clients/recurring': 'Recurring Board',
    '/clients/new': 'New Client',
    '/inquiries': 'Inquiries',
    '/quotes': 'Quotes',
    '/schedule': 'Schedule',
    '/calendar': 'Calendar',
    '/recipes': 'Recipes',
    '/recipes/new': 'New Recipe',
    '/menus': 'Menus',
    '/menus/new': 'New Menu',
    '/financials': 'Financials',
    '/expenses': 'Expenses',
    '/expenses/new': 'New Expense',
    '/chat': 'Client Messaging',
    '/staff': 'Staff',
    '/settings': 'Settings',
    '/settings/my-profile': 'My Profile',
    '/settings/integrations': 'Integrations',
    '/settings/automations': 'Automations',
    '/settings/culinary-profile': 'Culinary Profile',
    '/settings/favorite-chefs': 'Favorite Chefs',
    '/settings/ai-privacy': 'Remy Settings',
    '/aar': 'After-Action Reviews',
    '/reviews': 'Client Reviews',
    '/analytics': 'Analytics',
    '/proposals': 'Proposals',
    '/loyalty': 'Loyalty Program',
    '/goals': 'Goals',
    '/daily': 'Daily Ops',
    '/remy': 'Remy History',
  }

  if (staticLabels[p]) return staticLabels[p]

  // Dynamic routes with UUID — label the section
  if (p.match(/^\/events\/[0-9a-f-]{36}/i)) return 'Event Detail'
  if (p.match(/^\/clients\/[0-9a-f-]{36}/i)) return 'Client Detail'
  if (p.match(/^\/recipes\/[0-9a-f-]{36}/i)) return 'Recipe Detail'
  if (p.match(/^\/inquiries\/[0-9a-f-]{36}/i)) return 'Inquiry Detail'
  if (p.match(/^\/menus\/[0-9a-f-]{36}/i)) return 'Menu Detail'

  // Fallback: capitalize the first path segment
  const segment = p.split('/').filter(Boolean)[0]
  return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : 'Home'
}

/**
 * Record a page visit. Call this on pathname changes.
 * Deduplicates consecutive visits to the same page.
 */
export function trackPageVisit(pathname: string): void {
  if (typeof window === 'undefined') return

  try {
    const raw = sessionStorage.getItem(NAV_KEY)
    const trail: PageVisit[] = raw ? JSON.parse(raw) : []

    // Don't record duplicate consecutive visits
    if (trail.length > 0 && trail[trail.length - 1].path === pathname) return

    trail.push({
      path: pathname,
      label: labelForPath(pathname),
      at: new Date().toISOString(),
    })

    // Keep only the last N entries
    const trimmed = trail.slice(-MAX_NAV_ENTRIES)
    sessionStorage.setItem(NAV_KEY, JSON.stringify(trimmed))
  } catch {
    // sessionStorage full or unavailable
  }
}

/**
 * Get the current navigation trail.
 */
export function getNavTrail(): PageVisit[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(NAV_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// ─── Recent Actions (Mutations) ──────────────────────────────────────────────

/**
 * Record a user action/mutation. Call from UI components after successful writes.
 *
 * Examples:
 *   trackAction('Created event', 'Birthday Dinner for Sarah')
 *   trackAction('Updated client', 'Jane Smith')
 *   trackAction('Sent quote', 'Tasting Menu — $2,500')
 *   trackAction('Added expense', '$145 at Whole Foods')
 */
export function trackAction(action: string, entity: string): void {
  if (typeof window === 'undefined') return

  try {
    const raw = sessionStorage.getItem(ACTIONS_KEY)
    const actions: RecentAction[] = raw ? JSON.parse(raw) : []

    actions.push({
      action,
      entity,
      at: new Date().toISOString(),
    })

    // Keep only the last N entries
    const trimmed = actions.slice(-MAX_ACTION_ENTRIES)
    sessionStorage.setItem(ACTIONS_KEY, JSON.stringify(trimmed))
  } catch {
    // sessionStorage full or unavailable
  }
}

/**
 * Get all recent actions this session.
 */
export function getRecentActions(): RecentAction[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(ACTIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// ─── Error Tracking ─────────────────────────────────────────────────────────

/**
 * Record a user-facing error. Call from catch blocks and error boundaries.
 * Remy uses these to proactively offer help when things go wrong.
 *
 * Examples:
 *   trackError('Failed to create event', 'Event creation')
 *   trackError('Quote expired', 'Quote form')
 */
export function trackError(message: string, context: string): void {
  if (typeof window === 'undefined') return

  try {
    const raw = sessionStorage.getItem(ERRORS_KEY)
    const errors: RecentError[] = raw ? JSON.parse(raw) : []

    errors.push({
      message: message.slice(0, 200),
      context: context.slice(0, 100),
      at: new Date().toISOString(),
    })

    const trimmed = errors.slice(-MAX_ERROR_ENTRIES)
    sessionStorage.setItem(ERRORS_KEY, JSON.stringify(trimmed))
  } catch {
    // sessionStorage full or unavailable
  }
}

/**
 * Get recent errors this session.
 */
export function getRecentErrors(): RecentError[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(ERRORS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// ─── Session Duration ───────────────────────────────────────────────────────

/**
 * Initialize session start time. Call once on app mount.
 * Uses sessionStorage so it's per-tab and resets on close.
 */
export function initSessionTimer(): void {
  if (typeof window === 'undefined') return
  try {
    if (!sessionStorage.getItem(SESSION_START_KEY)) {
      sessionStorage.setItem(SESSION_START_KEY, new Date().toISOString())
    }
  } catch {
    // sessionStorage unavailable
  }
}

/**
 * Get session duration in minutes.
 */
export function getSessionMinutes(): number {
  if (typeof window === 'undefined') return 0
  try {
    const start = sessionStorage.getItem(SESSION_START_KEY)
    if (!start) return 0
    const elapsed = Date.now() - new Date(start).getTime()
    return Math.round(elapsed / 60000)
  } catch {
    return 0
  }
}

// ─── Form-In-Progress Tracking ──────────────────────────────────────────────

/**
 * Mark that the chef is currently working on a form.
 * Call on form mount/focus. Pass null to clear.
 *
 * Examples:
 *   setActiveForm('Creating new event')
 *   setActiveForm('Editing quote for Smith dinner')
 *   setActiveForm(null) // form submitted or closed
 */
export function setActiveForm(formLabel: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (formLabel) {
      sessionStorage.setItem(ACTIVE_FORM_KEY, formLabel)
    } else {
      sessionStorage.removeItem(ACTIVE_FORM_KEY)
    }
  } catch {
    // sessionStorage unavailable
  }
}

/**
 * Get the currently active form label, if any.
 */
export function getActiveForm(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(ACTIVE_FORM_KEY) || null
  } catch {
    return null
  }
}

// ─── Cross-Chat Channel Digests ──────────────────────────────────────────────

const DIGEST_KEY_PREFIX = 'remy-channel-digest-'
const MAX_DIGEST_ENTRIES = 3

export interface ChannelDigestEntry {
  userExcerpt: string
  remyExcerpt: string
  at: string
}

/**
 * Update the conversation digest for a chat channel.
 * Called after each successful message exchange.
 * Stores a rolling window of the last 3 exchanges as short excerpts.
 */
export function updateChannelDigest(
  channel: 'mascot' | 'drawer',
  userMessage: string,
  remyResponse: string
): void {
  if (typeof window === 'undefined') return

  try {
    const key = DIGEST_KEY_PREFIX + channel
    const raw = sessionStorage.getItem(key)
    const entries: ChannelDigestEntry[] = raw ? JSON.parse(raw) : []

    entries.push({
      userExcerpt: userMessage.slice(0, 80).trim(),
      remyExcerpt: remyResponse.slice(0, 80).trim(),
      at: new Date().toISOString(),
    })

    const trimmed = entries.slice(-MAX_DIGEST_ENTRIES)
    sessionStorage.setItem(key, JSON.stringify(trimmed))
  } catch {
    // sessionStorage full or unavailable
  }
}

/**
 * Get the conversation digest from the OTHER chat channel.
 * Returns a formatted string for injection into the API request, or null if empty.
 */
export function getOtherChannelDigest(currentChannel: 'mascot' | 'drawer'): string | null {
  if (typeof window === 'undefined') return null

  try {
    const otherChannel = currentChannel === 'mascot' ? 'drawer' : 'mascot'
    const key = DIGEST_KEY_PREFIX + otherChannel
    const raw = sessionStorage.getItem(key)
    if (!raw) return null

    const entries: ChannelDigestEntry[] = JSON.parse(raw)
    if (entries.length === 0) return null

    const channelLabel = otherChannel === 'mascot' ? 'quick chat' : 'full chat drawer'
    const lines = entries.map(
      (e) => `- Chef asked about "${e.userExcerpt}…" → Remy discussed "${e.remyExcerpt}…"`
    )

    return `Recent topics from the ${channelLabel}:\n${lines.join('\n')}`
  } catch {
    return null
  }
}

// ─── Combined Getter (for sending with Remy messages) ────────────────────────

/**
 * Get all session activity to include in a Remy API request.
 */
export function getSessionActivity(): SessionActivity {
  return {
    recentPages: getNavTrail(),
    recentActions: getRecentActions(),
    recentErrors: getRecentErrors(),
    sessionMinutes: getSessionMinutes(),
    activeForm: getActiveForm(),
  }
}
