'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  RailStage,
  RailProgress,
  RailProgressStatus,
  RailNavShortcut,
  RailSummary,
} from './rail-navigation-types'

// ---- helpers ----

function fromRailStages(db: any): any {
  return (db as any).from('rail_stages')
}

function fromRailProgress(db: any): any {
  return (db as any).from('rail_progress')
}

function fromRailNavShortcuts(db: any): any {
  return (db as any).from('rail_nav_shortcuts')
}

// ---- actions ----

export async function getRailStages(): Promise<RailStage[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromRailStages(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to load rail stages: ${error.message}`)
  return (data ?? []).map(mapStage)
}

export async function upsertRailStage(params: {
  stageName: string
  label: string
  icon?: string | null
  sortOrder: number
  color?: string | null
  completionCriteria?: Record<string, unknown> | null
}): Promise<RailStage> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    stage_name: params.stageName,
    label: params.label,
    sort_order: params.sortOrder,
  }
  if (params.icon !== undefined) payload.icon = params.icon
  if (params.color !== undefined) payload.color = params.color
  if (params.completionCriteria !== undefined) payload.completion_criteria = params.completionCriteria

  const { data, error } = await fromRailStages(db)
    .upsert(payload, { onConflict: 'tenant_id,stage_name' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert rail stage: ${error.message}`)
  return mapStage(data)
}

export async function getRailProgress(eventId: string): Promise<RailProgress[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromRailProgress(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to load rail progress: ${error.message}`)
  return (data ?? []).map(mapProgress)
}

export async function updateRailProgress(
  eventId: string,
  stageId: string,
  status: RailProgressStatus
): Promise<RailProgress> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    event_id: eventId,
    stage_id: stageId,
    status,
  }

  if (status === 'completed') {
    payload.completed_at = new Date().toISOString()
    payload.completion_percent = 100
  }

  const { data, error } = await fromRailProgress(db)
    .upsert(payload, { onConflict: 'tenant_id,event_id,stage_id' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update rail progress: ${error.message}`)
  return mapProgress(data)
}

export async function getRailNavShortcuts(): Promise<RailNavShortcut[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromRailNavShortcuts(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('stage_name', { ascending: true })

  if (error) throw new Error(`Failed to load rail nav shortcuts: ${error.message}`)
  return (data ?? []).map(mapShortcut)
}

export async function getRailSummary(eventId: string): Promise<RailSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch all stages for this tenant
  const { data: stages, error: stageErr } = await fromRailStages(db)
    .select('id, stage_name, sort_order')
    .eq('tenant_id', user.tenantId)
    .order('sort_order', { ascending: true })

  if (stageErr) throw new Error(`Failed to load stages for summary: ${stageErr.message}`)

  // Fetch progress for this event
  const { data: progress, error: progErr } = await fromRailProgress(db)
    .select('stage_id, status, completion_percent')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)

  if (progErr) throw new Error(`Failed to load progress for summary: ${progErr.message}`)

  const totalStages = (stages ?? []).length
  const progressMap = new Map<string, { status: string; completionPercent: number }>()
  for (const p of progress ?? []) {
    progressMap.set(p.stage_id, { status: p.status, completionPercent: p.completion_percent ?? 0 })
  }

  let completedStages = 0
  let currentStage: string | null = null
  let totalPercent = 0

  for (const s of stages ?? []) {
    const prog = progressMap.get(s.id)
    if (prog) {
      totalPercent += prog.completionPercent
      if (prog.status === 'completed') {
        completedStages++
      } else if (prog.status === 'active' && !currentStage) {
        currentStage = s.stage_name
      }
    }
    // First stage with no progress at all becomes current if nothing active yet
    if (!prog && !currentStage) {
      currentStage = s.stage_name
    }
  }

  const completionPercent = totalStages > 0 ? Math.round(totalPercent / totalStages) : 0

  return {
    eventId,
    totalStages,
    completedStages,
    currentStage,
    completionPercent,
    estimatedCompletion: null,
  }
}

export async function upsertRailNavShortcut(params: {
  stageName: string
  shortcutLabel: string
  targetRoute: string
  hotkey?: string | null
}): Promise<RailNavShortcut> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    stage_name: params.stageName,
    shortcut_label: params.shortcutLabel,
    target_route: params.targetRoute,
  }
  if (params.hotkey !== undefined) payload.hotkey = params.hotkey

  const { data, error } = await fromRailNavShortcuts(db)
    .insert(payload)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert rail nav shortcut: ${error.message}`)
  return mapShortcut(data)
}

export async function deleteRailNavShortcut(shortcutId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromRailNavShortcuts(db)
    .delete()
    .eq('id', shortcutId)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to delete rail nav shortcut: ${error.message}`)
}

// ---- mappers ----

function mapStage(row: any): RailStage {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    stageName: row.stage_name,
    label: row.label,
    icon: row.icon ?? null,
    sortOrder: row.sort_order,
    color: row.color ?? null,
    completionCriteria: row.completion_criteria ?? null,
    createdAt: new Date(row.created_at),
  }
}

function mapProgress(row: any): RailProgress {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    stageId: row.stage_id,
    status: row.status,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    completionPercent: row.completion_percent ?? 0,
    blockers: row.blockers ?? [],
    createdAt: new Date(row.created_at),
  }
}

function mapShortcut(row: any): RailNavShortcut {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    stageName: row.stage_name,
    shortcutLabel: row.shortcut_label,
    targetRoute: row.target_route,
    hotkey: row.hotkey ?? null,
    createdAt: new Date(row.created_at),
  }
}
