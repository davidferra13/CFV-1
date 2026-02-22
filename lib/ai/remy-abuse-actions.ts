'use server'

// Remy — Abuse Logging & Auto-Block System
// Logs guardrail violations, auto-blocks repeat offenders, provides admin review.
// ADMIN BYPASS: Admins are never blocked and their messages are never logged as abuse.
//
// NOTE: remy_abuse_log table and chefs.remy_blocked_until column are added via
// migration 20260321000008. Until types/database.ts is regenerated, we use
// type assertions for these queries.

import { requireChef } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase/server'

// ─── Log Abuse Incident ─────────────────────────────────────────────────────

interface LogAbuseParams {
  severity: 'warning' | 'critical'
  category: string
  blockedMessage: string
  guardrailMatched?: string
}

/**
 * Log a guardrail violation to the remy_abuse_log table.
 * If the user has 2+ prior critical incidents, auto-block them for 24 hours.
 *
 * This is a NON-BLOCKING side effect — call with .catch() from the main flow.
 */
export async function logRemyAbuse(params: LogAbuseParams): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Get auth user ID
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) return

  let userBlocked = false

  // Check if auto-block threshold reached (2+ prior critical incidents)
  if (params.severity === 'critical') {
    const { count } = await (supabase as any)
      .from('remy_abuse_log')
      .select('id', { count: 'exact', head: true })
      .eq('auth_user_id', authUser.id)
      .eq('severity', 'critical')

    // 2+ prior criticals (this would be the 3rd+) → auto-block
    if ((count ?? 0) >= 2) {
      const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      await (supabase as any)
        .from('chefs')
        .update({ remy_blocked_until: blockedUntil })
        .eq('id', tenantId)

      userBlocked = true
    }
  }

  // Insert the abuse log entry
  await (supabase as any).from('remy_abuse_log').insert({
    tenant_id: tenantId,
    auth_user_id: authUser.id,
    severity: userBlocked ? 'blocked' : params.severity,
    category: params.category,
    blocked_message: params.blockedMessage.slice(0, 2000),
    guardrail_matched: params.guardrailMatched ?? null,
    user_blocked: userBlocked,
  })
}

// ─── Check If User Is Blocked ───────────────────────────────────────────────

interface BlockStatus {
  blocked: boolean
  until?: string
}

/**
 * Check if the current user is blocked from using Remy.
 * Admins are NEVER blocked — they bypass all guardrails.
 */
export async function isRemyBlocked(): Promise<BlockStatus> {
  // Admin bypass — admins can do whatever they want
  const admin = await isAdmin()
  if (admin) return { blocked: false }

  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const { data } = await (supabase as any)
    .from('chefs')
    .select('remy_blocked_until')
    .eq('id', tenantId)
    .single()

  if (!data?.remy_blocked_until) return { blocked: false }

  const blockedUntil = new Date(data.remy_blocked_until as string)
  if (blockedUntil > new Date()) {
    return { blocked: true, until: blockedUntil.toISOString() }
  }

  return { blocked: false }
}

// ─── Check If Current User Is Admin (for guardrail bypass) ──────────────────

/**
 * Returns true if the current user is an admin.
 * Used by sendRemyMessage() to skip all guardrails for admins.
 */
export async function isRemyAdmin(): Promise<boolean> {
  return isAdmin()
}

// ─── Admin: Get Abuse Log ───────────────────────────────────────────────────

export interface AbuseLogEntry {
  id: string
  severity: string
  category: string
  blockedMessage: string
  guardrailMatched: string | null
  userBlocked: boolean
  reviewedByAdmin: boolean
  createdAt: string
}

/**
 * Get recent abuse log entries for the current tenant.
 * For future admin UI — data is available even before the UI is built.
 */
export async function getRemyAbuseLog(options?: {
  unreviewedOnly?: boolean
  limit?: number
}): Promise<AbuseLogEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  let query = (supabase as any)
    .from('remy_abuse_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50)

  if (options?.unreviewedOnly) {
    query = query.eq('reviewed_by_admin', false)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch abuse log: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    severity: row.severity as string,
    category: row.category as string,
    blockedMessage: row.blocked_message as string,
    guardrailMatched: row.guardrail_matched as string | null,
    userBlocked: row.user_blocked as boolean,
    reviewedByAdmin: row.reviewed_by_admin as boolean,
    createdAt: row.created_at as string,
  }))
}
