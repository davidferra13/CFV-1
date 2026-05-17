'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  OperatingState,
  OperatingStateLog,
  OperatingStateSummary,
  CreateOperatingStateLogParams,
  UpdateOperatingStateParams,
  ServicePhase,
  TeamMember,
  EquipmentItem,
} from './operating-state-types'

// ---- helpers ----

function fromStates(db: any): any {
  return (db as any).from('operating_states')
}

function fromLogs(db: any): any {
  return (db as any).from('operating_state_logs')
}

// ---- actions ----

export async function getOperatingState(eventId: string): Promise<OperatingState | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromStates(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load operating state: ${error.message}`)
  if (!data) return null
  return mapState(data)
}

export async function updateOperatingState(
  eventId: string,
  params: UpdateOperatingStateParams
): Promise<OperatingState> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    event_id: eventId,
    updated_at: new Date().toISOString(),
  }

  if (params.phase !== undefined) payload.phase = params.phase
  if (params.activeTasks !== undefined) payload.active_tasks = JSON.stringify(params.activeTasks)
  if (params.teamMembers !== undefined) payload.team_members = JSON.stringify(params.teamMembers)
  if (params.equipmentStatus !== undefined)
    payload.equipment_status = JSON.stringify(params.equipmentStatus)
  if (params.notes !== undefined) payload.notes = params.notes

  // Upsert: create if not exists, update if exists
  const upsertPayload = {
    ...payload,
    started_at: new Date().toISOString(),
  }

  const { data, error } = await fromStates(db)
    .upsert(upsertPayload, { onConflict: 'tenant_id,event_id' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update operating state: ${error.message}`)
  return mapState(data)
}

export async function getOperatingStateLogs(eventId: string): Promise<OperatingStateLog[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromLogs(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load operating state logs: ${error.message}`)
  return (data ?? []).map(mapLog)
}

export async function createOperatingStateLog(
  params: CreateOperatingStateLogParams
): Promise<OperatingStateLog> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    event_id: params.eventId,
    to_phase: params.toPhase,
  }
  if (params.fromPhase !== undefined) payload.from_phase = params.fromPhase
  if (params.changedBy !== undefined) payload.changed_by = params.changedBy
  if (params.reason !== undefined) payload.reason = params.reason

  const { data, error } = await fromLogs(db).insert(payload).select('*').single()

  if (error) throw new Error(`Failed to create operating state log: ${error.message}`)
  return mapLog(data)
}

export async function getActiveEvents(): Promise<OperatingState[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromStates(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .neq('phase', 'complete')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to load active events: ${error.message}`)
  return (data ?? []).map(mapState)
}

export async function getOperatingStateSummary(
  eventId: string
): Promise<OperatingStateSummary | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get current state
  const { data: state, error: stateErr } = await fromStates(db)
    .select('phase, updated_at')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (stateErr) throw new Error(`Failed to load state for summary: ${stateErr.message}`)
  if (!state) return null

  // Get log entries for transition count and duration calculation
  const { data: logs, error: logErr } = await fromLogs(db)
    .select('from_phase, to_phase, created_at')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (logErr) throw new Error(`Failed to load logs for summary: ${logErr.message}`)

  const totalTransitions = (logs ?? []).length

  // Calculate average phase duration from sequential log timestamps
  let avgPhaseDurationMinutes: number | null = null
  if (logs && logs.length >= 2) {
    let totalMs = 0
    for (let i = 1; i < logs.length; i++) {
      const prev = new Date(logs[i - 1].created_at).getTime()
      const curr = new Date(logs[i].created_at).getTime()
      totalMs += curr - prev
    }
    avgPhaseDurationMinutes = Math.round((totalMs / (logs.length - 1) / 60000) * 10) / 10
  }

  return {
    eventId,
    currentPhase: state.phase as ServicePhase,
    totalTransitions,
    avgPhaseDurationMinutes,
    lastUpdated: new Date(state.updated_at),
  }
}

// ---- mappers ----

function mapState(row: any): OperatingState {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    phase: row.phase as ServicePhase,
    activeTasks: parseJsonArray<string>(row.active_tasks),
    teamMembers: parseJsonArray<TeamMember>(row.team_members),
    equipmentStatus: parseJsonArray<EquipmentItem>(row.equipment_status),
    notes: row.notes ?? null,
    startedAt: new Date(row.started_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapLog(row: any): OperatingStateLog {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    fromPhase: (row.from_phase as ServicePhase) ?? null,
    toPhase: row.to_phase as ServicePhase,
    changedBy: row.changed_by ?? null,
    reason: row.reason ?? null,
    createdAt: new Date(row.created_at),
  }
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}
