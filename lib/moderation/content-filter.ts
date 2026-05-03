// Content Moderation Utilities
// Basic profanity/inappropriate content filter for user-generated text.
// Used for circle names, public profile fields, and community content.

// Minimal blocklist of clearly inappropriate terms.
// Kept intentionally small to avoid false positives on food terminology.
const BLOCKED_PATTERNS: RegExp[] = [
  /\b(fuck|shit|ass(?:hole)?|bitch|cunt|dick|cock|pussy|nigger|faggot|retard)\b/i,
  /\b(kill\s+yourself|kys)\b/i,
  /\b(nazi|white\s*power|heil\s*hitler)\b/i,
]

export type ModerationResult = {
  allowed: boolean
  reason?: string
}

/**
 * Check text for clearly inappropriate content.
 * Returns { allowed: true } for clean text.
 * Returns { allowed: false, reason } for blocked content.
 */
export function moderateText(text: string): ModerationResult {
  if (!text || text.trim().length === 0) {
    return { allowed: true }
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { allowed: false, reason: 'Content contains inappropriate language' }
    }
  }

  return { allowed: true }
}

/**
 * Validate a circle/group name specifically.
 * Checks content + length + character constraints.
 */
export function validateCircleName(name: string): ModerationResult {
  const trimmed = name.trim()

  if (trimmed.length < 2) {
    return { allowed: false, reason: 'Name must be at least 2 characters' }
  }

  if (trimmed.length > 100) {
    return { allowed: false, reason: 'Name must be under 100 characters' }
  }

  return moderateText(trimmed)
}
