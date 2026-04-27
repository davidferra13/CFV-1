'use server'

/**
 * Admin Abuse Summary - Read-only queries for Remy abuse log visibility.
 * Founder-only (same gate as Remy Control Center).
 */

import { requireAdmin } from '@/lib/auth/admin'
import { isFounderEmail } from '@/lib/platform/owner-account'
import { redirect } from 'next/navigation'
import { pgClient as sql } from '@/lib/db'

export interface AbuseSummary {
  violations24h: number
  violations7d: number
  blockedUsers: Array<{
    tenantId: string
    businessName: string | null
    blockedUntil: string
  }>
  topCategories: Array<{
    category: string
    count: number
  }>
  recentViolations: Array<{
    id: string
    tenantId: string
    severity: string
    category: string
    blockedMessage: string
    guardrailMatched: string | null
    createdAt: string
  }>
}

export async function getAbuseSummary(): Promise<AbuseSummary> {
  const admin = await requireAdmin()
  if (!isFounderEmail(admin.email)) {
    redirect('/unauthorized')
  }

  // Run all queries in parallel
  const [violations24h, violations7d, blockedUsers, topCategories, recentViolations] =
    await Promise.all([
      // Count violations in last 24 hours
      sql`
        SELECT COUNT(*)::int as count
        FROM remy_abuse_log
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `.then((rows: any[]) => rows[0]?.count ?? 0),

      // Count violations in last 7 days
      sql`
        SELECT COUNT(*)::int as count
        FROM remy_abuse_log
        WHERE created_at > NOW() - INTERVAL '7 days'
      `.then((rows: any[]) => rows[0]?.count ?? 0),

      // Currently blocked users
      sql`
        SELECT c.id as tenant_id, c.business_name, c.remy_blocked_until
        FROM chefs c
        WHERE c.remy_blocked_until IS NOT NULL
          AND c.remy_blocked_until > NOW()
        ORDER BY c.remy_blocked_until DESC
        LIMIT 20
      `.then((rows: any[]) =>
        rows.map((r: any) => ({
          tenantId: r.tenant_id,
          businessName: r.business_name,
          blockedUntil: r.remy_blocked_until,
        }))
      ),

      // Top violation categories (last 7 days)
      sql`
        SELECT category, COUNT(*)::int as count
        FROM remy_abuse_log
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY category
        ORDER BY count DESC
        LIMIT 10
      `.then((rows: any[]) =>
        rows.map((r: any) => ({
          category: r.category,
          count: r.count,
        }))
      ),

      // Recent critical/blocked violations (last 10)
      sql`
        SELECT id, tenant_id, severity, category,
               LEFT(blocked_message, 100) as blocked_message,
               guardrail_matched, created_at
        FROM remy_abuse_log
        WHERE severity IN ('critical', 'blocked')
        ORDER BY created_at DESC
        LIMIT 10
      `.then((rows: any[]) =>
        rows.map((r: any) => ({
          id: r.id,
          tenantId: r.tenant_id,
          severity: r.severity,
          category: r.category,
          blockedMessage: r.blocked_message,
          guardrailMatched: r.guardrail_matched,
          createdAt: r.created_at,
        }))
      ),
    ])

  return {
    violations24h,
    violations7d,
    blockedUsers,
    topCategories,
    recentViolations,
  }
}
