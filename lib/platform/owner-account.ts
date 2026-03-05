import 'server-only'

// Platform owner account. This should remain stable even if env vars are misconfigured.
export const FOUNDER_EMAIL = 'davidferra13@gmail.com'
export const DEFAULT_ADMIN_NOTIFICATION_EMAIL = 'info@cheflowhq.com'

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function parseEmailList(value: string | undefined): string[] {
  return (value ?? '').split(',').map(normalizeEmail).filter(Boolean)
}

function uniqueEmails(values: string[]): string[] {
  return Array.from(new Set(values))
}

export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return normalizeEmail(email) === FOUNDER_EMAIL
}

/**
 * Admin auth allowlist.
 * Env-driven, but always includes founder account as a hard safety baseline.
 */
export function getAdminEmails(): string[] {
  return uniqueEmails([...parseEmailList(process.env.ADMIN_EMAILS), FOUNDER_EMAIL])
}

/**
 * Platform notification recipients for owner/admin events.
 * Combines notification-specific env vars with admin allowlist and hard fallbacks.
 */
export function getAdminNotificationRecipients(): string[] {
  return uniqueEmails([
    ...parseEmailList(process.env.ADMIN_NOTIFICATION_EMAILS),
    ...parseEmailList(process.env.ADMIN_NOTIFICATION_EMAIL),
    ...getAdminEmails(),
    DEFAULT_ADMIN_NOTIFICATION_EMAIL,
  ])
}
