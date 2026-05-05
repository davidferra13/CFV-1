/**
 * SMS Content Policy
 *
 * Ensures sensitive data never leaks through SMS messages.
 * Addresses are truncated, payment amounts stripped, guest lists omitted.
 * All SMS should link to the portal for full details.
 */

const APP_NAME = 'ChefFlow'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

/**
 * Sanitize SMS content based on context.
 * - Never include full addresses (truncate to city/state)
 * - Never include payment amounts
 * - Never include full guest lists
 * - Event reminders: date + occasion only
 * - Verification codes: just the code + app name
 */
export function sanitizeSmsContent(
  content: string,
  context: 'alert' | 'verification' | 'reminder'
): string {
  let sanitized = content

  // Strip anything that looks like a street address (number + street name pattern)
  sanitized = sanitized.replace(
    /\d+\s+[\w\s]+(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place|Cir|Circle)\b[^,]*/gi,
    '[address hidden]'
  )

  // Strip dollar amounts
  sanitized = sanitized.replace(/\$[\d,]+\.?\d*/g, '[amount hidden]')

  // Strip lists of names (3+ names separated by commas or "and")
  sanitized = sanitized.replace(
    /(?:[A-Z][a-z]+(?:\s[A-Z][a-z]+)?(?:,\s*)){2,}(?:and\s+)?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/g,
    '[guest list hidden]'
  )

  if (context === 'verification') {
    // For verification, strip everything except the code
    const codeMatch = sanitized.match(/\b\d{4,8}\b/)
    if (codeMatch) {
      return `Your ${APP_NAME} verification code is: ${codeMatch[0]}`
    }
  }

  // Enforce max length for SMS (160 chars for single segment)
  if (sanitized.length > 155) {
    sanitized = sanitized.slice(0, 152) + '...'
  }

  return sanitized.trim()
}

/**
 * Generate a portal link for SMS messages.
 * Keeps SMS short by linking to the full-detail web view.
 */
export function buildPortalLink(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${BASE_URL}${cleanPath}`
}

/**
 * Pre-approved SMS templates for common messages.
 * Use these instead of building ad-hoc SMS content.
 */
export const SMS_TEMPLATES = {
  /** Phone verification code */
  verificationCode: (code: string) =>
    `Your ${APP_NAME} verification code is: ${code}. Do not share this code.`,

  /** Event reminder for chef */
  eventReminder: (date: string, occasion: string) =>
    `${APP_NAME} reminder: You have "${occasion}" on ${date}. ${buildPortalLink('/dashboard')}`,

  /** Event reminder for client */
  clientEventReminder: (date: string, occasion: string) =>
    `Reminder: Your "${occasion}" is on ${date}. View details: ${buildPortalLink('/my-events')}`,

  /** Login alert */
  loginAlert: (location: string) =>
    `${APP_NAME} security: New sign-in detected from ${location}. Not you? ${buildPortalLink('/settings/security')}`,

  /** Password changed confirmation */
  passwordChanged: () =>
    `${APP_NAME}: Your password was just changed. If this was not you, contact support immediately.`,

  /** MFA enabled confirmation */
  mfaEnabled: () => `${APP_NAME}: Two-factor authentication has been enabled on your account.`,

  /** Session revoked alert */
  sessionRevoked: () =>
    `${APP_NAME}: All sessions on your account have been signed out. Sign in again to continue.`,

  /** Stale phone re-verification prompt */
  reverifyPhone: () =>
    `${APP_NAME}: Please re-verify your phone number. ${buildPortalLink('/settings/security')}`,
} as const
