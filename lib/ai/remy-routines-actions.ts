'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { toSafeJsonb } from '@/lib/ai/remy-action-audit-core'
import { matchRemyRoutinesForTenant } from '@/lib/ai/remy-routines-matcher'
import {
  approveRemyRoutineExecutionForTenant,
  executeRemyRoutineForTenant,
} from '@/lib/ai/remy-routines-executor'
import type {
  RemyRoutine,
  RemyRoutineCreateInput,
  RemyRoutineExecutionAuditEntry,
  RemyRoutineExecutionResult,
  RemyRoutineMatchAuditEntry,
  RemyRoutineMatchResult,
  RemyRoutineStatus,
  RemyRoutineTriggerContext,
  RemyRoutineUpdateInput,
} from '@/lib/ai/remy-routines-types'

const conditionSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    path: z.string().min(1).max(160),
    operator: z.enum([
      'exists',
      'not_exists',
      'equals',
      'not_equals',
      'in',
      'not_in',
      'contains',
      'not_contains',
      'greater_than',
      'greater_than_or_equal',
      'less_than',
      'less_than_or_equal',
      'starts_with',
      'ends_with',
    ]),
    value: z.unknown().optional(),
  })
)

const conditionGroupSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    mode: z.enum(['all', 'any']),
    conditions: z.array(conditionSchema).default([]),
    groups: z.array(conditionGroupSchema).optional(),
  })
)

const actionSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum([
    'record_routine_event',
    'queue_review',
    'create_notification_draft',
    'create_task_draft',
  ]),
  label: z.string().min(1).max(160),
  payload: z.record(z.string(), z.unknown()).default({}),
  approvalRequired: z.boolean().optional(),
})

const createRoutineSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  triggerType: z.enum(['signal', 'event', 'schedule', 'manual', 'webhook']),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  conditionGroup: conditionGroupSchema.optional(),
  actions: z.array(actionSchema).min(1).max(25),
  priority: z.number().int().min(-1000).max(1000).optional(),
  approvalRequired: z.boolean().optional(),
  idempotencyWindowSeconds: z.number().int().min(60).max(2592000).optional(),
})

const updateRoutineSchema = createRoutineSchema.partial()

const triggerContextSchema = z.object({
  triggerType: z.enum(['signal', 'event', 'schedule', 'manual', 'webhook']),
  source: z.string().min(1).max(160),
  occurredAt: z.string().min(1),
  triggerKey: z.string().max(300).nullable().optional(),
  entityIds: z.array(z.string().min(1).max(120)).max(50).optional(),
  data: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().max(300).nullable().optional(),
})

interface RawRoutineRow {
  id: string
  tenant_id: string
  name: string
  description: string | null
  status: RemyRoutineStatus
  trigger_type: RemyRoutine['triggerType']
  trigger_config: Record<string, unknown> | null
  condition_group: RemyRoutine['conditionGroup'] | null
  actions: RemyRoutine['actions'] | null
  priority: number | null
  approval_required: boolean | null
  idempotency_window_seconds: number | null
  created_by_auth_user_id: string | null
  updated_by_auth_user_id: string | null
  created_at: string
  updated_at: string
}

function routineFromRow(row: RawRoutineRow): RemyRoutine {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    status: row.status,
    triggerType: row.trigger_type,
    triggerConfig: row.trigger_config ?? {},
    conditionGroup: row.condition_group ?? { mode: 'all', conditions: [] },
    actions: row.actions ?? [],
    priority: row.priority ?? 0,
    approvalRequired: Boolean(row.approval_required),
    idempotencyWindowSeconds: row.idempotency_window_seconds ?? 86400,
    createdByAuthUserId: row.created_by_auth_user_id,
    updatedByAuthUserId: row.updated_by_auth_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRoutinePayload(
  tenantId: string,
  authUserId: string,
  input: RemyRoutineCreateInput | RemyRoutineUpdateInput
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    updated_by_auth_user_id: authUserId,
    updated_at: new Date().toISOString(),
  }

  if ('name' in input && input.name !== undefined) payload.name = input.name.trim()
  if ('description' in input) {
    payload.description = input.description?.trim() ? input.description.trim() : null
  }
  if ('status' in input && input.status !== undefined) payload.status = input.status
  if ('triggerType' in input && input.triggerType !== undefined)
    payload.trigger_type = input.triggerType
  if ('triggerConfig' in input && input.triggerConfig !== undefined) {
    payload.trigger_config = toSafeJsonb(input.triggerConfig)
  }
  if ('conditionGroup' in input && input.conditionGroup !== undefined) {
    payload.condition_group = toSafeJsonb(input.conditionGroup)
  }
  if ('actions' in input && input.actions !== undefined)
    payload.actions = toSafeJsonb(input.actions)
  if ('priority' in input && input.priority !== undefined) payload.priority = input.priority
  if ('approvalRequired' in input && input.approvalRequired !== undefined) {
    payload.approval_required = input.approvalRequired
  }
  if ('idempotencyWindowSeconds' in input && input.idempotencyWindowSeconds !== undefined) {
    payload.idempotency_window_seconds = input.idempotencyWindowSeconds
  }

  if ('triggerType' in input && input.triggerType !== undefined) {
    payload.tenant_id = tenantId
    payload.created_by_auth_user_id = authUserId
  }

  return payload
}

const routineSelect =
  'id, tenant_id, name, description, status, trigger_type, trigger_config, condition_group, actions, priority, approval_required, idempotency_window_seconds, created_by_auth_user_id, updated_by_auth_user_id, created_at, updated_at'

export async function listRemyRoutines(input?: {
  status?: RemyRoutineStatus
  triggerType?: RemyRoutine['triggerType']
  limit?: number
}): Promise<RemyRoutine[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const limit = Math.min(Math.max(Math.floor(input?.limit ?? 100), 1), 300)

  const db: any = createServerClient()
  let query = db
    .from('remy_routines')
    .select(routineSelect)
    .eq('tenant_id', tenantId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (input?.status) query = query.eq('status', input.status)
  if (input?.triggerType) query = query.eq('trigger_type', input.triggerType)

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to load Remy routines: ${error.message}`)
  }

  return ((data ?? []) as RawRoutineRow[]).map(routineFromRow)
}

export async function getRoutines(_chefId?: string): Promise<RemyRoutine[]> {
  return listRemyRoutines()
}

export async function getRemyRoutine(routineId: string): Promise<RemyRoutine | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const db: any = createServerClient()
  const { data, error } = await db
    .from('remy_routines')
    .select(routineSelect)
    .eq('tenant_id', tenantId)
    .eq('id', routineId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load Remy routine: ${error.message}`)
  }

  return data ? routineFromRow(data as RawRoutineRow) : null
}

export async function createRemyRoutine(input: RemyRoutineCreateInput): Promise<RemyRoutine> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const parsed = createRoutineSchema.parse(input) as RemyRoutineCreateInput
  const db: any = createServerClient()
  const payload = {
    tenant_id: tenantId,
    created_by_auth_user_id: user.id,
    ...toRoutinePayload(tenantId, user.id, {
      ...parsed,
      status: parsed.status ?? 'active',
      triggerConfig: parsed.triggerConfig ?? {},
      conditionGroup: parsed.conditionGroup ?? { mode: 'all', conditions: [] },
      priority: parsed.priority ?? 0,
      approvalRequired: parsed.approvalRequired ?? false,
      idempotencyWindowSeconds: parsed.idempotencyWindowSeconds ?? 86400,
    }),
  }

  const { data, error } = await db
    .from('remy_routines')
    .insert(payload)
    .select(routineSelect)
    .single()

  if (error || !data) {
    throw new Error(`Failed to create Remy routine: ${error?.message ?? 'Unknown error'}`)
  }

  return routineFromRow(data as RawRoutineRow)
}

export async function createRoutine(
  _chefId: string | undefined,
  input: RemyRoutineCreateInput
): Promise<RemyRoutine> {
  return createRemyRoutine(input)
}

export async function updateRemyRoutine(
  routineId: string,
  input: RemyRoutineUpdateInput
): Promise<RemyRoutine> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const parsed = updateRoutineSchema.parse(input) as RemyRoutineUpdateInput
  const db: any = createServerClient()
  const { data, error } = await db
    .from('remy_routines')
    .update(toRoutinePayload(tenantId, user.id, parsed))
    .eq('tenant_id', tenantId)
    .eq('id', routineId)
    .select(routineSelect)
    .single()

  if (error || !data) {
    throw new Error(`Failed to update Remy routine: ${error?.message ?? 'Unknown error'}`)
  }

  return routineFromRow(data as RawRoutineRow)
}

export async function updateRoutine(
  _chefId: string | undefined,
  routineId: string,
  input: RemyRoutineUpdateInput
): Promise<RemyRoutine> {
  return updateRemyRoutine(routineId, input)
}

export async function toggleRoutine(
  _chefId: string | undefined,
  routineId: string,
  enabled: boolean
): Promise<RemyRoutine> {
  return updateRemyRoutine(routineId, { status: enabled ? 'active' : 'paused' })
}

export async function archiveRemyRoutine(routineId: string): Promise<RemyRoutine> {
  return updateRemyRoutine(routineId, { status: 'archived' })
}

export async function deleteRoutine(
  _chefId: string | undefined,
  routineId: string
): Promise<RemyRoutine> {
  return archiveRemyRoutine(routineId)
}

export async function matchRemyRoutinesAction(input: {
  context: RemyRoutineTriggerContext
  limit?: number
}): Promise<RemyRoutineMatchResult[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const context = triggerContextSchema.parse(input.context) as RemyRoutineTriggerContext

  return matchRemyRoutinesForTenant({
    tenantId,
    authUserId: user.id,
    context,
    limit: input.limit,
  })
}

export async function executeRemyRoutineAction(input: {
  routineId: string
  matchAuditId?: string | null
  context: RemyRoutineTriggerContext
}): Promise<RemyRoutineExecutionResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const context = triggerContextSchema.parse(input.context) as RemyRoutineTriggerContext

  return executeRemyRoutineForTenant({
    tenantId,
    authUserId: user.id,
    routineId: input.routineId,
    matchAuditId: input.matchAuditId ?? null,
    context,
  })
}

export async function approveRemyRoutineExecutionAction(input: {
  executionId: string
  context: RemyRoutineTriggerContext
}): Promise<RemyRoutineExecutionResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const context = triggerContextSchema.parse(input.context) as RemyRoutineTriggerContext

  return approveRemyRoutineExecutionForTenant({
    tenantId,
    authUserId: user.id,
    executionId: input.executionId,
    context,
  })
}

export async function listRemyRoutineMatchAudit(input?: {
  routineId?: string
  limit?: number
}): Promise<RemyRoutineMatchAuditEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const limit = Math.min(Math.max(Math.floor(input?.limit ?? 100), 1), 300)

  const db: any = createServerClient()
  let query = db
    .from('remy_routine_match_audit')
    .select(
      'id, routine_id, trigger_type, trigger_source, trigger_key, matched, reason, condition_results, trigger_context, created_at'
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (input?.routineId) query = query.eq('routine_id', input.routineId)

  const { data, error } = await query
  if (error) {
    throw new Error(`Failed to load Remy routine match audit: ${error.message}`)
  }

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id as string,
    routineId: (row.routine_id as string | null) ?? null,
    triggerType: row.trigger_type,
    triggerSource: row.trigger_source as string,
    triggerKey: (row.trigger_key as string | null) ?? null,
    matched: Boolean(row.matched),
    reason: row.reason as string,
    conditionResults: row.condition_results,
    triggerContext: row.trigger_context,
    createdAt: row.created_at as string,
  }))
}

export async function listRemyRoutineExecutionAudit(input?: {
  routineId?: string
  executionId?: string
  limit?: number
}): Promise<RemyRoutineExecutionAuditEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const limit = Math.min(Math.max(Math.floor(input?.limit ?? 100), 1), 300)

  const db: any = createServerClient()
  let query = db
    .from('remy_routine_execution_audit')
    .select(
      'id, routine_id, execution_id, status, request_payload, result_payload, error_message, started_at, finished_at, duration_ms, created_at'
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (input?.routineId) query = query.eq('routine_id', input.routineId)
  if (input?.executionId) query = query.eq('execution_id', input.executionId)

  const { data, error } = await query
  if (error) {
    throw new Error(`Failed to load Remy routine execution audit: ${error.message}`)
  }

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id as string,
    routineId: (row.routine_id as string | null) ?? null,
    executionId: (row.execution_id as string | null) ?? null,
    status: row.status,
    requestPayload: row.request_payload,
    resultPayload: row.result_payload,
    errorMessage: (row.error_message as string | null) ?? null,
    startedAt: row.started_at as string,
    finishedAt: (row.finished_at as string | null) ?? null,
    durationMs: (row.duration_ms as number | null) ?? null,
    createdAt: row.created_at as string,
  }))
}

export async function getRoutineExecutionHistory(
  _chefId?: string,
  routineId?: string
): Promise<RemyRoutineExecutionAuditEntry[]> {
  return listRemyRoutineExecutionAudit({ routineId })
}
