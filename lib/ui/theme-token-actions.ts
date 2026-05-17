'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ThemeToken,
  ThemeTokenCategory,
  ThemeConsistencyIssue,
  ThemeConsistencyIssueType,
  ThemeConsistencyIssueSeverity,
  ThemeMode,
  ThemeTokenSummary,
} from './theme-token-types'

export async function getThemeTokens(category?: ThemeTokenCategory): Promise<ThemeToken[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM theme_tokens WHERE tenant_id = $1'
  if (category) {
    query += ' AND category = $2'
    params.push(category)
  }
  query += ' ORDER BY category, token_name'
  const rows = await db.query(query, params)
  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    tokenName: r.token_name,
    category: r.category as ThemeTokenCategory,
    lightValue: r.light_value,
    darkValue: r.dark_value,
    description: r.description,
    inheritsFrom: r.inherits_from,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }))
}

export async function upsertThemeToken(params: {
  tokenName: string
  category: ThemeTokenCategory
  lightValue: string
  darkValue?: string | null
  description?: string | null
  inheritsFrom?: string | null
}): Promise<ThemeToken> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO theme_tokens (tenant_id, token_name, category, light_value, dark_value, description, inherits_from)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tenant_id, token_name)
     DO UPDATE SET category = $3, light_value = $4, dark_value = $5, description = $6, inherits_from = $7, updated_at = now()
     RETURNING *`,
    [
      user.tenantId,
      params.tokenName,
      params.category,
      params.lightValue,
      params.darkValue ?? null,
      params.description ?? null,
      params.inheritsFrom ?? null,
    ],
  )
  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    tokenName: r.token_name,
    category: r.category as ThemeTokenCategory,
    lightValue: r.light_value,
    darkValue: r.dark_value,
    description: r.description,
    inheritsFrom: r.inherits_from,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }
}

export async function getConsistencyIssues(resolved?: boolean): Promise<ThemeConsistencyIssue[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM theme_consistency_issues WHERE tenant_id = $1'
  if (resolved === true) {
    query += ' AND resolved_at IS NOT NULL'
  } else if (resolved === false) {
    query += ' AND resolved_at IS NULL'
  }
  query += ' ORDER BY created_at DESC'
  const rows = await db.query(query, params)
  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    tokenName: r.token_name,
    mode: r.mode as ThemeMode,
    issue: r.issue as ThemeConsistencyIssueType,
    severity: r.severity as ThemeConsistencyIssueSeverity,
    route: r.route,
    resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
    createdAt: new Date(r.created_at),
  }))
}

export async function createConsistencyIssue(params: {
  tokenName: string
  mode: ThemeMode
  issue: ThemeConsistencyIssueType
  severity: ThemeConsistencyIssueSeverity
  route?: string | null
}): Promise<ThemeConsistencyIssue> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO theme_consistency_issues (tenant_id, token_name, mode, issue, severity, route)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      user.tenantId,
      params.tokenName,
      params.mode,
      params.issue,
      params.severity,
      params.route ?? null,
    ],
  )
  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    tokenName: r.token_name,
    mode: r.mode as ThemeMode,
    issue: r.issue as ThemeConsistencyIssueType,
    severity: r.severity as ThemeConsistencyIssueSeverity,
    route: r.route,
    resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
    createdAt: new Date(r.created_at),
  }
}

export async function resolveConsistencyIssue(id: string): Promise<ThemeConsistencyIssue> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `UPDATE theme_consistency_issues SET resolved_at = now() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [id, user.tenantId],
  )
  if (!rows.length) throw new Error('Issue not found')
  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    tokenName: r.token_name,
    mode: r.mode as ThemeMode,
    issue: r.issue as ThemeConsistencyIssueType,
    severity: r.severity as ThemeConsistencyIssueSeverity,
    route: r.route,
    resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
    createdAt: new Date(r.created_at),
  }
}

export async function getThemeTokenSummary(): Promise<ThemeTokenSummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tokenRows = await db.query(
    'SELECT category, COUNT(*)::int as cnt FROM theme_tokens WHERE tenant_id = $1 GROUP BY category',
    [user.tenantId],
  )
  const categoryDistribution: Record<string, number> = {} as any
  let totalTokens = 0
  for (const r of tokenRows) {
    categoryDistribution[r.category] = r.cnt
    totalTokens += r.cnt
  }
  const issueRows = await db.query(
    `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE resolved_at IS NULL)::int as unresolved FROM theme_consistency_issues WHERE tenant_id = $1`,
    [user.tenantId],
  )
  const totalIssues = issueRows[0]?.total ?? 0
  const unresolvedIssues = issueRows[0]?.unresolved ?? 0
  const consistencyScore = totalTokens > 0
    ? Math.round(((totalTokens - unresolvedIssues) / totalTokens) * 100)
    : 100
  return {
    totalTokens,
    totalIssues,
    unresolvedIssues,
    categoryDistribution: categoryDistribution as ThemeTokenSummary['categoryDistribution'],
    consistencyScore,
  }
}
