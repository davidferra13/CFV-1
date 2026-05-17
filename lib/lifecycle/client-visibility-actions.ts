'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  VisibilityRule,
  RedactionPolicy,
  VisibilitySummary,
  VisibilityLevel,
  VisibilityEntityType,
  UpsertVisibilityRuleParams,
  UpsertRedactionPolicyParams,
} from './client-visibility-types'

// ---- helpers ----

function fromVisibilityRules(db: any): any {
  return (db as any).from('visibility_rules')
}

function fromRedactionPolicies(db: any): any {
  return (db as any).from('redaction_policies')
}

// ---- actions ----

export async function getVisibilityRules(
  stage?: string,
  entityType?: VisibilityEntityType
): Promise<VisibilityRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromVisibilityRules(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (stage) {
    query = query.eq('lifecycle_stage', stage)
  }
  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load visibility rules: ${error.message}`)
  return (data ?? []).map(mapRule)
}

export async function upsertVisibilityRule(
  params: UpsertVisibilityRuleParams
): Promise<VisibilityRule> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    lifecycle_stage: params.lifecycleStage,
    field_name: params.fieldName,
    entity_type: params.entityType,
    visibility: params.visibility,
  }
  if (params.id) payload.id = params.id
  if (params.redactWith !== undefined) payload.redact_with = params.redactWith
  if (params.reason !== undefined) payload.reason = params.reason

  const { data, error } = await fromVisibilityRules(db)
    .upsert(payload, { onConflict: 'tenant_id,lifecycle_stage,field_name,entity_type' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert visibility rule: ${error.message}`)
  return mapRule(data)
}

export async function deleteVisibilityRule(ruleId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromVisibilityRules(db)
    .delete()
    .eq('id', ruleId)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to delete visibility rule: ${error.message}`)
}

export async function getRedactionPolicies(): Promise<RedactionPolicy[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromRedactionPolicies(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load redaction policies: ${error.message}`)
  return (data ?? []).map(mapPolicy)
}

export async function upsertRedactionPolicy(
  params: UpsertRedactionPolicyParams
): Promise<RedactionPolicy> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    name: params.name,
    rules: params.rules,
    applies_to: params.appliesTo,
  }
  if (params.id) payload.id = params.id
  if (params.description !== undefined) payload.description = params.description
  if (params.active !== undefined) payload.active = params.active

  const { data, error } = await fromRedactionPolicies(db)
    .upsert(payload, { onConflict: 'tenant_id,name' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert redaction policy: ${error.message}`)
  return mapPolicy(data)
}

export async function getVisibilitySummary(): Promise<VisibilitySummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: rules, error: rErr } = await fromVisibilityRules(db)
    .select('field_name, redact_with')
    .eq('tenant_id', user.tenantId)

  if (rErr) throw new Error(`Failed to load visibility summary: ${rErr.message}`)

  const { data: policies, error: pErr } = await fromRedactionPolicies(db)
    .select('active')
    .eq('tenant_id', user.tenantId)

  if (pErr) throw new Error(`Failed to load policy summary: ${pErr.message}`)

  const allRules = rules ?? []
  const allPolicies = policies ?? []

  const uniqueFields = new Set(allRules.map((r: any) => r.field_name))
  const redactedCount = allRules.filter((r: any) => r.redact_with != null).length
  const activeCount = allPolicies.filter((p: any) => p.active === true).length

  return {
    totalRules: allRules.length,
    totalPolicies: allPolicies.length,
    activePolicies: activeCount,
    fieldsCovered: uniqueFields.size,
    redactedFieldCount: redactedCount,
  }
}

// ---- mappers ----

function mapRule(row: any): VisibilityRule {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    lifecycleStage: row.lifecycle_stage,
    fieldName: row.field_name,
    entityType: row.entity_type,
    visibility: row.visibility,
    redactWith: row.redact_with ?? null,
    reason: row.reason ?? null,
    createdAt: new Date(row.created_at),
  }
}

function mapPolicy(row: any): RedactionPolicy {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description ?? null,
    rules: Array.isArray(row.rules) ? row.rules : JSON.parse(row.rules ?? '[]'),
    appliesTo: Array.isArray(row.applies_to) ? row.applies_to : JSON.parse(row.applies_to ?? '[]'),
    active: row.active ?? true,
    createdAt: new Date(row.created_at),
  }
}
