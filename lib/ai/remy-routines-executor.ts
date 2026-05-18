import { createHash } from 'crypto'
import { createServerClient } from '@/lib/db/server'
import { toSafeJsonb } from '@/lib/ai/remy-action-audit-core'
import type {
  RemyRoutine,
  RemyRoutineAction,
  RemyRoutineActionEvent,
  RemyRoutineExecution,
  RemyRoutineExecutionResult,
  RemyRoutineTriggerContext,
} from '@/lib/ai/remy-routines-types'

interface RawExecutionRow {
  id: string
  tenant_id: string
  routine_id: string
  match_audit_id: string | null
  idempotency_key: string
  status: RemyRoutineExecution['status']
  action_payload: RemyRoutineAction[] | null
  result_payload: unknown
  error_message: string | null
  requested_by_auth_user_id: string | null
  approved_by_auth_user_id: string | null
  approved_at: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

interface RawRoutineRow {
  id: string
  tenant_id: string
  name: string
  description: string | null
  status: RemyRoutine['status']
  trigger_type: RemyRoutine['triggerType']
  trigger_config: Record<string, unknown> | null
  condition_group: RemyRoutine['conditionGroup'] | null
  actions: RemyRoutineAction[] | null
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

function executionFromRow(row: RawExecutionRow): RemyRoutineExecution {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    routineId: row.routine_id,
    matchAuditId: row.match_audit_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    actionPayload: row.action_payload ?? [],
    resultPayload: row.result_payload,
    errorMessage: row.error_message,
    requestedByAuthUserId: row.requested_by_auth_user_id,
    approvedByAuthUserId: row.approved_by_auth_user_id,
    approvedAt: row.approved_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  )
  return `{${entries
    .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`)
    .join(',')}}`
}

export function buildRemyRoutineIdempotencyKey(input: {
  tenantId: string
  routineId: string
  context: RemyRoutineTriggerContext
}): string {
  if (input.context.idempotencyKey?.trim()) return input.context.idempotencyKey.trim()

  const basis = stableStringify({
    tenantId: input.tenantId,
    routineId: input.routineId,
    triggerType: input.context.triggerType,
    source: input.context.source,
    triggerKey: input.context.triggerKey ?? null,
    occurredAt: input.context.occurredAt,
    entityIds: input.context.entityIds ?? [],
    data: input.context.data,
  })

  return createHash('sha256').update(basis).digest('hex')
}

async function startExecutionAudit(input: {
  tenantId: string
  routineId: string | null
  executionId: string | null
  authUserId?: string | null
  requestPayload: unknown
}): Promise<string> {
  const db: any = createServerClient()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('remy_routine_execution_audit')
    .insert({
      tenant_id: input.tenantId,
      routine_id: input.routineId,
      execution_id: input.executionId,
      auth_user_id: input.authUserId ?? null,
      status: 'running',
      request_payload: toSafeJsonb(input.requestPayload),
      started_at: now,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error(
      `Failed to start Remy routine execution audit: ${error?.message ?? 'Unknown error'}`
    )
  }

  return data.id as string
}

async function finishExecutionAudit(input: {
  tenantId: string
  auditId: string
  status: RemyRoutineExecutionResult['status']
  startedAtMs: number
  resultPayload?: unknown
  errorMessage?: string | null
}): Promise<void> {
  const db: any = createServerClient()
  const { error } = await db
    .from('remy_routine_execution_audit')
    .update({
      status: input.status,
      result_payload: toSafeJsonb(input.resultPayload),
      error_message: input.errorMessage ?? null,
      finished_at: new Date().toISOString(),
      duration_ms: Math.max(0, Date.now() - input.startedAtMs),
    })
    .eq('id', input.auditId)
    .eq('tenant_id', input.tenantId)

  if (error) {
    throw new Error(`Failed to finish Remy routine execution audit: ${error.message}`)
  }
}

async function loadRoutineForTenant(tenantId: string, routineId: string): Promise<RemyRoutine> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from('remy_routines')
    .select(
      'id, tenant_id, name, description, status, trigger_type, trigger_config, condition_group, actions, priority, approval_required, idempotency_window_seconds, created_by_auth_user_id, updated_by_auth_user_id, created_at, updated_at'
    )
    .eq('id', routineId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to load Remy routine: ${error?.message ?? 'Not found'}`)
  }

  return routineFromRow(data as RawRoutineRow)
}

async function findExistingExecution(input: {
  tenantId: string
  routineId: string
  idempotencyKey: string
}): Promise<RemyRoutineExecution | null> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from('remy_routine_executions')
    .select(
      'id, tenant_id, routine_id, match_audit_id, idempotency_key, status, action_payload, result_payload, error_message, requested_by_auth_user_id, approved_by_auth_user_id, approved_at, started_at, finished_at, created_at, updated_at'
    )
    .eq('tenant_id', input.tenantId)
    .eq('routine_id', input.routineId)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to check Remy routine idempotency: ${error.message}`)
  }

  return data ? executionFromRow(data as RawExecutionRow) : null
}

async function insertExecution(input: {
  tenantId: string
  routine: RemyRoutine
  matchAuditId?: string | null
  idempotencyKey: string
  status: RemyRoutineExecution['status']
  authUserId?: string | null
}): Promise<RemyRoutineExecution> {
  const db: any = createServerClient()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('remy_routine_executions')
    .insert({
      tenant_id: input.tenantId,
      routine_id: input.routine.id,
      match_audit_id: input.matchAuditId ?? null,
      idempotency_key: input.idempotencyKey,
      status: input.status,
      action_payload: toSafeJsonb(input.routine.actions),
      requested_by_auth_user_id: input.authUserId ?? null,
      started_at: input.status === 'running' ? now : null,
    })
    .select(
      'id, tenant_id, routine_id, match_audit_id, idempotency_key, status, action_payload, result_payload, error_message, requested_by_auth_user_id, approved_by_auth_user_id, approved_at, started_at, finished_at, created_at, updated_at'
    )
    .single()

  if (error || !data) {
    throw new Error(`Failed to create Remy routine execution: ${error?.message ?? 'Unknown error'}`)
  }

  return executionFromRow(data as RawExecutionRow)
}

async function updateExecution(input: {
  tenantId: string
  executionId: string
  status: RemyRoutineExecution['status']
  resultPayload?: unknown
  errorMessage?: string | null
  approvedByAuthUserId?: string | null
}): Promise<void> {
  const db: any = createServerClient()
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status: input.status,
    result_payload: toSafeJsonb(input.resultPayload),
    error_message: input.errorMessage ?? null,
    updated_at: now,
  }

  if (input.status === 'success' || input.status === 'error' || input.status === 'blocked') {
    patch.finished_at = now
  }
  if (input.approvedByAuthUserId) {
    patch.approved_by_auth_user_id = input.approvedByAuthUserId
    patch.approved_at = now
    patch.started_at = now
  }

  const { error } = await db
    .from('remy_routine_executions')
    .update(patch)
    .eq('tenant_id', input.tenantId)
    .eq('id', input.executionId)

  if (error) {
    throw new Error(`Failed to update Remy routine execution: ${error.message}`)
  }
}

async function createActionEvent(input: {
  tenantId: string
  routineId: string
  executionId: string
  action: RemyRoutineAction
  payload: Record<string, unknown>
}): Promise<RemyRoutineActionEvent> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from('remy_routine_action_events')
    .insert({
      tenant_id: input.tenantId,
      routine_id: input.routineId,
      execution_id: input.executionId,
      action_id: input.action.id,
      action_kind: input.action.kind,
      payload: toSafeJsonb(input.payload),
      status: 'success',
    })
    .select(
      'id, tenant_id, routine_id, execution_id, action_id, action_kind, payload, status, error_message, created_at'
    )
    .single()

  if (error || !data) {
    throw new Error(
      `Failed to record Remy routine action event: ${error?.message ?? 'Unknown error'}`
    )
  }

  return {
    id: data.id as string,
    tenantId: data.tenant_id as string,
    routineId: data.routine_id as string,
    executionId: data.execution_id as string,
    actionId: data.action_id as string,
    actionKind: data.action_kind as RemyRoutineActionEvent['actionKind'],
    payload: (data.payload ?? {}) as Record<string, unknown>,
    status: data.status as RemyRoutineActionEvent['status'],
    errorMessage: (data.error_message as string | null) ?? null,
    createdAt: data.created_at as string,
  }
}

function actionNeedsApproval(routine: RemyRoutine): boolean {
  return routine.approvalRequired || routine.actions.some((action) => action.approvalRequired)
}

function buildActionPayload(action: RemyRoutineAction, context: RemyRoutineTriggerContext) {
  return {
    kind: action.kind,
    label: action.label,
    payload: action.payload,
    trigger: {
      type: context.triggerType,
      source: context.source,
      key: context.triggerKey ?? null,
      occurredAt: context.occurredAt,
      entityIds: context.entityIds ?? [],
    },
  }
}

async function executeActions(input: {
  tenantId: string
  routine: RemyRoutine
  executionId: string
  context: RemyRoutineTriggerContext
}): Promise<RemyRoutineActionEvent[]> {
  const events: RemyRoutineActionEvent[] = []

  for (const action of input.routine.actions) {
    const payload = buildActionPayload(action, input.context)
    events.push(
      await createActionEvent({
        tenantId: input.tenantId,
        routineId: input.routine.id,
        executionId: input.executionId,
        action,
        payload,
      })
    )
  }

  return events
}

export async function executeRemyRoutineForTenant(input: {
  tenantId: string
  authUserId?: string | null
  routineId: string
  matchAuditId?: string | null
  context: RemyRoutineTriggerContext
  forceApproved?: boolean
}): Promise<RemyRoutineExecutionResult> {
  const startedAtMs = Date.now()
  const routine = await loadRoutineForTenant(input.tenantId, input.routineId)
  const idempotencyKey = buildRemyRoutineIdempotencyKey({
    tenantId: input.tenantId,
    routineId: routine.id,
    context: input.context,
  })
  const existing = await findExistingExecution({
    tenantId: input.tenantId,
    routineId: routine.id,
    idempotencyKey,
  })

  if (existing) {
    const auditId = await startExecutionAudit({
      tenantId: input.tenantId,
      routineId: routine.id,
      executionId: existing.id,
      authUserId: input.authUserId,
      requestPayload: { idempotencyKey, context: input.context },
    })
    const result = {
      executionId: existing.id,
      routineId: routine.id,
      status: 'skipped' as const,
      idempotencyKey,
      actionEvents: [],
      approvalRequired: existing.status === 'approval_required',
      errorMessage: null,
    }
    await finishExecutionAudit({
      tenantId: input.tenantId,
      auditId,
      status: 'skipped',
      startedAtMs,
      resultPayload: result,
    })
    return result
  }

  if (routine.status !== 'active') {
    const auditId = await startExecutionAudit({
      tenantId: input.tenantId,
      routineId: routine.id,
      executionId: null,
      authUserId: input.authUserId,
      requestPayload: { context: input.context },
    })
    const result = {
      executionId: '',
      routineId: routine.id,
      status: 'blocked' as const,
      idempotencyKey,
      actionEvents: [],
      approvalRequired: false,
      errorMessage: 'Routine is not active',
    }
    await finishExecutionAudit({
      tenantId: input.tenantId,
      auditId,
      status: 'blocked',
      startedAtMs,
      resultPayload: result,
      errorMessage: result.errorMessage,
    })
    return result
  }

  const approvalRequired = actionNeedsApproval(routine) && !input.forceApproved
  const execution = await insertExecution({
    tenantId: input.tenantId,
    routine,
    matchAuditId: input.matchAuditId,
    idempotencyKey,
    status: approvalRequired ? 'approval_required' : 'running',
    authUserId: input.authUserId,
  })
  const auditId = await startExecutionAudit({
    tenantId: input.tenantId,
    routineId: routine.id,
    executionId: execution.id,
    authUserId: input.authUserId,
    requestPayload: { context: input.context, idempotencyKey },
  })

  if (approvalRequired) {
    const result = {
      executionId: execution.id,
      routineId: routine.id,
      status: 'approval_required' as const,
      idempotencyKey,
      actionEvents: [],
      approvalRequired: true,
      errorMessage: null,
    }
    await finishExecutionAudit({
      tenantId: input.tenantId,
      auditId,
      status: 'approval_required',
      startedAtMs,
      resultPayload: result,
    })
    return result
  }

  try {
    const actionEvents = await executeActions({
      tenantId: input.tenantId,
      routine,
      executionId: execution.id,
      context: input.context,
    })
    const result = {
      executionId: execution.id,
      routineId: routine.id,
      status: 'success' as const,
      idempotencyKey,
      actionEvents,
      approvalRequired: false,
      errorMessage: null,
    }
    await updateExecution({
      tenantId: input.tenantId,
      executionId: execution.id,
      status: 'success',
      resultPayload: result,
    })
    await finishExecutionAudit({
      tenantId: input.tenantId,
      auditId,
      status: 'success',
      startedAtMs,
      resultPayload: result,
    })
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Remy routine execution error'
    await updateExecution({
      tenantId: input.tenantId,
      executionId: execution.id,
      status: 'error',
      errorMessage: message,
    })
    await finishExecutionAudit({
      tenantId: input.tenantId,
      auditId,
      status: 'error',
      startedAtMs,
      errorMessage: message,
    })
    return {
      executionId: execution.id,
      routineId: routine.id,
      status: 'error',
      idempotencyKey,
      actionEvents: [],
      approvalRequired: false,
      errorMessage: message,
    }
  }
}

export async function executeRoutineAction(input: {
  chefId: string
  routineId: string
  context: RemyRoutineTriggerContext
  matchAuditId?: string | null
  authUserId?: string | null
}): Promise<RemyRoutineExecutionResult> {
  return executeRemyRoutineForTenant({
    tenantId: input.chefId,
    authUserId: input.authUserId,
    routineId: input.routineId,
    matchAuditId: input.matchAuditId,
    context: input.context,
  })
}

export async function approveRemyRoutineExecutionForTenant(input: {
  tenantId: string
  authUserId: string
  executionId: string
  context: RemyRoutineTriggerContext
}): Promise<RemyRoutineExecutionResult> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from('remy_routine_executions')
    .select(
      'id, tenant_id, routine_id, match_audit_id, idempotency_key, status, action_payload, result_payload, error_message, requested_by_auth_user_id, approved_by_auth_user_id, approved_at, started_at, finished_at, created_at, updated_at'
    )
    .eq('tenant_id', input.tenantId)
    .eq('id', input.executionId)
    .single()

  if (error || !data) {
    throw new Error(
      `Failed to load Remy routine execution for approval: ${error?.message ?? 'Not found'}`
    )
  }

  const execution = executionFromRow(data as RawExecutionRow)
  if (execution.status !== 'approval_required') {
    return {
      executionId: execution.id,
      routineId: execution.routineId,
      status: 'skipped',
      idempotencyKey: execution.idempotencyKey,
      actionEvents: [],
      approvalRequired: false,
      errorMessage: `Execution is ${execution.status}, not approval_required`,
    }
  }

  const routine = await loadRoutineForTenant(input.tenantId, execution.routineId)
  await updateExecution({
    tenantId: input.tenantId,
    executionId: execution.id,
    status: 'running',
    approvedByAuthUserId: input.authUserId,
  })

  const startedAtMs = Date.now()
  const auditId = await startExecutionAudit({
    tenantId: input.tenantId,
    routineId: routine.id,
    executionId: execution.id,
    authUserId: input.authUserId,
    requestPayload: { approvedExecutionId: execution.id, context: input.context },
  })

  try {
    const actionEvents = await executeActions({
      tenantId: input.tenantId,
      routine,
      executionId: execution.id,
      context: input.context,
    })
    const result = {
      executionId: execution.id,
      routineId: routine.id,
      status: 'success' as const,
      idempotencyKey: execution.idempotencyKey,
      actionEvents,
      approvalRequired: false,
      errorMessage: null,
    }
    await updateExecution({
      tenantId: input.tenantId,
      executionId: execution.id,
      status: 'success',
      resultPayload: result,
    })
    await finishExecutionAudit({
      tenantId: input.tenantId,
      auditId,
      status: 'success',
      startedAtMs,
      resultPayload: result,
    })
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Remy routine approval error'
    await updateExecution({
      tenantId: input.tenantId,
      executionId: execution.id,
      status: 'error',
      errorMessage: message,
    })
    await finishExecutionAudit({
      tenantId: input.tenantId,
      auditId,
      status: 'error',
      startedAtMs,
      errorMessage: message,
    })
    return {
      executionId: execution.id,
      routineId: routine.id,
      status: 'error',
      idempotencyKey: execution.idempotencyKey,
      actionEvents: [],
      approvalRequired: false,
      errorMessage: message,
    }
  }
}

export const remyRoutinesExecutorInternals = {
  stableStringify,
  routineFromRow,
  executionFromRow,
  actionNeedsApproval,
  buildActionPayload,
}
