'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  GuardrailCategory,
  GuardrailRule,
  GuardrailViolation,
  GuardrailSummary,
} from './style-guardrails-types'

/**
 * List guardrail rules, optionally filtered by category.
 */
export async function getGuardrailRules(
  category?: GuardrailCategory
): Promise<GuardrailRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('guardrail_rules')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load guardrail rules: ${error.message}`)

  return (data ?? []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    category: r.category as GuardrailCategory,
    name: r.name,
    description: r.description,
    pattern: r.pattern,
    severity: r.severity as GuardrailRule['severity'],
    active: r.active,
    createdAt: r.created_at,
  }))
}

/**
 * Create or update a guardrail rule.
 * Upserts by (tenantId, category, name).
 */
export async function upsertGuardrailRule(
  category: GuardrailCategory,
  name: string,
  description: string,
  pattern: string,
  severity: 'error' | 'warning' | 'info' = 'warning'
): Promise<GuardrailRule> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check for existing rule with same tenant + category + name
  const { data: existing } = await db
    .from('guardrail_rules')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('category', category)
    .eq('name', name)
    .maybeSingle()

  if (existing) {
    const { data, error } = await db
      .from('guardrail_rules')
      .update({ description, pattern, severity })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) throw new Error(`Failed to update guardrail rule: ${error.message}`)

    return mapRule(data)
  }

  const { data, error } = await db
    .from('guardrail_rules')
    .insert({
      tenant_id: user.tenantId!,
      category,
      name,
      description,
      pattern,
      severity,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create guardrail rule: ${error.message}`)

  return mapRule(data)
}

/**
 * Record a style violation.
 */
export async function recordViolation(
  ruleId: string,
  route: string,
  component: string,
  details: string,
  autoFixable: boolean = false
): Promise<GuardrailViolation> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('guardrail_violations')
    .insert({
      tenant_id: user.tenantId!,
      rule_id: ruleId,
      route,
      component,
      details,
      auto_fixable: autoFixable,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to record violation: ${error.message}`)

  return mapViolation(data)
}

/**
 * List violations, optionally filtered by ruleId and/or route.
 */
export async function getViolations(
  ruleId?: string,
  route?: string,
  limit: number = 50
): Promise<GuardrailViolation[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('guardrail_violations')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('detected_at', { ascending: false })
    .limit(limit)

  if (ruleId) query = query.eq('rule_id', ruleId)
  if (route) query = query.eq('route', route)

  const { data, error } = await query
  if (error) throw new Error(`Failed to load violations: ${error.message}`)

  return (data ?? []).map(mapViolation)
}

/**
 * Mark a violation as fixed.
 */
export async function markViolationFixed(
  violationId: string
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('guardrail_violations')
    .update({ fixed_at: new Date().toISOString() })
    .eq('id', violationId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to mark violation fixed: ${error.message}`)
}

/**
 * Aggregate guardrail stats for the tenant.
 */
export async function getGuardrailSummary(): Promise<GuardrailSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: rules, error: rulesErr } = await db
    .from('guardrail_rules')
    .select('category, severity, active')
    .eq('tenant_id', user.tenantId!)

  if (rulesErr) throw new Error(`Failed to load rules for summary: ${rulesErr.message}`)

  const { data: violations, error: violErr } = await db
    .from('guardrail_violations')
    .select('rule_id, auto_fixable, fixed_at')
    .eq('tenant_id', user.tenantId!)
    .is('fixed_at', null)

  if (violErr) throw new Error(`Failed to load violations for summary: ${violErr.message}`)

  const allRules = rules ?? []
  const openViolations = violations ?? []

  const byCategory: Record<string, number> = {
    spacing: 0, color: 0, typography: 0, border: 0,
    shadow: 0, animation: 0, layout: 0,
  }
  const bySeverity: Record<string, number> = { error: 0, warning: 0, info: 0 }

  for (const r of allRules) {
    if (r.active && byCategory[r.category] !== undefined) {
      byCategory[r.category]++
    }
  }

  for (const r of allRules) {
    if (bySeverity[r.severity] !== undefined) {
      bySeverity[r.severity]++
    }
  }

  return {
    totalRules: allRules.length,
    activeRules: allRules.filter((r: any) => r.active).length,
    totalViolations: openViolations.length,
    byCategory: byCategory as GuardrailSummary['byCategory'],
    bySeverity: bySeverity as GuardrailSummary['bySeverity'],
    autoFixableCount: openViolations.filter((v: any) => v.auto_fixable).length,
  }
}

// --- Mappers ---

function mapRule(r: any): GuardrailRule {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    category: r.category as GuardrailCategory,
    name: r.name,
    description: r.description,
    pattern: r.pattern,
    severity: r.severity,
    active: r.active,
    createdAt: r.created_at,
  }
}

function mapViolation(v: any): GuardrailViolation {
  return {
    id: v.id,
    tenantId: v.tenant_id,
    ruleId: v.rule_id,
    route: v.route,
    component: v.component,
    details: v.details,
    autoFixable: v.auto_fixable,
    fixedAt: v.fixed_at,
    detectedAt: v.detected_at,
  }
}
