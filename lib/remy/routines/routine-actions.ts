'use server'

// Remy Routines - Server Actions
// CRUD for remy_routines table. All operations auth-gated and tenant-scoped.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  RemyRoutine,
  RoutineStatus,
  CreateRoutineInput,
  UpdateRoutineInput,
  RoutineExecutionRow,
} from './types'
import { evaluateRoutineSafety, validateActionDef } from './safety'
import {
  getMatchAuditForRoutine,
  getExecutionAuditForRoutine,
  getActionEventsForExecution,
  getRecentAuditForTenant,
  logExecutionAudit,
} from './audit'

// ---- Validation ----

function validateCreateInput(input: CreateRoutineInput): string[] {
  const errors: string[] = []

  if (!input.name || input.name.trim().length === 0) {
    errors.push('Routine name is required.')
  }
  if (input.name && input.name.length > 160) {
    errors.push('Routine name must be 160 characters or fewer.')
  }

  const validTriggers = ['signal', 'event', 'schedule', 'manual', 'webhook'] as const
  if (!validTriggers.includes(input.trigger_type as (typeof validTriggers)[number])) {
    errors.push(`Invalid trigger type: ${input.trigger_type}`)
  }

  if (!input.actions || input.actions.length === 0) {
    errors.push('At least one action is required.')
  }

  for (const action of input.actions ?? []) {
    const actionValidation = validateActionDef(action)
    if (!actionValidation.valid) {
      errors.push(...actionValidation.errors)
    }
  }

  if (input.priority !== undefined && (input.priority < -1000 || input.priority > 1000)) {
    errors.push('Priority must be between -1000 and 1000.')
  }

  if (
    input.idempotency_window_seconds !== undefined &&
    (input.idempotency_window_seconds < 60 || input.idempotency_window_seconds > 2592000)
  ) {
    errors.push('Idempotency window must be between 60 and 2592000 seconds.')
  }

  return errors
}

// ---- Create ----

export async function createRoutine(input: CreateRoutineInput): Promise<RemyRoutine> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('Tenant context required.')

  const validationErrors = validateCreateInput(input)
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join('; ')}`)
  }

  // Safety check before saving
  const safety = evaluateRoutineSafety({
    actions: input.actions,
    approval_required: input.approval_required ?? false,
  })
  if (!safety.safe) {
    throw new Error(`Safety check failed: ${safety.violations.join('; ')}`)
  }

  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routines')
    .insert({
      tenant_id: user.tenantId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      trigger_type: input.trigger_type,
      trigger_config: input.trigger_config,
      condition_group: input.condition_group ?? { mode: 'all', conditions: [] },
      actions: input.actions,
      priority: input.priority ?? 0,
      approval_required: safety.requires_approval || (input.approval_required ?? false),
      idempotency_window_seconds: input.idempotency_window_seconds ?? 86400,
      created_by_auth_user_id: user.authUserId,
      updated_by_auth_user_id: user.authUserId,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create routine: ${error.message}`)
  return data
}

// ---- Read ----

export async function getRoutine(routineId: string): Promise<RemyRoutine | null> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('Tenant context required.')

  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routines')
    .select('*')
    .eq('id', routineId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to get routine: ${error.message}`)
  }
  return data
}

export async function listRoutines(opts?: {
  status?: RoutineStatus
  trigger_type?: string
  limit?: number
  offset?: number
}): Promise<RemyRoutine[]> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('Tenant context required.')

  const db: ReturnType<typeof createServerClient> = createServerClient()
  const { status, trigger_type, limit = 50, offset = 0 } = opts ?? {}

  let query = (db as any)
    .from('remy_routines')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }
  if (trigger_type) {
    query = query.eq('trigger_type', trigger_type)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to list routines: ${error.message}`)
  return data ?? []
}

// ---- Update ----

export async function updateRoutine(
  routineId: string,
  input: UpdateRoutineInput
): Promise<RemyRoutine> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('Tenant context required.')

  // Fetch existing to merge
  const existing = await getRoutine(routineId)
  if (!existing) throw new Error('Routine not found.')

  // Validate actions if provided
  if (input.actions) {
    for (const action of input.actions) {
      const v = validateActionDef(action)
      if (!v.valid) throw new Error(`Action validation failed: ${v.errors.join('; ')}`)
    }
  }

  // Safety check with merged actions
  const mergedActions = input.actions ?? existing.actions
  const safety = evaluateRoutineSafety({
    actions: mergedActions,
    approval_required: input.approval_required ?? existing.approval_required,
  })
  if (!safety.safe) {
    throw new Error(`Safety check failed: ${safety.violations.join('; ')}`)
  }

  const updates: Record<string, unknown> = {
    updated_by_auth_user_id: user.authUserId,
  }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description?.trim() || null
  if (input.trigger_type !== undefined) updates.trigger_type = input.trigger_type
  if (input.trigger_config !== undefined) updates.trigger_config = input.trigger_config
  if (input.condition_group !== undefined) updates.condition_group = input.condition_group
  if (input.actions !== undefined) updates.actions = input.actions
  if (input.priority !== undefined) updates.priority = input.priority
  if (input.approval_required !== undefined) {
    updates.approval_required = safety.requires_approval || input.approval_required
  }
  if (input.idempotency_window_seconds !== undefined) {
    updates.idempotency_window_seconds = input.idempotency_window_seconds
  }

  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routines')
    .update(updates)
    .eq('id', routineId)
    .eq('tenant_id', user.tenantId)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update routine: ${error.message}`)
  return data
}

// ---- Status Toggle ----

export async function setRoutineStatus(
  routineId: string,
  status: RoutineStatus
): Promise<RemyRoutine> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('Tenant context required.')

  const validStatuses: RoutineStatus[] = ['active', 'paused', 'archived']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`)
  }

  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data, error } = await (db as any)
    .from('remy_routines')
    .update({ status, updated_by_auth_user_id: user.authUserId })
    .eq('id', routineId)
    .eq('tenant_id', user.tenantId)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update routine status: ${error.message}`)
  return data
}

// ---- Delete ----

export async function deleteRoutine(routineId: string): Promise<void> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('Tenant context required.')

  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { error } = await (db as any)
    .from('remy_routines')
    .delete()
    .eq('id', routineId)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to delete routine: ${error.message}`)
}

// ---- Approve Pending Execution ----

export async function approveExecution(executionId: string): Promise<RoutineExecutionRow> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('Tenant context required.')

  const db: ReturnType<typeof createServerClient> = createServerClient()

  const { data: existing, error: fetchError } = await (db as any)
    .from('remy_routine_executions')
    .select('*')
    .eq('id', executionId)
    .eq('tenant_id', user.tenantId)
    .eq('status', 'approval_required')
    .single()

  if (fetchError || !existing) {
    throw new Error('Pending execution not found or already processed.')
  }

  const { data, error } = await (db as any)
    .from('remy_routine_executions')
    .update({
      status: 'running',
      approved_by_auth_user_id: user.authUserId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', executionId)
    .eq('tenant_id', user.tenantId)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to approve execution: ${error.message}`)

  await logExecutionAudit({
    tenant_id: user.tenantId,
    routine_id: data.routine_id,
    execution_id: data.id,
    auth_user_id: user.authUserId,
    status: 'running',
    started_at: new Date().toISOString(),
  })

  return data
}

// ---- Audit Queries (exposed as server actions) ----

export async function getRoutineMatchHistory(routineId: string, limit = 50) {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('Tenant context required.')
  return getMatchAuditForRoutine(user.tenantId, routineId, limit)
}

export async function getRoutineExecutionHistory(routineId: string, limit = 50) {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('Tenant context required.')
  return getExecutionAuditForRoutine(user.tenantId, routineId, limit)
}

export async function getExecutionActionEvents(executionId: string) {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('Tenant context required.')
  return getActionEventsForExecution(user.tenantId, executionId)
}

export async function getRecentRoutineActivity(limit = 100) {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('Tenant context required.')
  return getRecentAuditForTenant(user.tenantId, limit)
}
