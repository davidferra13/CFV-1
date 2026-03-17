// Safety Filter - Validates actions before execution to prevent damage.
// Blocks destructive operations, external navigation, and campaign sends.

import type { RLAction } from './types'

const ALLOWED_HOSTS = ['beta.cheflowhq.com']

/** Patterns in button/link text that indicate destructive actions */
const DESTRUCTIVE_PATTERNS = [
  /\bdelete\b/i,
  /\bremove\b/i,
  /\bdestroy\b/i,
  /\bpurge\b/i,
  /\bdrop\b/i,
  /\breset\b/i,
  /\bwipe\b/i,
  /\bclear all\b/i,
  /\bdelete account\b/i,
  /\bcancel subscription\b/i,
]

/** Routes where form submission is blocked (could send real comms) */
const BLOCKED_SUBMIT_ROUTES = [
  '/campaigns/', // Campaign sends
  '/prospecting/', // Outreach emails
]

/**
 * Check if an action is safe to execute.
 * Returns { safe: true } or { safe: false, reason: string }.
 */
export function checkActionSafety(
  action: RLAction,
  currentRoute: string
): { safe: boolean; reason?: string } {
  // Block external URL navigation
  if (action.href && action.href.startsWith('http')) {
    try {
      const url = new URL(action.href)
      if (!ALLOWED_HOSTS.includes(url.hostname)) {
        return { safe: false, reason: `External URL blocked: ${url.hostname}` }
      }
    } catch {
      return { safe: false, reason: `Invalid URL: ${action.href}` }
    }
  }

  // Block destructive actions
  if (action.text && DESTRUCTIVE_PATTERNS.some((p) => p.test(action.text!))) {
    return { safe: false, reason: `Destructive action blocked: "${action.text}"` }
  }

  // Block form submissions on sensitive routes
  if (action.type === 'submit_form') {
    for (const blocked of BLOCKED_SUBMIT_ROUTES) {
      if (currentRoute.includes(blocked)) {
        return { safe: false, reason: `Form submit blocked on route: ${currentRoute}` }
      }
    }
  }

  // Block mailto: and tel: links
  if (action.href && (action.href.startsWith('mailto:') || action.href.startsWith('tel:'))) {
    return { safe: false, reason: `Protocol link blocked: ${action.href}` }
  }

  // Block javascript: links
  if (action.href && action.href.startsWith('javascript:')) {
    return { safe: false, reason: 'JavaScript protocol link blocked' }
  }

  return { safe: true }
}

/**
 * Filter a list of actions, removing unsafe ones.
 */
export function filterSafeActions(actions: RLAction[], currentRoute: string): RLAction[] {
  return actions.filter((action) => {
    const result = checkActionSafety(action, currentRoute)
    return result.safe
  })
}

/**
 * Validate that a URL is within the allowed beta domain.
 */
export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_HOSTS.includes(parsed.hostname)
  } catch {
    // Relative URLs are always allowed
    return !url.startsWith('http')
  }
}
