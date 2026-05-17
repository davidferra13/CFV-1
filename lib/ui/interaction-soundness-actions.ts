'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  InteractionRule,
  InteractionAudit,
  InteractionSummary,
  InteractionState,
} from './interaction-soundness-types'

// ---- helpers ----

function fromInteractionRules(db: any): any {
  return (db as any).from('interaction_rules')
}

function fromInteractionAudits(db: any): any {
  return (db as any).from('interaction_audits')
}

// ---- actions ----

export async function getInteractionRules(
  component?: string
): Promise<InteractionRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromInteractionRules(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (component) {
    query = query.eq('component', component)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load interaction rules: ${error.message}`)
  return (data ?? []).map(mapRule)
}

export async function upsertInteractionRule(params: {
  component: string
  interactionState: InteractionState
  cssProperty: string
  value: string
  transition?: string
  description?: string
}): Promise<InteractionRule> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    component: params.component,
    interaction_state: params.interactionState,
    css_property: params.cssProperty,
    value: params.value,
  }
  if (params.transition !== undefined) payload.transition = params.transition
  if (params.description !== undefined) payload.description = params.description

  const { data, error } = await fromInteractionRules(db)
    .upsert(payload, {
      onConflict: 'tenant_id,component,interaction_state,css_property',
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert interaction rule: ${error.message}`)
  return mapRule(data)
}

export async function getInteractionAudits(
  route?: string
): Promise<InteractionAudit[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromInteractionAudits(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('audited_at', { ascending: false })

  if (route) {
    query = query.eq('route', route)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load interaction audits: ${error.message}`)
  return (data ?? []).map(mapAudit)
}

export async function createInteractionAudit(params: {
  route: string
  component: string
  missingStates: string[]
  score: number
  notes?: string
}): Promise<InteractionAudit> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    route: params.route,
    component: params.component,
    missing_states: params.missingStates,
    score: params.score,
  }
  if (params.notes !== undefined) payload.notes = params.notes

  const { data, error } = await fromInteractionAudits(db)
    .insert(payload)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create interaction audit: ${error.message}`)
  return mapAudit(data)
}

export async function deleteInteractionRule(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromInteractionRules(db)
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to delete interaction rule: ${error.message}`)
}

export async function getInteractionSummary(): Promise<InteractionSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch all rules for component count
  const { data: rules, error: ruleErr } = await fromInteractionRules(db)
    .select('component')
    .eq('tenant_id', user.tenantId)

  if (ruleErr) throw new Error(`Failed to load rule summary: ${ruleErr.message}`)

  const uniqueComponents = new Set((rules ?? []).map((r: any) => r.component))

  // Fetch all audits for score + missing state counts
  const { data: audits, error: auditErr } = await fromInteractionAudits(db)
    .select('score,missing_states')
    .eq('tenant_id', user.tenantId)

  if (auditErr) throw new Error(`Failed to load audit summary: ${auditErr.message}`)

  const auditList = audits ?? []
  const totalScore = auditList.reduce(
    (sum: number, a: any) => sum + (a.score ?? 0),
    0
  )
  const avgScore = auditList.length > 0 ? Math.round(totalScore / auditList.length) : 0

  const missingStateCounts: Record<string, number> = {}
  for (const a of auditList) {
    const states: string[] = a.missing_states ?? []
    for (const s of states) {
      missingStateCounts[s] = (missingStateCounts[s] || 0) + 1
    }
  }

  return {
    totalRules: (rules ?? []).length,
    totalAudits: auditList.length,
    avgScore,
    componentsCovered: uniqueComponents.size,
    missingStateCounts,
  }
}

// ---- mappers ----

function mapRule(row: any): InteractionRule {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    component: row.component,
    interactionState: row.interaction_state,
    cssProperty: row.css_property,
    value: row.value,
    transition: row.transition ?? null,
    description: row.description ?? null,
    createdAt: new Date(row.created_at),
  }
}

function mapAudit(row: any): InteractionAudit {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    component: row.component,
    missingStates: row.missing_states ?? [],
    score: row.score ?? 0,
    notes: row.notes ?? null,
    auditedAt: new Date(row.audited_at),
    createdAt: new Date(row.created_at),
  }
}
