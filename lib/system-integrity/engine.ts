'use server'

// System Integrity Interrogation - Diagnostic Engine
// Runs checks against the database to find data inconsistencies,
// orphaned records, missing relationships, and configuration gaps.

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db/index'
import type { IntegrityCheck, IntegrityReport, CheckStatus, FindingSeverity } from './types'

// ---- Check Runner Helper ----

async function runCheck(
  id: string,
  name: string,
  category: IntegrityCheck['category'],
  description: string,
  severity: FindingSeverity,
  checker: () => Promise<{ count: number; detail: string | null; ids: string[] }>
): Promise<IntegrityCheck> {
  const start = Date.now()
  try {
    const { count, detail, ids } = await checker()
    return {
      id,
      name,
      category,
      description,
      status: count === 0 ? 'pass' : (severity === 'critical' ? 'fail' : 'warn'),
      severity,
      issueCount: count,
      detail: count === 0 ? null : detail,
      affectedIds: ids.slice(0, 20),
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      id,
      name,
      category,
      description,
      status: 'skip',
      severity: 'info',
      issueCount: 0,
      detail: `Check failed: ${err instanceof Error ? err.message : String(err)}`,
      affectedIds: [],
      durationMs: Date.now() - start,
    }
  }
}

// ---- Checks ----

async function checkOrphanedEvents(tenantId: string): Promise<IntegrityCheck> {
  return runCheck(
    'orphaned_events',
    'Orphaned Events',
    'data_consistency',
    'Events with no valid client reference',
    'warning',
    async () => {
      const rows = await pgClient`
        SELECT e.id FROM events e
        LEFT JOIN clients c ON c.id = e.client_id AND c.tenant_id = ${tenantId}
        WHERE e.tenant_id = ${tenantId}
          AND e.client_id IS NOT NULL
          AND c.id IS NULL
          AND e.deleted_at IS NULL
        LIMIT 20
      `
      return {
        count: rows.length,
        detail: rows.length > 0 ? `${rows.length} events reference missing clients` : null,
        ids: rows.map((r: any) => r.id),
      }
    }
  )
}

async function checkOrphanedQuotes(tenantId: string): Promise<IntegrityCheck> {
  return runCheck(
    'orphaned_quotes',
    'Orphaned Quotes',
    'data_consistency',
    'Quotes with no valid client or event reference',
    'warning',
    async () => {
      const rows = await pgClient`
        SELECT q.id FROM quotes q
        LEFT JOIN clients c ON c.id = q.client_id AND c.tenant_id = ${tenantId}
        WHERE q.tenant_id = ${tenantId}
          AND q.client_id IS NOT NULL
          AND c.id IS NULL
        LIMIT 20
      `
      return {
        count: rows.length,
        detail: rows.length > 0 ? `${rows.length} quotes reference missing clients` : null,
        ids: rows.map((r: any) => r.id),
      }
    }
  )
}

async function checkStaleEvents(tenantId: string): Promise<IntegrityCheck> {
  return runCheck(
    'stale_events',
    'Stale Draft Events',
    'event_lifecycle',
    'Draft events older than 30 days with no activity',
    'info',
    async () => {
      const rows = await pgClient`
        SELECT id FROM events
        WHERE tenant_id = ${tenantId}
          AND status = 'draft'
          AND deleted_at IS NULL
          AND created_at < NOW() - INTERVAL '30 days'
          AND updated_at < NOW() - INTERVAL '30 days'
        LIMIT 20
      `
      return {
        count: rows.length,
        detail: rows.length > 0 ? `${rows.length} drafts stale for 30+ days` : null,
        ids: rows.map((r: any) => r.id),
      }
    }
  )
}

async function checkLedgerOrphans(tenantId: string): Promise<IntegrityCheck> {
  return runCheck(
    'ledger_orphans',
    'Orphaned Ledger Entries',
    'financial',
    'Ledger entries with no valid event reference',
    'critical',
    async () => {
      const rows = await pgClient`
        SELECT le.id FROM ledger_entries le
        LEFT JOIN events e ON e.id = le.event_id AND e.tenant_id = ${tenantId}
        WHERE le.tenant_id = ${tenantId}
          AND le.event_id IS NOT NULL
          AND e.id IS NULL
        LIMIT 20
      `
      return {
        count: rows.length,
        detail: rows.length > 0 ? `${rows.length} ledger entries reference missing events` : null,
        ids: rows.map((r: any) => r.id),
      }
    }
  )
}

async function checkExpenseOrphans(tenantId: string): Promise<IntegrityCheck> {
  return runCheck(
    'expense_orphans',
    'Unattributed Expenses',
    'financial',
    'Expenses with NULL event reference (possibly orphaned)',
    'warning',
    async () => {
      const rows = await pgClient`
        SELECT id FROM expenses
        WHERE tenant_id = ${tenantId}
          AND event_id IS NULL
        LIMIT 20
      `
      return {
        count: rows.length,
        detail: rows.length > 0 ? `${rows.length} expenses not linked to any event` : null,
        ids: rows.map((r: any) => r.id),
      }
    }
  )
}

async function checkDuplicateClients(tenantId: string): Promise<IntegrityCheck> {
  return runCheck(
    'duplicate_clients',
    'Potential Duplicate Clients',
    'client_data',
    'Clients sharing the same email address',
    'warning',
    async () => {
      const rows = await pgClient`
        SELECT email, COUNT(*) AS cnt
        FROM clients
        WHERE tenant_id = ${tenantId}
          AND email IS NOT NULL
          AND email != ''
          AND deleted_at IS NULL
        GROUP BY email
        HAVING COUNT(*) > 1
        LIMIT 20
      `
      const totalDupes = rows.reduce((sum: number, r: any) => sum + Number(r.cnt), 0)
      return {
        count: rows.length,
        detail: rows.length > 0 ? `${rows.length} emails shared by ${totalDupes} clients` : null,
        ids: [],
      }
    }
  )
}

async function checkClientsWithoutEvents(tenantId: string): Promise<IntegrityCheck> {
  return runCheck(
    'clients_no_events',
    'Clients With No Events',
    'client_data',
    'Active clients that have never been linked to an event',
    'info',
    async () => {
      const rows = await pgClient`
        SELECT c.id FROM clients c
        LEFT JOIN events e ON e.client_id = c.id AND e.tenant_id = ${tenantId} AND e.deleted_at IS NULL
        WHERE c.tenant_id = ${tenantId}
          AND c.deleted_at IS NULL
          AND e.id IS NULL
        LIMIT 50
      `
      return {
        count: rows.length,
        detail: rows.length > 0 ? `${rows.length} clients have no events` : null,
        ids: rows.map((r: any) => r.id).slice(0, 20),
      }
    }
  )
}

async function checkSoftDeleteLeaks(tenantId: string): Promise<IntegrityCheck> {
  return runCheck(
    'soft_delete_leaks',
    'Soft-Delete Consistency',
    'cascade_safety',
    'Deleted clients still referenced by active events',
    'critical',
    async () => {
      const rows = await pgClient`
        SELECT e.id FROM events e
        JOIN clients c ON c.id = e.client_id AND c.tenant_id = ${tenantId}
        WHERE e.tenant_id = ${tenantId}
          AND e.deleted_at IS NULL
          AND e.status NOT IN ('cancelled', 'completed')
          AND c.deleted_at IS NOT NULL
        LIMIT 20
      `
      return {
        count: rows.length,
        detail: rows.length > 0 ? `${rows.length} active events reference deleted clients` : null,
        ids: rows.map((r: any) => r.id),
      }
    }
  )
}

async function checkCompletedEventsWithBalance(tenantId: string): Promise<IntegrityCheck> {
  return runCheck(
    'completed_with_balance',
    'Completed Events With Outstanding Balance',
    'financial',
    'Completed events where payment does not match the quote',
    'warning',
    async () => {
      const rows = await pgClient`
        SELECT e.id, e.quoted_price_cents,
               COALESCE(
                 (SELECT SUM(amount_cents) FROM ledger_entries le
                  WHERE le.event_id = e.id AND le.entry_type = 'payment'),
                 0
               ) AS paid_cents
        FROM events e
        WHERE e.tenant_id = ${tenantId}
          AND e.status = 'completed'
          AND e.deleted_at IS NULL
          AND e.quoted_price_cents > 0
        HAVING e.quoted_price_cents > COALESCE(
          (SELECT SUM(amount_cents) FROM ledger_entries le
           WHERE le.event_id = e.id AND le.entry_type = 'payment'),
          0
        )
        LIMIT 20
      `
      return {
        count: rows.length,
        detail: rows.length > 0 ? `${rows.length} completed events have unpaid balance` : null,
        ids: rows.map((r: any) => r.id),
      }
    }
  )
}

async function checkMissingContractEvents(tenantId: string): Promise<IntegrityCheck> {
  return runCheck(
    'events_no_contract',
    'Upcoming Events Without Contracts',
    'event_lifecycle',
    'Confirmed/accepted events in the next 30 days with no signed contract',
    'warning',
    async () => {
      const rows = await pgClient`
        SELECT e.id FROM events e
        LEFT JOIN contracts ct ON ct.event_id = e.id AND ct.tenant_id = ${tenantId} AND ct.status = 'signed'
        WHERE e.tenant_id = ${tenantId}
          AND e.status IN ('accepted', 'confirmed')
          AND e.deleted_at IS NULL
          AND e.event_date >= CURRENT_DATE
          AND e.event_date <= CURRENT_DATE + INTERVAL '30 days'
          AND ct.id IS NULL
        LIMIT 20
      `
      return {
        count: rows.length,
        detail: rows.length > 0 ? `${rows.length} upcoming events lack signed contracts` : null,
        ids: rows.map((r: any) => r.id),
      }
    }
  )
}

// ---- Public API ----

/**
 * Run the full system integrity interrogation.
 * All checks run in parallel; failures are isolated per check.
 */
export async function runIntegrityInterrogation(): Promise<IntegrityReport> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const start = Date.now()

  const checks = await Promise.all([
    checkOrphanedEvents(tenantId),
    checkOrphanedQuotes(tenantId),
    checkStaleEvents(tenantId),
    checkLedgerOrphans(tenantId),
    checkExpenseOrphans(tenantId),
    checkDuplicateClients(tenantId),
    checkClientsWithoutEvents(tenantId),
    checkSoftDeleteLeaks(tenantId),
    checkCompletedEventsWithBalance(tenantId),
    checkMissingContractEvents(tenantId),
  ])

  const totalIssues = checks.reduce((sum, c) => sum + c.issueCount, 0)
  const criticalCount = checks.filter((c) => c.status === 'fail' && c.severity === 'critical').length
  const warningCount = checks.filter((c) => c.status === 'warn').length
  const passCount = checks.filter((c) => c.status === 'pass').length
  const totalChecks = checks.length

  // Score: 100 - (critical * 15) - (warnings * 5), clamped to 0-100
  const healthScore = Math.max(
    0,
    Math.min(100, Math.round((passCount / totalChecks) * 100 - criticalCount * 15 - warningCount * 5))
  )

  return {
    checks,
    healthScore,
    totalIssues,
    criticalCount,
    warningCount,
    generatedAt: new Date().toISOString(),
    totalDurationMs: Date.now() - start,
  }
}
