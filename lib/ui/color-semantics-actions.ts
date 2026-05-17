'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ColorRole,
  ColorToken,
  ColorViolation,
  ColorSemanticsSummary,
} from './color-semantics-types'

// ---- helpers ----

function fromColorTokens(db: any): any {
  return (db as any).from('color_tokens')
}

function fromColorViolations(db: any): any {
  return (db as any).from('color_violations')
}

// ---- actions ----

export async function getColorTokens(role?: ColorRole): Promise<ColorToken[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromColorTokens(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (role) {
    query = query.eq('role', role)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load color tokens: ${error.message}`)
  return (data ?? []).map(mapToken)
}

export async function upsertColorToken(
  role: ColorRole,
  name: string,
  lightValue: string,
  darkValue: string,
  contrastRatio?: number,
  usage?: string
): Promise<ColorToken> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    role,
    name,
    light_value: lightValue,
    dark_value: darkValue,
  }
  if (contrastRatio !== undefined) payload.contrast_ratio = contrastRatio
  if (usage !== undefined) payload.usage = usage

  const { data, error } = await fromColorTokens(db)
    .upsert(payload, { onConflict: 'tenant_id,name' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert color token: ${error.message}`)
  return mapToken(data)
}

export async function recordColorViolation(
  route: string,
  component: string | undefined,
  violationType: string,
  rawColor: string,
  suggestedToken: string | undefined,
  severity: string
): Promise<ColorViolation> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    route,
    violation_type: violationType,
    raw_color: rawColor,
    severity,
  }
  if (component !== undefined) payload.component = component
  if (suggestedToken !== undefined) payload.suggested_token = suggestedToken

  const { data, error } = await fromColorViolations(db).insert(payload).select('*').single()

  if (error) throw new Error(`Failed to record color violation: ${error.message}`)
  return mapViolation(data)
}

export async function getColorViolations(
  route?: string,
  limit?: number
): Promise<ColorViolation[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromColorViolations(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('resolved', false)
    .order('detected_at', { ascending: false })

  if (route) {
    query = query.eq('route', route)
  }
  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load color violations: ${error.message}`)
  return (data ?? []).map(mapViolation)
}

export async function resolveColorViolation(violationId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromColorViolations(db)
    .update({ resolved: true })
    .eq('id', violationId)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to resolve color violation: ${error.message}`)
}

export async function getColorSemanticsSummary(): Promise<ColorSemanticsSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Token counts by role
  const { data: tokens, error: tokErr } = await fromColorTokens(db)
    .select('role')
    .eq('tenant_id', user.tenantId)

  if (tokErr) throw new Error(`Failed to load token summary: ${tokErr.message}`)

  const byRole: Record<string, number> = {}
  for (const t of tokens ?? []) {
    byRole[t.role] = (byRole[t.role] || 0) + 1
  }

  // Unresolved violation counts
  const { data: violations, error: violErr } = await fromColorViolations(db)
    .select('route')
    .eq('tenant_id', user.tenantId)
    .eq('resolved', false)

  if (violErr) throw new Error(`Failed to load violation summary: ${violErr.message}`)

  const routeCounts: Record<string, number> = {}
  for (const v of violations ?? []) {
    routeCounts[v.route] = (routeCounts[v.route] || 0) + 1
  }

  const topViolatingRoutes = Object.entries(routeCounts)
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalTokens: (tokens ?? []).length,
    byRole,
    totalViolations: (violations ?? []).length,
    topViolatingRoutes,
  }
}

// ---- mappers ----

function mapToken(row: any): ColorToken {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    role: row.role,
    name: row.name,
    lightValue: row.light_value,
    darkValue: row.dark_value,
    contrastRatio: row.contrast_ratio ?? null,
    usage: row.usage ?? null,
    createdAt: new Date(row.created_at),
  }
}

function mapViolation(row: any): ColorViolation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    component: row.component ?? null,
    violationType: row.violation_type,
    rawColor: row.raw_color,
    suggestedToken: row.suggested_token ?? null,
    severity: row.severity,
    resolved: row.resolved ?? false,
    detectedAt: new Date(row.detected_at),
  }
}
