/**
 * Session Security Enhancements
 *
 * Lists active sessions (via security_events login records) and
 * provides session revocation through the existing account-access system.
 */

import { db } from '@/lib/db'
import { securityEvents } from '@/lib/db/schema/security'
import { eq, desc, and, sql } from 'drizzle-orm'
import { revokeAllSessionsForUser } from '@/lib/auth/account-access'
import { logSecurityEvent } from './audit'

export type ActiveSessionInfo = {
  id: string
  ipAddress: string | null
  userAgent: string | null
  lastSeenAt: Date
  isCurrent: boolean
}

/**
 * Get a list of recent login sessions for the user.
 * Derives "active sessions" from login_success events in security_events.
 * Each unique IP+UA combo within the last 7 days is treated as a session.
 */
export async function getActiveSessions(
  authUserId: string,
  currentIp?: string | null
): Promise<ActiveSessionInfo[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      id: securityEvents.id,
      ipAddress: securityEvents.ipAddress,
      userAgent: securityEvents.userAgent,
      createdAt: securityEvents.createdAt,
    })
    .from(securityEvents)
    .where(
      and(
        eq(securityEvents.authUserId, authUserId),
        eq(securityEvents.eventType, 'login_success'),
        sql`${securityEvents.createdAt} > ${sevenDaysAgo.toISOString()}`
      )
    )
    .orderBy(desc(securityEvents.createdAt))
    .limit(50)

  // Deduplicate by IP+UA, keep most recent
  const seen = new Map<string, ActiveSessionInfo>()

  for (const row of rows) {
    const key = `${row.ipAddress ?? 'unknown'}|${row.userAgent ?? 'unknown'}`
    if (!seen.has(key)) {
      seen.set(key, {
        id: row.id,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        lastSeenAt: row.createdAt,
        isCurrent: currentIp ? row.ipAddress === currentIp : false,
      })
    }
  }

  return Array.from(seen.values())
}

/**
 * Revoke all sessions for the user.
 * Uses the existing session versioning system in account-access.ts,
 * which increments the session version and invalidates all JWTs.
 */
export async function revokeAllSessions(authUserId: string): Promise<void> {
  await revokeAllSessionsForUser(authUserId)

  logSecurityEvent({
    authUserId,
    eventType: 'session_revoked',
    metadata: { scope: 'all_sessions' },
  })
}

/**
 * Session timeout configuration.
 * The JWT maxAge is set in auth-config.ts (currently 7 days).
 * This provides a read-only accessor for UI display.
 */
export const SESSION_CONFIG = {
  /** Maximum session age in days before JWT expires */
  maxAgeDays: 7,
  /** Re-auth required for sensitive actions after this many minutes */
  reauthMaxAgeMinutes: 15,
} as const
