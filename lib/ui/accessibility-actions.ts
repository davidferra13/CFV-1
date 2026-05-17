'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  A11yCategory,
  A11ySeverity,
  A11yAuditEntry,
  A11yRouteScore,
  A11ySummary,
} from './accessibility-types'

// ---------------------------------------------------------------------------
// 1. getA11yAuditEntries - list entries with optional route/category filter
// ---------------------------------------------------------------------------
export async function getA11yAuditEntries(
  route?: string,
  category?: A11yCategory
): Promise<A11yAuditEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let idx = 2
  let query = 'SELECT * FROM a11y_audit_entries WHERE tenant_id = $1'
  if (route) {
    query += ` AND route = $${idx++}`
    params.push(route)
  }
  if (category) {
    query += ` AND category = $${idx++}`
    params.push(category)
  }
  query += ' ORDER BY created_at DESC'
  const rows = await db.query(query, params)
  return rows.map(mapAuditEntry)
}

// ---------------------------------------------------------------------------
// 2. createA11yAuditEntry - log a new accessibility issue
// ---------------------------------------------------------------------------
export async function createA11yAuditEntry(params: {
  route: string
  category: A11yCategory
  element: string
  issue: string
  severity: A11ySeverity
  wcagCriterion?: string
  recommendation?: string
}): Promise<A11yAuditEntry> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO a11y_audit_entries
       (tenant_id, route, category, element, issue, severity, wcag_criterion, recommendation)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      user.tenantId,
      params.route,
      params.category,
      params.element,
      params.issue,
      params.severity,
      params.wcagCriterion ?? null,
      params.recommendation ?? null,
    ]
  )
  return mapAuditEntry(rows[0])
}

// ---------------------------------------------------------------------------
// 3. resolveA11yEntry - mark an issue as resolved
// ---------------------------------------------------------------------------
export async function resolveA11yEntry(id: string): Promise<A11yAuditEntry> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `UPDATE a11y_audit_entries
     SET resolved_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [id, user.tenantId]
  )
  if (!rows.length) throw new Error('Entry not found')
  return mapAuditEntry(rows[0])
}

// ---------------------------------------------------------------------------
// 4. getA11yRouteScores - list all route scores
// ---------------------------------------------------------------------------
export async function getA11yRouteScores(): Promise<A11yRouteScore[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'SELECT * FROM a11y_route_scores WHERE tenant_id = $1 ORDER BY overall_score ASC',
    [user.tenantId]
  )
  return rows.map(mapRouteScore)
}

// ---------------------------------------------------------------------------
// 5. upsertA11yRouteScore - create or update a route score
// ---------------------------------------------------------------------------
export async function upsertA11yRouteScore(params: {
  route: string
  keyboardScore: number
  focusScore: number
  ariaScore: number
  overallScore: number
}): Promise<A11yRouteScore> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO a11y_route_scores
       (tenant_id, route, keyboard_score, focus_score, aria_score, overall_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, route)
     DO UPDATE SET
       keyboard_score = $3,
       focus_score = $4,
       aria_score = $5,
       overall_score = $6,
       audited_at = NOW()
     RETURNING *`,
    [
      user.tenantId,
      params.route,
      params.keyboardScore,
      params.focusScore,
      params.ariaScore,
      params.overallScore,
    ]
  )
  return mapRouteScore(rows[0])
}

// ---------------------------------------------------------------------------
// 6. getA11ySummary - aggregate summary stats
// ---------------------------------------------------------------------------
export async function getA11ySummary(): Promise<A11ySummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const issueRows = await db.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE resolved_at IS NULL)::int AS unresolved,
       COUNT(*) FILTER (WHERE severity = 'critical' AND resolved_at IS NULL)::int AS critical
     FROM a11y_audit_entries
     WHERE tenant_id = $1`,
    [user.tenantId]
  )

  const catRows = await db.query(
    `SELECT category, COUNT(*)::int AS cnt
     FROM a11y_audit_entries
     WHERE tenant_id = $1 AND resolved_at IS NULL
     GROUP BY category`,
    [user.tenantId]
  )

  const scoreRows = await db.query(
    `SELECT COUNT(*)::int AS routes_audited, COALESCE(AVG(overall_score), 0)::int AS avg_score
     FROM a11y_route_scores
     WHERE tenant_id = $1`,
    [user.tenantId]
  )

  const breakdown: Record<string, number> = {}
  for (const r of catRows) {
    breakdown[r.category] = r.cnt
  }

  return {
    totalIssues: issueRows[0]?.total ?? 0,
    unresolvedIssues: issueRows[0]?.unresolved ?? 0,
    routesAudited: scoreRows[0]?.routes_audited ?? 0,
    avgScore: scoreRows[0]?.avg_score ?? 0,
    criticalCount: issueRows[0]?.critical ?? 0,
    categoryBreakdown: breakdown as A11ySummary['categoryBreakdown'],
  }
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------
function mapAuditEntry(r: any): A11yAuditEntry {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    category: r.category as A11yCategory,
    element: r.element,
    issue: r.issue,
    severity: r.severity as A11ySeverity,
    wcagCriterion: r.wcag_criterion ?? null,
    recommendation: r.recommendation ?? null,
    resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
    createdAt: new Date(r.created_at),
  }
}

function mapRouteScore(r: any): A11yRouteScore {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    keyboardScore: r.keyboard_score ?? 0,
    focusScore: r.focus_score ?? 0,
    ariaScore: r.aria_score ?? 0,
    overallScore: r.overall_score ?? 0,
    auditedAt: new Date(r.audited_at),
  }
}
