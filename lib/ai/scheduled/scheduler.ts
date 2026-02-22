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
import { AI_PRIORITY } from '@/lib/ai/queue/types'

export interface ScheduledJob {
  taskType: string
  name: string
  intervalMs: number
  priority: number
  /** Only seed for tenants that exist — uses admin client */
  seedOnStartup: boolean
  /** If true, lightweight enough to run on PC now. If false, defer until Pi. */
  enabledWithoutPi: boolean
}

// ============================================
// JOB DEFINITIONS
// ============================================

export const SCHEDULED_JOBS: ScheduledJob[] = [
  {
    taskType: 'scheduled.daily_briefing',
    name: 'Daily Briefing Pre-Gen',
    intervalMs: 24 * 60 * 60 * 1000, // 1 day
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true,
  },
  {
    taskType: 'scheduled.lead_scoring',
    name: 'Auto Lead Scoring',
    intervalMs: 2 * 60 * 60 * 1000, // 2 hours
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true,
  },
  {
    taskType: 'scheduled.weekly_insights',
    name: 'Weekly Business Insights',
    intervalMs: 7 * 24 * 60 * 60 * 1000, // 1 week
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false, // Heavy — defer to Pi
  },
  {
    taskType: 'scheduled.revenue_goal',
    name: 'Revenue Goal Progress',
    intervalMs: 7 * 24 * 60 * 60 * 1000, // 1 week
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.churn_prediction',
    name: 'Client Churn Prediction',
    intervalMs: 7 * 24 * 60 * 60 * 1000, // 1 week
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.food_cost_alert',
    name: 'Food Cost % Alert',
    intervalMs: 7 * 24 * 60 * 60 * 1000, // 1 week
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true, // Pure SQL — no LLM needed
  },
  {
    taskType: 'scheduled.pipeline_bottleneck',
    name: 'Pipeline Bottleneck Report',
    intervalMs: 7 * 24 * 60 * 60 * 1000, // 1 week
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.cert_expiry',
    name: 'Certification Expiry Check',
    intervalMs: 24 * 60 * 60 * 1000, // 1 day
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true, // Pure SQL
  },
  {
    taskType: 'scheduled.food_recall',
    name: 'FDA Recall Monitoring',
    intervalMs: 24 * 60 * 60 * 1000, // 1 day
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true, // Partial — FDA API + light LLM
  },
  {
    taskType: 'scheduled.quote_analysis',
    name: 'Quote Win/Loss Analysis',
    intervalMs: 7 * 24 * 60 * 60 * 1000, // 1 week
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.anomaly_detection',
    name: 'Platform Anomaly Detection',
    intervalMs: 24 * 60 * 60 * 1000, // 1 day
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.menu_engineering',
    name: 'Menu Engineering Report',
    intervalMs: 30 * 24 * 60 * 60 * 1000, // 1 month
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.stale_inquiry_scanner',
    name: 'Stale Inquiry Scanner',
    intervalMs: 6 * 60 * 60 * 1000, // 6 hours
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true, // Pure SQL — no LLM needed for the scan itself
  },
  {
    taskType: 'scheduled.payment_overdue_scanner',
    name: 'Payment Overdue Scanner',
    intervalMs: 24 * 60 * 60 * 1000, // 1 day
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true, // Pure SQL scan
  },
  {
    taskType: 'scheduled.social_post_draft',
    name: 'Social Post Draft',
    intervalMs: 7 * 24 * 60 * 60 * 1000, // 1 week
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false, // Needs LLM — defer to Pi
  },
  {
    taskType: 'scheduled.client_sentiment',
    name: 'Client Sentiment Monitor',
    intervalMs: 7 * 24 * 60 * 60 * 1000, // 1 week
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false, // Needs LLM — defer to Pi
  },
]

// ============================================
// SCHEDULER
// ============================================

let seeded = false

/**
 * Seed scheduled tasks for all active tenants.
 * Safe to call multiple times — idempotent (dedup in enqueueTask).
 * Only seeds jobs that are enabled without the Pi (unless Pi is configured).
 */
export async function seedScheduledTasks(): Promise<{ seeded: number; skipped: number }> {
  if (seeded) return { seeded: 0, skipped: 0 }

  const supabase = createAdminClient()
  const hasPi = !!process.env.OLLAMA_PI_URL

  // Get all active tenants
  const { data: tenants } = await supabase.from('chefs').select('id').limit(100)

  if (!tenants || tenants.length === 0) {
    seeded = true
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

  seeded = true
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
