'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getRecentLoginActivity, type SecurityEvent } from './audit'
import { getActiveSessions, revokeAllSessions, type ActiveSessionInfo } from './session'
import { getClientIp } from '@/lib/geo/ip-api'
import { revalidatePath } from 'next/cache'

export type SecuritySettingsData = {
  recentLogins: SecurityEvent[]
  activeSessions: ActiveSessionInfo[]
  mfaEnabled: boolean
  phoneCount: number
}

/**
 * Load security settings data for the current user.
 */
export async function getSecuritySettingsData(): Promise<SecuritySettingsData | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const h = await headers()
  const currentIp = getClientIp(h)

  const [recentLogins, activeSessions, mfaStatus, phoneStatus] = await Promise.all([
    getRecentLoginActivity(session.user.id),
    getActiveSessions(session.user.id, currentIp),
    checkMfaStatus(session.user.id),
    getPhoneCount(session.user.id),
  ])

  return {
    recentLogins,
    activeSessions,
    mfaEnabled: mfaStatus,
    phoneCount: phoneStatus,
  }
}

/**
 * Revoke all sessions for the current user.
 */
export async function revokeAllSessionsAction(): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    await revokeAllSessions(session.user.id)
    revalidatePath('/settings/security')
    return { success: true }
  } catch (err) {
    console.error('[security-settings] Failed to revoke sessions:', err)
    return { success: false, error: 'Failed to revoke sessions' }
  }
}

/**
 * Check if the user has MFA enabled.
 * Checks the user_mfa_methods table from Phase 2 (gracefully handles missing table).
 */
async function checkMfaStatus(authUserId: string): Promise<boolean> {
  try {
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')
    const result = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM user_mfa_methods
      WHERE auth_user_id = ${authUserId} AND is_active = true
    `)
    const rows = result as unknown as Array<{ cnt: number | string }>
    return Number(rows[0]?.cnt ?? 0) > 0
  } catch {
    // Table may not exist yet (Phase 2 not deployed)
    return false
  }
}

/**
 * Count verified phone numbers for the user.
 * Checks the phone_numbers table from Phase 1 (gracefully handles missing table).
 */
async function getPhoneCount(authUserId: string): Promise<number> {
  try {
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')
    // Phone numbers are linked to entities, not directly to auth users.
    // We need to find the entity for this auth user first.
    const result = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM phone_numbers pn
      JOIN user_roles ur ON ur.entity_id = pn.entity_id
      WHERE ur.auth_user_id = ${authUserId}
        AND pn.verified_at IS NOT NULL
        AND pn.deleted_at IS NULL
    `)
    const rows = result as unknown as Array<{ cnt: number | string }>
    return Number(rows[0]?.cnt ?? 0)
  } catch {
    // Table may not exist yet (Phase 1 not deployed)
    return 0
  }
}
