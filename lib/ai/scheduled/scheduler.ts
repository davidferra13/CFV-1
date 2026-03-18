'use server'

// Scheduled Intelligence Layer - Scheduler
// Seeds the AI task queue with recurring jobs.
// Called on server start (or on-demand) to ensure scheduled tasks exist.
//
// How it works without cron:
// 1. On startup, scheduler checks what recurring tasks are due
// 2. If a task's last run + recurrence interval < now, enqueue it
// 3. After the worker completes a recurring task, scheduler re-enqueues with next run time
// 4. If the server restarts, scheduler catches up on anything missed

import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueTask } from '@/lib/ai/queue/actions'
import { SCHEDULED_JOBS } from './job-definitions'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'
export type { ScheduledJob } from './job-definitions'

// ============================================
// SCHEDULER
// ============================================

// Module-level guard - prevents re-seeding within the same server lifecycle
let _seeded = false

/**
 * Seed scheduled tasks for all active tenants.
 * Safe to call multiple times - idempotent (dedup in enqueueTask).
 * Seeds all enabled jobs (Pi is permanently retired, all jobs run on PC).
 */
export async function seedScheduledTasks(): Promise<{ seeded: number; skipped: number }> {
  if (_seeded) return { seeded: 0, skipped: 0 }

  const supabase: any = createAdminClient()

  // Get all active tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from('chefs')
    .select('id')
    .limit(100)

  if (tenantsError) {
    await recordSideEffectFailure({
      source: 'scheduled-scheduler',
      operation: 'load_tenants',
      severity: 'high',
      errorMessage: tenantsError.message,
      context: { limit: 100 },
    })
    return { seeded: 0, skipped: 0 }
  }

  if (!tenants || tenants.length === 0) {
    _seeded = true
    return { seeded: 0, skipped: 0 }
  }

  let seededCount = 0
  let skippedCount = 0

  for (const tenant of tenants) {
    for (const job of SCHEDULED_JOBS) {
      try {
        const result = await enqueueTask({
          tenantId: tenant.id,
          taskType: job.taskType,
          priority: job.priority,
          // Schedule first run 5 minutes from now (stagger startup load)
          scheduledFor: new Date(Date.now() + 5 * 60 * 1000 + Math.random() * 10 * 60 * 1000),
        })

        if ('id' in result) {
          seededCount++
        } else {
          skippedCount++
          await recordSideEffectFailure({
            source: 'scheduled-scheduler',
            operation: 'seed_job',
            severity: 'medium',
            tenantId: tenant.id,
            entityType: 'ai_task',
            entityId: job.taskType,
            errorMessage: result.error,
          })
        }
      } catch (err) {
        skippedCount++
        await recordSideEffectFailure({
          source: 'scheduled-scheduler',
          operation: 'seed_job',
          severity: 'medium',
          tenantId: tenant.id,
          entityType: 'ai_task',
          entityId: job.taskType,
          errorMessage: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  _seeded = true
  console.log(`[scheduler] Seeded ${seededCount} scheduled tasks, skipped ${skippedCount}`)
  return { seeded: seededCount, skipped: skippedCount }
}

/**
 * Re-enqueue a completed recurring task for its next run.
 * Called by the worker after a scheduled task completes.
 */
export async function rescheduleTask(taskType: string, tenantId: string): Promise<void> {
  const job = SCHEDULED_JOBS.find((j) => j.taskType === taskType)
  if (!job) return // Not a recurring task

  try {
    const result = await enqueueTask({
      tenantId,
      taskType: job.taskType,
      priority: job.priority,
      scheduledFor: new Date(Date.now() + job.intervalMs),
    })
    if ('error' in result) {
      await recordSideEffectFailure({
        source: 'scheduled-scheduler',
        operation: 'reschedule_job',
        severity: 'medium',
        tenantId,
        entityType: 'ai_task',
        entityId: taskType,
        errorMessage: result.error,
      })
    }
  } catch (err) {
    console.warn(`[scheduler] Failed to reschedule ${taskType}:`, err)
    await recordSideEffectFailure({
      source: 'scheduled-scheduler',
      operation: 'reschedule_job',
      severity: 'medium',
      tenantId,
      entityType: 'ai_task',
      entityId: taskType,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
  }
}
