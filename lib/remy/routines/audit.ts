// Remy Routines - Audit logging
// Every routine match, execution, and action event gets logged.
// All writes are tenant-scoped and append-only.

import { createServerClient } from '@/lib/db/server'
import type {
  RoutineTriggerType,
  RoutineExecutionStatus,
  RoutineActionKind,
  RoutineMatchAuditRow,
  RoutineExecutionAuditRow,
  RoutineActionEventRow,
  RoutineActionDef,
} from './types'

// ---- Match Audit ----

export async function logMatchAudit(input: {
  tenant_id: string
  routine_id: string | null
  auth_user_id?: string | null
  trigger_type: RoutineTriggerType
  trigger_source: string
  trigger_key?: string | null
  matched: boolean
  reason: string
  condition_results?: Record<string, unknown> | null
  trigger_context?: Record<string, unknown> | null
}): Promise<RoutineMatchAuditRow> {
  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routine_match_audit')
    .insert({
      tenant_id: input.tenant_id,
      routine_id: input.routine_id,
      auth_user_id: input.auth_user_id ?? null,
      trigger_type: input.trigger_type,
      trigger_source: input.trigger_source,
      trigger_key: input.trigger_key ?? null,
      matched: input.matched,
      reason: input.reason,
      condition_results: input.condition_results ?? null,
      trigger_context: input.trigger_context ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to log match audit: ${error.message}`)
  return data
}

// ---- Execution Audit ----

export async function logExecutionAudit(input: {
  tenant_id: string
  routine_id: string
  execution_id: string
  auth_user_id?: string | null
  status: RoutineExecutionStatus
  request_payload?: Record<string, unknown> | null
  result_payload?: Record<string, unknown> | null
  error_message?: string | null
  started_at: string
  finished_at?: string | null
  duration_ms?: number | null
}): Promise<RoutineExecutionAuditRow> {
  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routine_execution_audit')
    .insert({
      tenant_id: input.tenant_id,
      routine_id: input.routine_id,
      execution_id: input.execution_id,
      auth_user_id: input.auth_user_id ?? null,
      status: input.status,
      request_payload: input.request_payload ?? null,
      result_payload: input.result_payload ?? null,
      error_message: input.error_message ?? null,
      started_at: input.started_at,
      finished_at: input.finished_at ?? null,
      duration_ms: input.duration_ms ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to log execution audit: ${error.message}`)
  return data
}

// ---- Action Event Audit ----

export async function logActionEvent(input: {
  tenant_id: string
  routine_id: string
  execution_id: string
  action: RoutineActionDef
  status: 'success' | 'error'
  error_message?: string | null
}): Promise<RoutineActionEventRow> {
  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routine_action_events')
    .insert({
      tenant_id: input.tenant_id,
      routine_id: input.routine_id,
      execution_id: input.execution_id,
      action_id: input.action.id,
      action_kind: input.action.kind,
      payload: input.action.payload,
      status: input.status,
      error_message: input.error_message ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to log action event: ${error.message}`)
  return data
}

// ---- Query Helpers ----

export async function getMatchAuditForRoutine(
  tenantId: string,
  routineId: string,
  limit = 50
): Promise<RoutineMatchAuditRow[]> {
  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routine_match_audit')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('routine_id', routineId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to query match audit: ${error.message}`)
  return data ?? []
}

export async function getExecutionAuditForRoutine(
  tenantId: string,
  routineId: string,
  limit = 50
): Promise<RoutineExecutionAuditRow[]> {
  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routine_execution_audit')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('routine_id', routineId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to query execution audit: ${error.message}`)
  return data ?? []
}

export async function getActionEventsForExecution(
  tenantId: string,
  executionId: string
): Promise<RoutineActionEventRow[]> {
  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routine_action_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('execution_id', executionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to query action events: ${error.message}`)
  return data ?? []
}

export async function getRecentAuditForTenant(
  tenantId: string,
  limit = 100
): Promise<RoutineExecutionAuditRow[]> {
  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routine_execution_audit')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to query recent audit: ${error.message}`)
  return data ?? []
}
