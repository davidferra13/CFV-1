import { pgClient } from '@/lib/db'
import type { RailResolverResult } from './types'

// ---------------------------------------------------------------------------
// Admin Universal Rail Data Resolver
// System-scoped. Surfaces platform health, user signups, abuse reports,
// pending approvals, and financial alerts to admin users.
// ---------------------------------------------------------------------------

export async function resolveAdminRailData(
  _userId: string,
  _tenantId: string | undefined
): Promise<RailResolverResult> {
  const result: RailResolverResult = {}

  // Resolve each group independently - one failure must not block others
  const [sysHealth, signups, abuse, approvals, billing] = await Promise.all([
    resolveSystemHealth(),
    resolveUserSignups(),
    resolveAbuseReports(),
    resolvePendingApprovals(),
    resolveFinancialAlerts(),
  ])

  Object.assign(result, sysHealth, signups, abuse, approvals, billing)
  return result
}

// ---------------------------------------------------------------------------
// Group 1: System Health
// ---------------------------------------------------------------------------

async function resolveSystemHealth(): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const rows = await pgClient`
      SELECT status, duration_ms, created_at, build_id
      FROM build_times_log
      ORDER BY created_at DESC
      LIMIT 1
    `
    const latest = rows[0] as
      | { status: string; duration_ms: number; created_at: string; build_id: string }
      | undefined

    if (latest) {
      result['admin.system-health.build-status'] = {
        status: latest.status,
        durationMs: latest.duration_ms,
        buildId: latest.build_id,
        createdAt: latest.created_at,
      }

      const ageHours = (Date.now() - new Date(latest.created_at).getTime()) / 3_600_000
      result['admin.system-health.deploy-status'] = {
        commitShort: latest.build_id?.slice(0, 7) ?? 'unknown',
        ageHours: Math.round(ageHours),
      }
    }
  } catch (err) {
    console.error('[resolveAdminRailData] system-health group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 2: User Signups
// ---------------------------------------------------------------------------

async function resolveUserSignups(): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const since = new Date(Date.now() - 86_400_000).toISOString() // last 24h
    const rows = await pgClient`
      SELECT COUNT(*)::int AS new_count
      FROM auth.users
      WHERE created_at >= ${since}
    `
    const newCount = (rows[0] as { new_count: number } | undefined)?.new_count ?? 0
    if (newCount > 0) {
      result['admin.user-mgmt.new-signup'] = { count: newCount }
    }

    const unverifiedRows = await pgClient`
      SELECT COUNT(*)::int AS pending_count
      FROM auth.users
      WHERE email_confirmed_at IS NULL
        AND created_at >= ${new Date(Date.now() - 7 * 86_400_000).toISOString()}
    `
    const pendingCount =
      (unverifiedRows[0] as { pending_count: number } | undefined)?.pending_count ?? 0
    if (pendingCount > 0) {
      result['admin.user-mgmt.pending-email-verification'] = { count: pendingCount }
    }
  } catch (err) {
    console.error('[resolveAdminRailData] signups group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 3: Abuse / Safety
// ---------------------------------------------------------------------------

async function resolveAbuseReports(): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const rows = await pgClient`
      SELECT COUNT(*)::int AS open_count
      FROM abuse_reports
      WHERE status = 'open'
    `
    const openCount = (rows[0] as { open_count: number } | undefined)?.open_count ?? 0
    if (openCount > 0) {
      result['admin.safety.abuse-report-open'] = { count: openCount }
    }
  } catch (err) {
    console.error('[resolveAdminRailData] abuse group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 4: Pending Approvals
// ---------------------------------------------------------------------------

async function resolvePendingApprovals(): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const [chefApps, partnerAgreements] = await Promise.all([
      pgClient`
        SELECT COUNT(*)::int AS count
        FROM chef_applications
        WHERE status = 'pending'
      `.catch(() => [{ count: 0 }]),
      pgClient`
        SELECT COUNT(*)::int AS count
        FROM partner_agreements
        WHERE status = 'pending_review'
      `.catch(() => [{ count: 0 }]),
    ])

    const chefCount = (chefApps[0] as { count: number } | undefined)?.count ?? 0
    const partnerCount = (partnerAgreements[0] as { count: number } | undefined)?.count ?? 0

    if (chefCount > 0) {
      result['admin.chef-mgmt.application-pending'] = { count: chefCount }
    }
    if (partnerCount > 0) {
      result['admin.partner-mgmt.agreement-pending-review'] = { count: partnerCount }
    }
  } catch (err) {
    console.error('[resolveAdminRailData] approvals group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 5: Financial Alerts
// ---------------------------------------------------------------------------

async function resolveFinancialAlerts(): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const since = new Date(Date.now() - 86_400_000).toISOString()
    const rows = await pgClient`
      SELECT type, COUNT(*)::int AS count
      FROM stripe_events
      WHERE type IN ('payment_intent.payment_failed', 'charge.refund.created')
        AND created_at >= ${since}
      GROUP BY type
    `
    for (const row of rows as unknown as { type: string; count: number }[]) {
      if (row.type === 'payment_intent.payment_failed') {
        result['admin.billing.failed-payment'] = { count: row.count }
      }
      if (row.type === 'charge.refund.created') {
        result['admin.billing.refund-requested'] = { count: row.count }
      }
    }
  } catch (err) {
    console.error('[resolveAdminRailData] billing group failed:', err)
  }
  return result
}
