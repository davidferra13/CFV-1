'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  AgeBracket,
  WaitingAgeConfig,
  OwnerLanguageRule,
  WaitingAgeSummary,
} from './waiting-age-types'

// ---- helpers ----

function fromConfigs(db: any): any {
  return (db as any).from('waiting_age_configs')
}

function fromRules(db: any): any {
  return (db as any).from('owner_language_rules')
}

// ---- actions ----

export async function getWaitingAgeConfigs(stage?: string): Promise<WaitingAgeConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromConfigs(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (stage) {
    query = query.eq('lifecycle_stage', stage)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load waiting age configs: ${error.message}`)
  return (data ?? []).map(mapConfig)
}

export async function upsertWaitingAgeConfig(params: {
  lifecycleStage: string
  bracket: AgeBracket
  minDays: number
  maxDays?: number | null
  label: string
  color: string
  icon?: string | null
  escalationAction?: string | null
}): Promise<WaitingAgeConfig> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    lifecycle_stage: params.lifecycleStage,
    bracket: params.bracket,
    min_days: params.minDays,
    label: params.label,
    color: params.color,
  }
  if (params.maxDays !== undefined) payload.max_days = params.maxDays
  if (params.icon !== undefined) payload.icon = params.icon
  if (params.escalationAction !== undefined) payload.escalation_action = params.escalationAction

  const { data, error } = await fromConfigs(db)
    .upsert(payload, { onConflict: 'tenant_id,lifecycle_stage,bracket' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert waiting age config: ${error.message}`)
  return mapConfig(data)
}

export async function getOwnerLanguageRules(stage?: string): Promise<OwnerLanguageRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromRules(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (stage) {
    query = query.eq('lifecycle_stage', stage)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load owner language rules: ${error.message}`)
  return (data ?? []).map(mapRule)
}

export async function upsertOwnerLanguageRule(params: {
  id?: string
  lifecycleStage: string
  ageBracket: AgeBracket
  ownerType: 'chef' | 'client' | 'vendor' | 'system'
  messageTemplate: string
  tone: 'neutral' | 'urgent' | 'friendly' | 'formal'
}): Promise<OwnerLanguageRule> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    lifecycle_stage: params.lifecycleStage,
    age_bracket: params.ageBracket,
    owner_type: params.ownerType,
    message_template: params.messageTemplate,
    tone: params.tone,
  }
  if (params.id) payload.id = params.id

  const { data, error } = await fromRules(db).upsert(payload).select('*').single()

  if (error) throw new Error(`Failed to upsert owner language rule: ${error.message}`)
  return mapRule(data)
}

export async function deleteOwnerLanguageRule(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromRules(db).delete().eq('id', id).eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to delete owner language rule: ${error.message}`)
}

export async function getWaitingAgeSummary(): Promise<WaitingAgeSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: configs, error: cfgErr } = await fromConfigs(db)
    .select('lifecycle_stage, bracket')
    .eq('tenant_id', user.tenantId)

  if (cfgErr) throw new Error(`Failed to load config summary: ${cfgErr.message}`)

  const { data: rules, error: ruleErr } = await fromRules(db)
    .select('id')
    .eq('tenant_id', user.tenantId)

  if (ruleErr) throw new Error(`Failed to load rule summary: ${ruleErr.message}`)

  const stagesSet = new Set<string>()
  const byBracket: Record<string, number> = {
    fresh: 0,
    normal: 0,
    aging: 0,
    stale: 0,
    critical: 0,
  }

  for (const c of configs ?? []) {
    stagesSet.add(c.lifecycle_stage)
    byBracket[c.bracket] = (byBracket[c.bracket] || 0) + 1
  }

  return {
    totalConfigs: (configs ?? []).length,
    totalLanguageRules: (rules ?? []).length,
    stagesCovered: Array.from(stagesSet),
    itemsByBracket: byBracket as Record<AgeBracket, number>,
  }
}

// ---- mappers ----

function mapConfig(row: any): WaitingAgeConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    lifecycleStage: row.lifecycle_stage,
    bracket: row.bracket,
    minDays: row.min_days,
    maxDays: row.max_days ?? null,
    label: row.label,
    color: row.color,
    icon: row.icon ?? null,
    escalationAction: row.escalation_action ?? null,
    createdAt: new Date(row.created_at),
  }
}

function mapRule(row: any): OwnerLanguageRule {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    lifecycleStage: row.lifecycle_stage,
    ageBracket: row.age_bracket,
    ownerType: row.owner_type,
    messageTemplate: row.message_template,
    tone: row.tone,
    createdAt: new Date(row.created_at),
  }
}
