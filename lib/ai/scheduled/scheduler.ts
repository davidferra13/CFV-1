'use server'

// Scheduled Intelligence Layer — Scheduler
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
export type { ScheduledJob } from './job-definitions'

// ============================================
// SCHEDULER
// ============================================

// Module-level guard — prevents re-seeding within the same server lifecycle
let _seeded = false

/**
 * Seed scheduled tasks for all active tenants.
 * Safe to call multiple times — idempotent (dedup in enqueueTask).
 * Only seeds jobs that are enabled without the Pi (unless Pi is configured).
 */
export async function seedScheduledTasks(): Promise<{ seeded: number; skipped: number }> {
  if (_seeded) return { seeded: 0, skipped: 0 }

  const supabase: any = createAdminClient()
  const hasPi = !!process.env.OLLAMA_PI_URL

  // Get all active tenants
  const { data: tenants } = await supabase.from('chefs').select('id').limit(100)

  if (!tenants || tenants.length === 0) {
    _seeded = true
    return { seeded: 0, skipped: 0 }
  }

  let seededCount = 0
  let skippedCount = 0

  for (const tenant of tenants) {
    for (const job of SCHEDULED_JOBS) {
      // Skip heavy jobs if no Pi
      if (!job.enabledWithoutPi && !hasPi) {
        skippedCount++
        continue
      }

      try {
        const result = await enqueueTask({
          tenantId: tenant.id,
          taskType: job.taskType,
          priority: job.priority,
          // Schedule first run 5 minutes from now (stagger startup load)
          scheduledFor: new Date(Date.now() + 5 * 60 * 1000 + Math.random() * 10 * 60 * 1000),
        })

        if ('id' in result) seededCount++
        else skippedCount++ // Already exists (dedup)
      } catch {
        skippedCount++
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

  const hasPi = !!process.env.OLLAMA_PI_URL
  if (!job.enabledWithoutPi && !hasPi) return // Skip heavy jobs without Pi

  try {
    await enqueueTask({
      tenantId,
      taskType: job.taskType,
      priority: job.priority,
      scheduledFor: new Date(Date.now() + job.intervalMs),
    })
  } catch (err) {
    console.warn(`[scheduler] Failed to reschedule ${taskType}:`, err)
  }
}
