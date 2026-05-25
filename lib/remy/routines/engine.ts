// Remy Routines - Engine
// Runtime: match incoming triggers to routines, evaluate conditions,
// execute actions, log results. All operations are tenant-scoped.

import { createServerClient } from '@/lib/db/server'
import type {
  RemyRoutine,
  RoutineTriggerEvent,
  RoutineEngineResult,
  RoutineExecutionRow,
  ConditionGroup,
  RoutineCondition,
  RoutineActionDef,
} from './types'
import { evaluateRoutineSafety, canExecuteWithoutApproval } from './safety'
import { logMatchAudit, logExecutionAudit, logActionEvent } from './audit'

// ---- Main Entry Point ----

/**
 * Process an incoming trigger event against all active routines for a tenant.
 * Returns results for each routine that was evaluated.
 */
export async function processRoutineTrigger(
  tenantId: string,
  event: RoutineTriggerEvent,
  authUserId?: string | null
): Promise<RoutineEngineResult[]> {
  const candidates = await getActiveRoutinesForTrigger(tenantId, event.trigger_type)
  const results: RoutineEngineResult[] = []

  for (const routine of candidates) {
    const result = await evaluateAndExecuteRoutine(tenantId, routine, event, authUserId)
    results.push(result)
  }

  return results
}

// ---- Routine Evaluation ----

async function evaluateAndExecuteRoutine(
  tenantId: string,
  routine: RemyRoutine,
  event: RoutineTriggerEvent,
  authUserId?: string | null
): Promise<RoutineEngineResult> {
  // Step 1: Evaluate conditions
  const conditionResult = evaluateConditionGroup(routine.condition_group, event.context)

  const matchReason = conditionResult.matched
    ? `All conditions passed for trigger ${event.source}`
    : `Condition failed: ${conditionResult.reason}`

  // Step 2: Log match audit
  await logMatchAudit({
    tenant_id: tenantId,
    routine_id: routine.id,
    auth_user_id: authUserId,
    trigger_type: event.trigger_type,
    trigger_source: event.source,
    trigger_key: event.key ?? null,
    matched: conditionResult.matched,
    reason: matchReason,
    condition_results: conditionResult.details,
    trigger_context: event.context,
  })

  if (!conditionResult.matched) {
    return {
      routine_id: routine.id,
      routine_name: routine.name,
      matched: false,
      reason: matchReason,
      execution_id: null,
      execution_status: null,
      action_results: [],
    }
  }

  // Step 3: Safety check
  const safetyVerdict = evaluateRoutineSafety({
    actions: routine.actions,
    approval_required: routine.approval_required,
  })

  if (!safetyVerdict.safe) {
    const blockedExecution = await createExecution(tenantId, routine, event, 'blocked', authUserId)
    await logExecutionAudit({
      tenant_id: tenantId,
      routine_id: routine.id,
      execution_id: blockedExecution.id,
      auth_user_id: authUserId,
      status: 'blocked',
      request_payload: event.context,
      error_message: safetyVerdict.violations.join('; '),
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: 0,
    })
    return {
      routine_id: routine.id,
      routine_name: routine.name,
      matched: true,
      reason: `Blocked by safety: ${safetyVerdict.violations.join('; ')}`,
      execution_id: blockedExecution.id,
      execution_status: 'blocked',
      action_results: [],
    }
  }

  // Step 4: Idempotency check
  const idempotencyKey = buildIdempotencyKey(routine.id, event)
  const isDuplicate = await checkIdempotency(
    tenantId,
    routine.id,
    idempotencyKey,
    routine.idempotency_window_seconds
  )

  if (isDuplicate) {
    return {
      routine_id: routine.id,
      routine_name: routine.name,
      matched: true,
      reason: `Skipped: duplicate within idempotency window (${routine.idempotency_window_seconds}s)`,
      execution_id: null,
      execution_status: 'skipped',
      action_results: [],
    }
  }

  // Step 5: Check if approval is needed
  if (!canExecuteWithoutApproval(routine)) {
    const pendingExecution = await createExecution(
      tenantId,
      routine,
      event,
      'approval_required',
      authUserId,
      idempotencyKey
    )
    await logExecutionAudit({
      tenant_id: tenantId,
      routine_id: routine.id,
      execution_id: pendingExecution.id,
      auth_user_id: authUserId,
      status: 'approval_required',
      request_payload: event.context,
      started_at: new Date().toISOString(),
    })
    return {
      routine_id: routine.id,
      routine_name: routine.name,
      matched: true,
      reason: 'Awaiting chef approval before execution',
      execution_id: pendingExecution.id,
      execution_status: 'approval_required',
      action_results: [],
    }
  }

  // Step 6: Execute actions
  return await executeRoutineActions(tenantId, routine, event, authUserId, idempotencyKey)
}

// ---- Action Execution ----

async function executeRoutineActions(
  tenantId: string,
  routine: RemyRoutine,
  event: RoutineTriggerEvent,
  authUserId: string | null | undefined,
  idempotencyKey: string
): Promise<RoutineEngineResult> {
  const startedAt = new Date().toISOString()
  const execution = await createExecution(
    tenantId,
    routine,
    event,
    'running',
    authUserId,
    idempotencyKey
  )

  const actionResults: RoutineEngineResult['action_results'] = []
  let hasError = false

  for (const action of routine.actions) {
    try {
      await executeAction(tenantId, routine.id, execution.id, action, event.context, authUserId)
      actionResults.push({
        action_id: action.id,
        kind: action.kind,
        status: 'success',
        error_message: null,
      })
      await logActionEvent({
        tenant_id: tenantId,
        routine_id: routine.id,
        execution_id: execution.id,
        action,
        status: 'success',
      })
    } catch (err) {
      hasError = true
      const errorMsg = err instanceof Error ? err.message : String(err)
      actionResults.push({
        action_id: action.id,
        kind: action.kind,
        status: 'error',
        error_message: errorMsg,
      })
      await logActionEvent({
        tenant_id: tenantId,
        routine_id: routine.id,
        execution_id: execution.id,
        action,
        status: 'error',
        error_message: errorMsg,
      })
    }
  }

  const finishedAt = new Date().toISOString()
  const finalStatus = hasError ? 'error' : 'success'
  const durationMs = Date.parse(finishedAt) - Date.parse(startedAt)

  // Update execution status
  const db: ReturnType<typeof createServerClient> = createServerClient()
  await (db as any)
    .from('remy_routine_executions')
    .update({
      status: finalStatus,
      result_payload: { action_results: actionResults },
      error_message: hasError
        ? actionResults
            .filter((r) => r.status === 'error')
            .map((r) => r.error_message)
            .join('; ')
        : null,
      started_at: startedAt,
      finished_at: finishedAt,
    })
    .eq('id', execution.id)
    .eq('tenant_id', tenantId)

  await logExecutionAudit({
    tenant_id: tenantId,
    routine_id: routine.id,
    execution_id: execution.id,
    auth_user_id: authUserId,
    status: finalStatus,
    request_payload: event.context,
    result_payload: { action_results: actionResults },
    error_message: hasError
      ? actionResults
          .filter((r) => r.status === 'error')
          .map((r) => r.error_message)
          .join('; ')
      : null,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: durationMs,
  })

  return {
    routine_id: routine.id,
    routine_name: routine.name,
    matched: true,
    reason: hasError ? 'Completed with errors' : 'Completed successfully',
    execution_id: execution.id,
    execution_status: finalStatus,
    action_results: actionResults,
  }
}

// ---- Individual Action Execution ----
// Each action kind maps to a safe, draft-only operation.
// Remy NEVER auto-sends anything; all outputs are drafts for chef review.

async function executeAction(
  tenantId: string,
  _routineId: string,
  _executionId: string,
  action: RoutineActionDef,
  _triggerContext: Record<string, unknown>,
  authUserId?: string | null
): Promise<void> {
  switch (action.kind) {
    case 'record_routine_event':
      // Pure logging; the action event log itself is the record.
      break

    case 'queue_review':
      // Create an entry that surfaces in the Remy approval center.
      // For now, the execution_audit row with status 'approval_required' serves this role.
      break

    case 'create_notification_draft':
      // Create a draft notification for chef review.
      // Future: write to a notifications_draft table.
      break

    case 'create_task_draft': {
      const p = action.payload ?? {}
      const text = (p.text as string) || (p.title as string) || 'Untitled task'
      const createdBy = authUserId || tenantId

      const db: ReturnType<typeof createServerClient> = createServerClient()

      // Append after last incomplete item
      const { data: last } = await (db as any)
        .from('chef_todos')
        .select('sort_order')
        .eq('chef_id', tenantId)
        .eq('completed', false)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextOrder = (last?.sort_order ?? -1) + 1

      const { error } = await (db as any).from('chef_todos').insert({
        chef_id: tenantId,
        text,
        completed: false,
        sort_order: nextOrder,
        created_by: createdBy,
        priority: (p.priority as string) || 'medium',
        category: (p.category as string) || 'general',
        due_date: (p.due_date as string) || null,
        notes: (p.notes as string) || null,
        event_id: (p.event_id as string) || null,
        client_id: (p.client_id as string) || null,
      })

      if (error) {
        console.error('[Remy] create_task_draft insert failed:', error)
        throw new Error(`create_task_draft failed: ${error.message}`)
      }
      break
    }

    default: {
      const _exhaustive: never = action.kind
      throw new Error(`Unknown action kind: ${String(_exhaustive)}`)
    }
  }
}

// ---- Condition Evaluation ----

interface ConditionEvalResult {
  matched: boolean
  reason: string
  details: Record<string, unknown>
}

export function evaluateConditionGroup(
  group: ConditionGroup,
  context: Record<string, unknown>
): ConditionEvalResult {
  if (group.conditions.length === 0) {
    return { matched: true, reason: 'No conditions (auto-match)', details: {} }
  }

  const results: Record<string, boolean> = {}

  for (const condition of group.conditions) {
    const passed = evaluateSingleCondition(condition, context)
    results[`${condition.field}:${condition.operator}`] = passed

    if (group.mode === 'all' && !passed) {
      return {
        matched: false,
        reason: `Condition failed: ${condition.field} ${condition.operator}`,
        details: results,
      }
    }
    if (group.mode === 'any' && passed) {
      return {
        matched: true,
        reason: `Condition matched: ${condition.field} ${condition.operator}`,
        details: results,
      }
    }
  }

  const matched = group.mode === 'all'
  return {
    matched,
    reason: matched ? 'All conditions passed' : 'No conditions matched',
    details: results,
  }
}

function evaluateSingleCondition(
  condition: RoutineCondition,
  context: Record<string, unknown>
): boolean {
  const fieldValue = getNestedValue(context, condition.field)

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value
    case 'not_equals':
      return fieldValue !== condition.value
    case 'contains':
      return typeof fieldValue === 'string' && typeof condition.value === 'string'
        ? fieldValue.includes(condition.value)
        : false
    case 'not_contains':
      return typeof fieldValue === 'string' && typeof condition.value === 'string'
        ? !fieldValue.includes(condition.value)
        : true
    case 'greater_than':
      return typeof fieldValue === 'number' && typeof condition.value === 'number'
        ? fieldValue > condition.value
        : false
    case 'less_than':
      return typeof fieldValue === 'number' && typeof condition.value === 'number'
        ? fieldValue < condition.value
        : false
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null
    default:
      return false
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

// ---- DB Helpers ----

async function getActiveRoutinesForTrigger(
  tenantId: string,
  triggerType: string
): Promise<RemyRoutine[]> {
  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routines')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .eq('trigger_type', triggerType)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to load routines: ${error.message}`)
  return data ?? []
}

async function createExecution(
  tenantId: string,
  routine: RemyRoutine,
  event: RoutineTriggerEvent,
  status: string,
  authUserId?: string | null,
  idempotencyKey?: string
): Promise<RoutineExecutionRow> {
  const db: ReturnType<typeof createServerClient> = createServerClient()
  const key = idempotencyKey ?? buildIdempotencyKey(routine.id, event)

  const { data, error } = await (db as any)
    .from('remy_routine_executions')
    .insert({
      tenant_id: tenantId,
      routine_id: routine.id,
      idempotency_key: key,
      status,
      action_payload: routine.actions,
      requested_by_auth_user_id: authUserId ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create execution: ${error.message}`)
  return data
}

async function checkIdempotency(
  tenantId: string,
  routineId: string,
  idempotencyKey: string,
  windowSeconds: number
): Promise<boolean> {
  const db: ReturnType<typeof createServerClient> = createServerClient()
  const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString()

  const { data, error } = await (db as any)
    .from('remy_routine_executions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('routine_id', routineId)
    .eq('idempotency_key', idempotencyKey)
    .gte('created_at', cutoff)
    .limit(1)

  if (error) return false
  return data !== null && data.length > 0
}

function buildIdempotencyKey(routineId: string, event: RoutineTriggerEvent): string {
  const keyParts = [routineId, event.trigger_type, event.source]
  if (event.key) keyParts.push(event.key)
  return keyParts.join(':')
}
