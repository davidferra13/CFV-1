'use server'

// AI Task Queue - Server Actions
// Enqueue, claim, complete, fail, approve, reject tasks.
// Uses admin client for worker operations (no user session needed).
// Uses server client for chef-facing operations (RLS enforced).

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'
import type { Json } from '@/types/database'
import type { AiQueueItem, AiTaskStatus, ApprovalTier, EnqueueInput, LlmEndpoint } from './types'
import { OLLAMA_GUARD } from './types'
import { getTaskDefinition } from './registry'

async function recordQueueFailure(input: {
  operation: string
  errorMessage: string
  tenantId?: string | null
  entityId?: string
  taskType?: string | null
  severity?: 'critical' | 'high' | 'medium' | 'low'
  context?: Record<string, unknown>
}) {
  await recordSideEffectFailure({
    source: 'ai-queue',
    operation: input.operation,
    severity: input.severity ?? 'high',
    tenantId: input.tenantId ?? undefined,
    entityType: 'ai_task',
    entityId: input.entityId,
    errorMessage: input.errorMessage,
    context: {
      taskType: input.taskType ?? null,
      ...input.context,
    },
  })
}

async function releaseClaimAfterIncrementFailure(input: {
  supabase: any
  taskId: string
  tenantId: string
  taskType: string
  endpoint?: string | null
  errorMessage: string
}): Promise<void> {
  const { error: releaseError } = await input.supabase
    .from('ai_task_queue')
    .update({
      status: 'pending' as AiTaskStatus,
      started_at: null,
      last_error: input.errorMessage,
    })
    .eq('id', input.taskId)
    .eq('status', 'processing')

  if (!releaseError) return

  await recordQueueFailure({
    operation: 'release_claim_after_increment_failure',
    severity: 'critical',
    tenantId: input.tenantId,
    entityId: input.taskId,
    taskType: input.taskType,
    errorMessage: releaseError.message,
    context: {
      endpoint: input.endpoint ?? null,
      incrementError: input.errorMessage,
    },
  })
}

// ============================================
// ENQUEUE - Add a task to the queue
// ============================================

/**
 * Enqueue an AI task for background processing.
 * Validates the task type exists in the registry.
 * Enforces per-tenant queue depth limits.
 */
export async function enqueueTask(
  input: EnqueueInput
): Promise<{ id: string } | { error: string }> {
  const definition = getTaskDefinition(input.taskType)
  if (!definition) {
    return { error: `Unknown task type: ${input.taskType}` }
  }

  const supabase: any = createAdminClient()

  // Queue depth guard - prevent runaway enqueuing
  const { count, error: depthError } = await supabase
    .from('ai_task_queue')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', input.tenantId)
    .in('status', ['pending', 'processing'])

  if (depthError) {
    await recordQueueFailure({
      operation: 'queue_depth_check',
      tenantId: input.tenantId,
      taskType: input.taskType,
      errorMessage: depthError.message,
      severity: 'medium',
    })
    return { error: `Failed to inspect queue depth: ${depthError.message}` }
  }

  if ((count ?? 0) >= OLLAMA_GUARD.MAX_QUEUE_DEPTH_PER_TENANT) {
    return {
      error: `Queue depth limit reached (${OLLAMA_GUARD.MAX_QUEUE_DEPTH_PER_TENANT}). Wait for current tasks to complete.`,
    }
  }

  // Deduplication - don't enqueue the same task type if one is already pending/processing
  // (only for scheduled/reactive tasks, not on-demand)
  if ((input.priority ?? definition.defaultPriority) < 800) {
    const { data: existing, error: dedupeError } = await supabase
      .from('ai_task_queue')
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('task_type', input.taskType)
      .in('status', ['pending', 'processing'])
      .limit(1)

    if (dedupeError) {
      await recordQueueFailure({
        operation: 'dedupe_check',
        tenantId: input.tenantId,
        taskType: input.taskType,
        errorMessage: dedupeError.message,
        severity: 'medium',
      })
      return { error: `Failed to inspect existing queued work: ${dedupeError.message}` }
    }

    if (existing && existing.length > 0) {
      return { id: existing[0].id } // Return existing task ID, don't duplicate
    }
  }

  const { data, error } = await supabase
    .from('ai_task_queue')
    .insert({
      tenant_id: input.tenantId,
      task_type: input.taskType,
      priority: input.priority ?? definition.defaultPriority,
      approval_tier: input.approvalTier ?? definition.approvalTier,
      status: 'pending',
      payload: (input.payload ?? {}) as Json,
      target_endpoint: input.targetEndpoint ?? definition.preferredEndpoint,
      model_tier: definition.modelTier,
      scheduled_for: input.scheduledFor?.toISOString() ?? new Date().toISOString(),
      recurrence: definition.recurrence,
      max_attempts: definition.maxAttempts,
      related_event_id: input.relatedEventId ?? null,
      related_client_id: input.relatedClientId ?? null,
      related_inquiry_id: input.relatedInquiryId ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[ai-queue] Enqueue failed:', error)
    await recordQueueFailure({
      operation: 'insert_task',
      tenantId: input.tenantId,
      taskType: input.taskType,
      errorMessage: error.message,
      severity: 'high',
    })
    return { error: error.message }
  }

  return { id: data.id }
}

// ============================================
// CLAIM - Worker grabs the next task
// ============================================

/**
 * Atomically claim the next pending task for processing.
 * Uses UPDATE ... WHERE to prevent race conditions.
 * Returns null if no tasks are ready.
 */
export async function claimNextTask(): Promise<AiQueueItem | null> {
  const supabase: any = createAdminClient()
  const now = new Date().toISOString()

  // First, recover any hung tasks (processing for too long)
  await recoverHungTasks()

  // Find the highest-priority task that's due
  const { data: candidates, error: findError } = await supabase
    .from('ai_task_queue')
    .select('id')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('priority', { ascending: false })
    .order('scheduled_for', { ascending: true })
    .limit(1)

  if (findError) {
    await recordQueueFailure({
      operation: 'find_next_task',
      errorMessage: findError.message,
      severity: 'medium',
    })
    return null
  }

  if (!candidates || candidates.length === 0) {
    return null
  }

  const taskId = candidates[0].id

  // Atomically claim it (CAS: only if still pending)
  const { data: claimed, error: claimError } = await supabase
    .from('ai_task_queue')
    .update({
      status: 'processing' as AiTaskStatus,
      started_at: now,
      // attempts incremented separately below
    })
    .eq('id', taskId)
    .eq('status', 'pending') // CAS guard
    .select()
    .single()

  if (claimError) {
    await recordQueueFailure({
      operation: 'claim_task',
      entityId: taskId,
      errorMessage: claimError.message,
      severity: 'medium',
    })
    return null
  }

  if (!claimed) {
    // Another worker claimed it first (race condition) - try again
    return null
  }

  // Increment attempts
  const { error: incrementError } = await supabase
    .from('ai_task_queue')
    .update({ attempts: (claimed.attempts ?? 0) + 1 })
    .eq('id', taskId)

  if (incrementError) {
    await recordQueueFailure({
      operation: 'increment_attempts',
      tenantId: claimed.tenant_id,
      entityId: taskId,
      taskType: claimed.task_type,
      errorMessage: incrementError.message,
      severity: 'high',
    })
    await releaseClaimAfterIncrementFailure({
      supabase,
      taskId,
      tenantId: claimed.tenant_id,
      taskType: claimed.task_type,
      errorMessage: incrementError.message,
    })
    return null
  }

  return claimed as AiQueueItem
}

// ============================================
// COMPLETE - Task finished successfully
// ============================================

/**
 * Mark a task as completed with its result.
 * If the task is a 'draft' tier, moves to 'awaiting_approval' instead.
 */
export async function completeTask(taskId: string, result: Record<string, unknown>): Promise<void> {
  const supabase: any = createAdminClient()

  // Get the task to check its approval tier
  const { data: task, error: loadError } = await supabase
    .from('ai_task_queue')
    .select('approval_tier, recurrence, tenant_id, task_type')
    .eq('id', taskId)
    .single()

  if (loadError) {
    await recordQueueFailure({
      operation: 'load_task_for_completion',
      entityId: taskId,
      errorMessage: loadError.message,
      severity: 'high',
    })
    throw new Error(`Failed to load task for completion: ${loadError.message}`)
  }

  if (!task) {
    await recordQueueFailure({
      operation: 'load_task_for_completion',
      entityId: taskId,
      errorMessage: 'Task not found during completion',
      severity: 'high',
    })
    throw new Error(`Task not found during completion: ${taskId}`)
  }

  const finalStatus: AiTaskStatus =
    task.approval_tier === 'draft' ? 'awaiting_approval' : 'completed'

  const { error: completionError } = await supabase
    .from('ai_task_queue')
    .update({
      status: finalStatus,
      result: result as Json,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (completionError) {
    await recordQueueFailure({
      operation: 'complete_task',
      tenantId: task.tenant_id,
      entityId: taskId,
      taskType: task.task_type,
      errorMessage: completionError.message,
      severity: 'high',
    })
    throw new Error(`Failed to mark task complete: ${completionError.message}`)
  }

  // If recurring, schedule the next run
  if (task.recurrence && finalStatus === 'completed') {
    const definition = getTaskDefinition(task.task_type)
    if (definition) {
      // Calculate next run time using the recurrence interval
      // PostgreSQL interval strings like '1 day', '1 week', '2 hours'
      const nextRun = calculateNextRun(task.recurrence)
      const enqueueResult = await enqueueTask({
        tenantId: task.tenant_id,
        taskType: task.task_type,
        scheduledFor: nextRun,
      })
      if ('error' in enqueueResult) {
        await recordQueueFailure({
          operation: 'enqueue_recurring_task',
          tenantId: task.tenant_id,
          entityId: taskId,
          taskType: task.task_type,
          errorMessage: enqueueResult.error,
          severity: 'high',
          context: { nextRun: nextRun.toISOString() },
        })
      }
    }
  }
}

// ============================================
// FAIL - Task execution failed
// ============================================

/**
 * Mark a task as failed. If under max attempts, re-queue with backoff.
 * If at max attempts, mark as dead and push to DLQ.
 */
export async function failTask(taskId: string, errorMessage: string): Promise<void> {
  const supabase: any = createAdminClient()

  const { data: task, error: loadError } = await supabase
    .from('ai_task_queue')
    .select('attempts, max_attempts, tenant_id, task_type, payload')
    .eq('id', taskId)
    .single()

  if (loadError) {
    await recordQueueFailure({
      operation: 'load_task_for_failure',
      entityId: taskId,
      errorMessage: loadError.message,
      severity: 'high',
    })
    throw new Error(`Failed to load task for failure: ${loadError.message}`)
  }

  if (!task) {
    await recordQueueFailure({
      operation: 'load_task_for_failure',
      entityId: taskId,
      errorMessage: 'Task not found during failure handling',
      severity: 'high',
    })
    throw new Error(`Task not found during failure handling: ${taskId}`)
  }

  const attempts = task.attempts ?? 1

  if (attempts >= task.max_attempts) {
    // Permanently failed - move to dead
    const { error: deadError } = await supabase
      .from('ai_task_queue')
      .update({
        status: 'dead' as AiTaskStatus,
        last_error: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (deadError) {
      await recordQueueFailure({
        operation: 'mark_task_dead',
        tenantId: task.tenant_id,
        entityId: taskId,
        taskType: task.task_type,
        errorMessage: deadError.message,
        severity: 'critical',
      })
      throw new Error(`Failed to mark task dead: ${deadError.message}`)
    }

    // Push to DLQ for visibility
    const { error: dlqError } = await supabase.from('dead_letter_queue').insert({
      tenant_id: task.tenant_id,
      job_type: `ai_queue:${task.task_type}`,
      job_id: taskId,
      payload: task.payload,
      error_message: errorMessage,
      attempts,
      first_failed_at: new Date().toISOString(),
      last_failed_at: new Date().toISOString(),
    })

    if (dlqError) {
      await recordQueueFailure({
        operation: 'insert_dead_letter',
        tenantId: task.tenant_id,
        entityId: taskId,
        taskType: task.task_type,
        errorMessage: dlqError.message,
        severity: 'critical',
      })
      throw new Error(`Failed to insert dead letter entry: ${dlqError.message}`)
    }
  } else {
    // Retry with exponential backoff
    const backoffMs = Math.min(
      1000 * Math.pow(2, attempts - 1),
      300_000 // max 5 minutes
    )
    const nextRetry = new Date(Date.now() + backoffMs)

    const { error: retryError } = await supabase
      .from('ai_task_queue')
      .update({
        status: 'pending' as AiTaskStatus,
        last_error: errorMessage,
        next_retry_at: nextRetry.toISOString(),
        scheduled_for: nextRetry.toISOString(),
        started_at: null,
      })
      .eq('id', taskId)

    if (retryError) {
      await recordQueueFailure({
        operation: 'schedule_retry',
        tenantId: task.tenant_id,
        entityId: taskId,
        taskType: task.task_type,
        errorMessage: retryError.message,
        severity: 'high',
        context: { nextRetryAt: nextRetry.toISOString() },
      })
      throw new Error(`Failed to schedule retry: ${retryError.message}`)
    }
  }
}

// ============================================
// APPROVE / REJECT - Chef reviews draft results
// ============================================

/**
 * Chef approves a draft result. Moves to 'approved' status.
 */
export async function approveTask(taskId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase
    .from('ai_task_queue')
    .update({
      status: 'approved' as AiTaskStatus,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq('id', taskId)
    .eq('status', 'awaiting_approval')
}

/**
 * Chef rejects a draft result. Moves to 'rejected' status.
 */
export async function rejectTask(taskId: string, reason?: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase
    .from('ai_task_queue')
    .update({
      status: 'rejected' as AiTaskStatus,
      rejection_reason: reason ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('status', 'awaiting_approval')
}

// ============================================
// QUERY - Chef-facing task listing
// ============================================

/**
 * List tasks awaiting chef approval.
 */
export async function getTasksAwaitingApproval(): Promise<AiQueueItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('ai_task_queue')
    .select('*')
    .eq('tenant_id', user.entityId)
    .eq('status', 'awaiting_approval')
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as AiQueueItem[]
}

/**
 * List recent task history for the chef.
 */
export async function getTaskHistory(
  limit: number = 50,
  statusFilter?: AiTaskStatus
): Promise<AiQueueItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('ai_task_queue')
    .select('*')
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data } = await query
  return (data ?? []) as AiQueueItem[]
}

/**
 * Get queue stats for monitoring.
 */
export async function getQueueStats(tenantId: string): Promise<{
  pending: number
  processing: number
  awaitingApproval: number
  failed: number
  completedToday: number
}> {
  const supabase: any = createAdminClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [pending, processing, awaiting, failed, completedToday] = await Promise.all([
    supabase
      .from('ai_task_queue')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending'),
    supabase
      .from('ai_task_queue')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'processing'),
    supabase
      .from('ai_task_queue')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'awaiting_approval'),
    supabase
      .from('ai_task_queue')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['failed', 'dead']),
    supabase
      .from('ai_task_queue')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString()),
  ])

  return {
    pending: pending.count ?? 0,
    processing: processing.count ?? 0,
    awaitingApproval: awaiting.count ?? 0,
    failed: failed.count ?? 0,
    completedToday: completedToday.count ?? 0,
  }
}

// ============================================
// ENDPOINT-AWARE CLAIMING (Dual-Slot Support)
// ============================================

/**
 * Claim the next task suitable for a specific endpoint.
 * Used by the dual-slot worker to prevent both slots from grabbing the same task.
 *
 * Routing logic (matches llm-router.ts):
 *   - Tasks with target_endpoint = 'pc' or 'pi' → only claimable by that endpoint
 *   - Tasks with target_endpoint = 'auto':
 *       priority >= 800 (ON_DEMAND) → prefer PC
 *       priority <  800             → prefer Pi (offload background work)
 *
 * Best practices (AWS SQS / Netflix):
 *   - Atomic claim via UPDATE ... WHERE (CAS pattern)
 *   - Records actual_endpoint so we know where each task ran
 *   - Jittered polling prevents thundering herd when both slots poll simultaneously
 */
export async function claimNextTaskForEndpoint(endpoint: 'pc' | 'pi'): Promise<AiQueueItem | null> {
  const supabase: any = createAdminClient()
  const now = new Date().toISOString()

  // First, recover any hung tasks
  await recoverHungTasks()

  // Build query: find tasks this endpoint should handle
  // Priority: explicit target match > auto-routed tasks
  let query = supabase
    .from('ai_task_queue')
    .select('id, target_endpoint, priority')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('priority', { ascending: false })
    .order('scheduled_for', { ascending: true })
    .limit(10) // Fetch a batch so we can pick the best match

  const { data: candidates, error: findError } = await query

  if (findError) {
    await recordQueueFailure({
      operation: 'find_next_task_for_endpoint',
      errorMessage: findError.message,
      severity: 'medium',
      context: { endpoint },
    })
    return null
  }

  if (!candidates || candidates.length === 0) {
    return null
  }

  // Pick the best candidate for this endpoint
  const taskId = pickBestCandidate(candidates, endpoint)
  if (!taskId) return null

  // Atomically claim it (CAS: only if still pending)
  const { data: claimed, error: claimError } = await supabase
    .from('ai_task_queue')
    .update({
      status: 'processing' as AiTaskStatus,
      started_at: now,
      actual_endpoint: endpoint,
    })
    .eq('id', taskId)
    .eq('status', 'pending') // CAS guard
    .select()
    .single()

  if (claimError) {
    await recordQueueFailure({
      operation: 'claim_task_for_endpoint',
      entityId: taskId,
      errorMessage: claimError.message,
      severity: 'medium',
      context: { endpoint },
    })
    return null
  }

  if (!claimed) {
    // Another worker/slot claimed it - not an error
    return null
  }

  // Increment attempts
  const { error: incrementError } = await supabase
    .from('ai_task_queue')
    .update({ attempts: (claimed.attempts ?? 0) + 1 })
    .eq('id', taskId)

  if (incrementError) {
    await recordQueueFailure({
      operation: 'increment_attempts_for_endpoint',
      tenantId: claimed.tenant_id,
      entityId: taskId,
      taskType: claimed.task_type,
      errorMessage: incrementError.message,
      severity: 'high',
      context: { endpoint },
    })
    await releaseClaimAfterIncrementFailure({
      supabase,
      taskId,
      tenantId: claimed.tenant_id,
      taskType: claimed.task_type,
      endpoint,
      errorMessage: incrementError.message,
    })
    return null
  }

  return claimed as AiQueueItem
}

/**
 * Pick the best task candidate for a given endpoint.
 *
 * Selection priority:
 *   1. Tasks explicitly targeted at this endpoint
 *   2. Auto-routed tasks that match this endpoint's affinity
 *   3. Any remaining task (work stealing - idle endpoint helps the other)
 */
function pickBestCandidate(
  candidates: Array<{ id: string; target_endpoint: string | null; priority: number }>,
  endpoint: 'pc' | 'pi'
): string | null {
  // Tier 1: Explicitly targeted at this endpoint
  const explicit = candidates.find((c) => c.target_endpoint === endpoint)
  if (explicit) return explicit.id

  // Tier 2: Auto-routed tasks matching this endpoint's natural affinity
  const autoTasks = candidates.filter((c) => c.target_endpoint === 'auto' || !c.target_endpoint)

  for (const task of autoTasks) {
    if (endpoint === 'pc' && task.priority >= 800) return task.id // PC handles high-priority
    if (endpoint === 'pi' && task.priority < 800) return task.id // Pi handles background
  }

  // Tier 3: Work stealing - take any auto task (idle endpoint helps out)
  // This is the "work stealing" pattern from Google Borg / Netflix Mantis
  const anyAuto = autoTasks[0]
  if (anyAuto) return anyAuto.id

  // Tier 4: Even steal explicitly-targeted tasks if the target endpoint is down
  // (The worker already checks endpoint health before calling this)
  const anyTask = candidates.find(
    (c) => c.target_endpoint !== endpoint // Not our explicit target
  )
  if (anyTask) return anyTask.id

  return null
}

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Recover tasks stuck in 'processing' for too long.
 * This handles cases where the worker crashed mid-task.
 */
async function recoverHungTasks(): Promise<void> {
  const supabase: any = createAdminClient()
  const cutoff = new Date(Date.now() - OLLAMA_GUARD.HUNG_TASK_TIMEOUT_MS).toISOString()

  const { error } = await supabase
    .from('ai_task_queue')
    .update({
      status: 'pending' as AiTaskStatus,
      last_error: 'Task timed out (stuck in processing)',
      started_at: null,
    })
    .eq('status', 'processing')
    .lt('started_at', cutoff)

  if (error) {
    await recordQueueFailure({
      operation: 'recover_hung_tasks',
      errorMessage: error.message,
      severity: 'high',
      context: { cutoff },
    })
    throw new Error(`Failed to recover hung tasks: ${error.message}`)
  }
}

/**
 * Calculate the next run time from a PostgreSQL interval string.
 */
function calculateNextRun(recurrence: string): Date {
  const now = new Date()
  const match = recurrence.match(/^(\d+)\s+(second|minute|hour|day|week|month)s?$/)
  if (!match) {
    // Default to 1 day if parsing fails
    return new Date(now.getTime() + 86_400_000)
  }

  const amount = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 'second':
      return new Date(now.getTime() + amount * 1000)
    case 'minute':
      return new Date(now.getTime() + amount * 60_000)
    case 'hour':
      return new Date(now.getTime() + amount * 3_600_000)
    case 'day':
      return new Date(now.getTime() + amount * 86_400_000)
    case 'week':
      return new Date(now.getTime() + amount * 604_800_000)
    case 'month':
      const next = new Date(now)
      next.setMonth(next.getMonth() + amount)
      return next
    default:
      return new Date(now.getTime() + 86_400_000)
  }
}
