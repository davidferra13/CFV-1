/**
 * Security Events Audit Log
 *
 * Non-blocking, fire-and-forget logging of security-relevant events.
 * Never logs sensitive data (passwords, tokens, full phone numbers).
 */

import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { securityEvents } from '@/lib/db/schema/security'
import { eq, desc, and } from 'drizzle-orm'
import { getClientIp } from '@/lib/geo/ip-api'

export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'phone_added'
  | 'phone_removed'
  | 'phone_verified'
  | 'email_changed'
  | 'password_changed'
  | 'recovery_code_used'
  | 'session_revoked'
  | 'sensitive_action_reauth'
  | 'account_locked'
  | 'account_unlocked'
  | 'data_exported'
  | 'client_data_accessed'

export type SecurityEvent = {
  id: string
  authUserId: string | null
  eventType: string
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown>
  createdAt: Date
}

/**
 * Extract IP address and user-agent from Next.js request headers.
 * Safe to call in server components and server actions.
 */
export async function extractRequestContext(): Promise<{
  ipAddress: string | null
  userAgent: string | null
}> {
  try {
    const h = await headers()
    return {
      ipAddress: getClientIp(h),
      userAgent: h.get('user-agent'),
    }
  } catch {
    return { ipAddress: null, userAgent: null }
  }
}

/**
 * Mask a phone number for safe logging: +1978***1234
 */
export function maskPhoneNumber(phone: string): string {
  if (phone.length <= 6) return '***'
  const prefix = phone.slice(0, 4)
  const suffix = phone.slice(-4)
  return `${prefix}***${suffix}`
}

/**
 * Log a security event. Non-blocking: errors are caught silently.
 * Never awaited in the critical path.
 */
export function logSecurityEvent(event: {
  authUserId?: string
  eventType: SecurityEventType
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}): void {
  // Fire and forget
  db.insert(securityEvents)
    .values({
      authUserId: event.authUserId ?? null,
      eventType: event.eventType,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      metadata: event.metadata ?? {},
    })
    .catch((err) => {
      console.error('[security-audit] Failed to log event:', err)
    })
}

/**
 * Log a security event with auto-extracted request context.
 * Convenience wrapper that reads IP/UA from Next.js headers.
 */
export async function logSecurityEventWithContext(event: {
  authUserId?: string
  eventType: SecurityEventType
  metadata?: Record<string, unknown>
}): Promise<void> {
  const ctx = await extractRequestContext()
  logSecurityEvent({
    ...event,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  })
}

/**
 * Fetch security events for a user, optionally filtered by type.
 */
export async function getSecurityEvents(
  authUserId: string,
  options?: { limit?: number; type?: SecurityEventType }
): Promise<SecurityEvent[]> {
  const conditions = [eq(securityEvents.authUserId, authUserId)]

  if (options?.type) {
    conditions.push(eq(securityEvents.eventType, options.type))
  }

  const rows = await db
    .select()
    .from(securityEvents)
    .where(and(...conditions))
    .orderBy(desc(securityEvents.createdAt))
    .limit(options?.limit ?? 50)

  return rows.map((row) => ({
    id: row.id,
    authUserId: row.authUserId,
    eventType: row.eventType,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
  }))
}

/**
 * Get last 10 login events (successes and failures) for a user.
 */
export async function getRecentLoginActivity(authUserId: string): Promise<SecurityEvent[]> {
  const rows = await db
    .select()
    .from(securityEvents)
    .where(
      and(
        eq(securityEvents.authUserId, authUserId)
        // Filter to login-related events using SQL IN via or
      )
    )
    .orderBy(desc(securityEvents.createdAt))
    .limit(20)

  // Filter in JS since drizzle inArray on text is simpler this way
  const loginTypes = new Set([
    'login_success',
    'login_failed',
    'session_revoked',
    'account_locked',
    'account_unlocked',
  ])
  return rows
    .filter((row) => loginTypes.has(row.eventType))
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      authUserId: row.authUserId,
      eventType: row.eventType,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.createdAt,
    }))
}
