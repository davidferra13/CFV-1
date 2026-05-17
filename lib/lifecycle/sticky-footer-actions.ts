'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  FooterActionType,
  StickyFooterConfig,
  StickyFooterOverride,
  StickyFooterSummary,
} from './sticky-footer-types'

// ---- helpers ----

function fromConfigs(db: any): any {
  return (db as any).from('sticky_footer_configs')
}

function fromOverrides(db: any): any {
  return (db as any).from('sticky_footer_overrides')
}

// ---- actions ----

export async function getStickyFooterConfigs(stage?: string): Promise<StickyFooterConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromConfigs(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('sort_order', { ascending: true })

  if (stage) {
    query = query.eq('lifecycle_stage', stage)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load sticky footer configs: ${error.message}`)
  return (data ?? []).map(mapConfig)
}

export async function upsertStickyFooterConfig(params: {
  id?: string
  lifecycleStage: string
  actionLabel: string
  actionType: FooterActionType
  icon?: string
  targetRoute?: string
  sortOrder?: number
  showBadge?: boolean
  badgeCount?: number
  visible?: boolean
}): Promise<StickyFooterConfig> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    lifecycle_stage: params.lifecycleStage,
    action_label: params.actionLabel,
    action_type: params.actionType,
  }
  if (params.id !== undefined) payload.id = params.id
  if (params.icon !== undefined) payload.icon = params.icon
  if (params.targetRoute !== undefined) payload.target_route = params.targetRoute
  if (params.sortOrder !== undefined) payload.sort_order = params.sortOrder
  if (params.showBadge !== undefined) payload.show_badge = params.showBadge
  if (params.badgeCount !== undefined) payload.badge_count = params.badgeCount
  if (params.visible !== undefined) payload.visible = params.visible

  const { data, error } = await fromConfigs(db)
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert sticky footer config: ${error.message}`)
  return mapConfig(data)
}

export async function getStickyFooterOverrides(eventId?: string): Promise<StickyFooterOverride[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromOverrides(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load sticky footer overrides: ${error.message}`)
  return (data ?? []).map(mapOverride)
}

export async function upsertStickyFooterOverride(params: {
  id?: string
  eventId: string
  lifecycleStage: string
  configId: string
  overrideLabel?: string
  overrideAction?: string
  visible?: boolean
}): Promise<StickyFooterOverride> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    event_id: params.eventId,
    lifecycle_stage: params.lifecycleStage,
    config_id: params.configId,
  }
  if (params.id !== undefined) payload.id = params.id
  if (params.overrideLabel !== undefined) payload.override_label = params.overrideLabel
  if (params.overrideAction !== undefined) payload.override_action = params.overrideAction
  if (params.visible !== undefined) payload.visible = params.visible

  const { data, error } = await fromOverrides(db)
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert sticky footer override: ${error.message}`)
  return mapOverride(data)
}

export async function deleteStickyFooterConfig(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromConfigs(db).delete().eq('id', id).eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to delete sticky footer config: ${error.message}`)
}

export async function getStickyFooterSummary(): Promise<StickyFooterSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: configs, error: cfgErr } = await fromConfigs(db)
    .select('lifecycle_stage')
    .eq('tenant_id', user.tenantId)

  if (cfgErr) throw new Error(`Failed to load config summary: ${cfgErr.message}`)

  const { data: overrides, error: ovrErr } = await fromOverrides(db)
    .select('id')
    .eq('tenant_id', user.tenantId)

  if (ovrErr) throw new Error(`Failed to load override summary: ${ovrErr.message}`)

  const stages = new Set<string>()
  const stageCounts: Record<string, number> = {}
  for (const c of configs ?? []) {
    stages.add(c.lifecycle_stage)
    stageCounts[c.lifecycle_stage] = (stageCounts[c.lifecycle_stage] || 0) + 1
  }

  const stageList = Array.from(stages)
  const totalConfigs = (configs ?? []).length
  const avgActionsPerStage =
    stageList.length > 0 ? Math.round((totalConfigs / stageList.length) * 100) / 100 : 0

  return {
    totalConfigs,
    totalOverrides: (overrides ?? []).length,
    stagesCovered: stageList,
    avgActionsPerStage,
  }
}

// ---- mappers ----

function mapConfig(row: any): StickyFooterConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    lifecycleStage: row.lifecycle_stage,
    actionLabel: row.action_label,
    actionType: row.action_type,
    icon: row.icon ?? null,
    targetRoute: row.target_route ?? null,
    sortOrder: row.sort_order ?? 0,
    showBadge: row.show_badge ?? false,
    badgeCount: row.badge_count ?? null,
    visible: row.visible ?? true,
    createdAt: new Date(row.created_at),
  }
}

function mapOverride(row: any): StickyFooterOverride {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    lifecycleStage: row.lifecycle_stage,
    configId: row.config_id,
    overrideLabel: row.override_label ?? null,
    overrideAction: row.override_action ?? null,
    visible: row.visible ?? true,
    createdAt: new Date(row.created_at),
  }
}
