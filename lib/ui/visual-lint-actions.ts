'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { LintRuleCategory, LintRule, LintViolation, LintAuditRun, LintSummary } from './visual-lint-types'

// ---- helpers ----

function fromLintRules(db: any): any {
  return (db as any).from('lint_rules')
}

function fromLintViolations(db: any): any {
  return (db as any).from('lint_violations')
}

function fromLintAuditRuns(db: any): any {
  return (db as any).from('lint_audit_runs')
}

// ---- actions ----

export async function getLintRules(category?: LintRuleCategory): Promise<LintRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromLintRules(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load lint rules: ${error.message}`)
  return (data ?? []).map(mapRule)
}

export async function upsertLintRule(params: {
  name: string
  category: LintRuleCategory
  pattern: string
  severity: 'error' | 'warning' | 'info'
  autoFixable: boolean
  description: string
}): Promise<LintRule> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    name: params.name,
    category: params.category,
    pattern: params.pattern,
    severity: params.severity,
    auto_fixable: params.autoFixable,
    description: params.description,
  }

  const { data, error } = await fromLintRules(db)
    .upsert(payload, { onConflict: 'tenant_id,name' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert lint rule: ${error.message}`)
  return mapRule(data)
}

export async function getLintViolations(
  route?: string,
  resolved?: boolean
): Promise<LintViolation[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromLintViolations(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (route) {
    query = query.eq('route', route)
  }
  if (resolved !== undefined) {
    if (resolved) {
      query = query.not('resolved_at', 'is', null)
    } else {
      query = query.is('resolved_at', null)
    }
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load lint violations: ${error.message}`)
  return (data ?? []).map(mapViolation)
}

export async function createLintViolation(params: {
  ruleId: string
  route: string
  component?: string
  line?: number
  column?: number
  message: string
  autoFixed?: boolean
}): Promise<LintViolation> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    rule_id: params.ruleId,
    route: params.route,
    message: params.message,
  }
  if (params.component !== undefined) payload.component = params.component
  if (params.line !== undefined) payload.line = params.line
  if (params.column !== undefined) payload.column = params.column
  if (params.autoFixed !== undefined) payload.auto_fixed = params.autoFixed

  const { data, error } = await fromLintViolations(db)
    .insert(payload)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create lint violation: ${error.message}`)
  return mapViolation(data)
}

export async function resolveViolation(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromLintViolations(db)
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to resolve violation: ${error.message}`)
}

export async function getAuditRuns(): Promise<LintAuditRun[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromLintAuditRuns(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(`Failed to load audit runs: ${error.message}`)
  return (data ?? []).map(mapAuditRun)
}

export async function getLintSummary(): Promise<LintSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Total rules
  const { data: rules, error: rulesErr } = await fromLintRules(db)
    .select('id')
    .eq('tenant_id', user.tenantId)

  if (rulesErr) throw new Error(`Failed to load rules summary: ${rulesErr.message}`)

  // All violations
  const { data: violations, error: violErr } = await fromLintViolations(db)
    .select('rule_id, resolved_at')
    .eq('tenant_id', user.tenantId)

  if (violErr) throw new Error(`Failed to load violations summary: ${violErr.message}`)

  const totalViolations = (violations ?? []).length
  const unresolvedViolations = (violations ?? []).filter((v: any) => !v.resolved_at).length

  // Top violated rules (by rule_id frequency among unresolved)
  const ruleCounts: Record<string, number> = {}
  for (const v of (violations ?? []).filter((v: any) => !v.resolved_at)) {
    ruleCounts[v.rule_id] = (ruleCounts[v.rule_id] || 0) + 1
  }

  // Fetch rule names for top violated
  const { data: allRules } = await fromLintRules(db)
    .select('id, name')
    .eq('tenant_id', user.tenantId)

  const ruleNameMap: Record<string, string> = {}
  for (const r of allRules ?? []) {
    ruleNameMap[r.id] = r.name
  }

  const topViolatedRules = Object.entries(ruleCounts)
    .map(([ruleId, count]) => ({ ruleName: ruleNameMap[ruleId] || ruleId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Last audit run
  const { data: lastRun } = await fromLintAuditRuns(db)
    .select('created_at')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })
    .limit(1)

  const lastAuditRun = lastRun?.[0]?.created_at ?? null

  return {
    totalRules: (rules ?? []).length,
    totalViolations,
    unresolvedViolations,
    lastAuditRun,
    topViolatedRules,
  }
}

// ---- mappers ----

function mapRule(row: any): LintRule {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    category: row.category,
    pattern: row.pattern ?? '',
    severity: row.severity,
    autoFixable: row.auto_fixable ?? false,
    description: row.description ?? '',
    createdAt: row.created_at,
  }
}

function mapViolation(row: any): LintViolation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ruleId: row.rule_id,
    route: row.route,
    component: row.component ?? '',
    line: row.line ?? 0,
    column: row.column ?? 0,
    message: row.message ?? '',
    autoFixed: row.auto_fixed ?? false,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? null,
  }
}

function mapAuditRun(row: any): LintAuditRun {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    routesScanned: row.routes_scanned ?? 0,
    violationsFound: row.violations_found ?? 0,
    autoFixed: row.auto_fixed ?? 0,
    duration: row.duration ?? 0,
    createdAt: row.created_at,
  }
}
