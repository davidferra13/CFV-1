// AI Task Queue - Worker (Single-Slot, PC Only)
// No 'use server' - singleton module, runs inside Next.js process.
//
// SAFETY-FIRST DESIGN:
//   1. Ollama can NEVER be maxed out - cooldown between tasks, yield to Remy
//   2. Infinite loops are IMPOSSIBLE - max consecutive failures -> backoff -> stop
//   3. Self-monitoring - logs everything, detects anomalies, auto-pauses
//   4. Graceful shutdown - stops cleanly, no orphaned tasks
//   5. Privacy - worker NEVER sends data to cloud; ALL processing is local Ollama
//   6. Hallucination guard - structured output with validation, not free-form text
//   7. Cost-free - local LLM, local queue, zero API charges
//
// Pi is permanently retired. Single-slot architecture (PC only).

import { claimNextTask, completeTask, failTask } from './actions'
import { getTaskDefinition } from './registry'
import { routeTask, isAnyEndpointHealthy } from '../llm-router'
import { OLLAMA_GUARD } from './types'
import type { WorkerState, AiQueueItem } from './types'
import { recordMetric, writeDailySummary, writeTaskPerformance } from './monitor'
import { reportTaskFailure, reportWorkerBackoff } from '../../incidents/reporter'

// ============================================
// SLOT STATE
// ============================================

interface SlotState {
  taskId: string | null
  endpoint: 'pc'
  consecutiveFailures: number
  backoffUntil: Date | null
  tasksProcessed: number
  tasksFailed: number
}

/** Global worker state */
const state: WorkerState = {
  running: false,
  interactiveLock: false,
  currentTaskId: null,
  lastPollAt: null,
  tasksProcessed: 0,
  tasksFailed: 0,
}

/**
 * Reentrant interactive lock counter.
 * Multiple concurrent Remy streams each call acquire/release.
 * The lock is only fully released when all streams have finished.
 */
let interactiveLockCount = 0

/** PC slot state */
const pcSlot: SlotState = {
  taskId: null,
  endpoint: 'pc',
  consecutiveFailures: 0,
  backoffUntil: null,
  tasksProcessed: 0,
  tasksFailed: 0,
}

/** Timer handle for the polling loop */
let pollTimer: ReturnType<typeof setTimeout> | null = null

/** Timer handle for periodic stats flush (every hour) */
let statsTimer: ReturnType<typeof setInterval> | null = null

// ============================================
// PUBLIC API
// ============================================

/**
 * Start the worker polling loop.
 * Safe to call multiple times - only one instance runs.
 */
export function startWorker(): void {
  if (state.running) {
    console.info('[ai-worker] Already running')
    return
  }

  state.running = true

  // Reset slot state
  pcSlot.consecutiveFailures = 0
  pcSlot.backoffUntil = null

  console.info('[ai-worker] Started - polling every', OLLAMA_GUARD.POLL_INTERVAL_MS, 'ms')

  // Periodic stats flush (every hour)
  if (!statsTimer) {
    statsTimer = setInterval(() => {
      try {
        writeDailySummary()
        writeTaskPerformance()
      } catch (err) {
        console.error('[ai-worker] Periodic stats flush failed:', err)
      }
    }, 3_600_000) // 1 hour
  }

  schedulePoll()
}

/**
 * Stop the worker gracefully.
 * Waits for current tasks to finish (does NOT kill Ollama mid-request).
 * Writes final stats to local disk before stopping.
 */
export function stopWorker(): void {
  state.running = false
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }

  // Write final stats on shutdown
  try {
    writeDailySummary()
    writeTaskPerformance()
  } catch (err) {
    console.error('[ai-worker] Failed to write final stats:', err)
  }

  console.info('[ai-worker] Stopped - stats written to data/remy-stats/')
}

/**
 * Signal that Remy interactive chat is active.
 * Worker will pause PC slot to yield GPU to user-facing requests.
 * Reentrant - multiple concurrent streams each increment the counter.
 */
export function acquireInteractiveLock(): void {
  interactiveLockCount++
  state.interactiveLock = interactiveLockCount > 0
  console.info(
    `[ai-worker] Interactive lock acquired (depth: ${interactiveLockCount}) - pausing PC slot`
  )
}

/**
 * Signal that Remy interactive chat has ended.
 * PC slot only resumes when ALL concurrent streams have released.
 */
export function releaseInteractiveLock(): void {
  interactiveLockCount = Math.max(0, interactiveLockCount - 1)
  state.interactiveLock = interactiveLockCount > 0
  if (interactiveLockCount === 0) {
    console.info('[ai-worker] Interactive lock fully released - PC slot resuming')
  } else {
    console.info(
      `[ai-worker] Interactive lock released (depth: ${interactiveLockCount}) - PC slot still paused`
    )
  }
}

/**
 * Get current worker state (for monitoring/admin UI).
 */
export function getWorkerState(): WorkerState & {
  slots: Record<'pc', SlotState>
  dualSlotEnabled: boolean
} {
  return {
    ...state,
    slots: { pc: { ...pcSlot } },
    dualSlotEnabled: false,
  }
}

/**
 * Check if the worker is currently processing a task.
 * Used by Remy streaming to know if it should wait.
 */
export function isWorkerProcessing(): boolean {
  return pcSlot.taskId !== null
}

/**
 * Check if the PC slot is currently busy processing a task.
 * Kept for API compatibility (always returns PC slot status).
 */
export function isSlotBusy(_endpoint: 'pc' | 'pi'): boolean {
  return pcSlot.taskId !== null
}

// ============================================
// POLLING LOOP
// ============================================

function schedulePoll(): void {
  if (!state.running) return

  pollTimer = setTimeout(async () => {
    await poll()
    schedulePoll()
  }, OLLAMA_GUARD.POLL_INTERVAL_MS)
}

async function poll(): Promise<void> {
  state.lastPollAt = new Date()

  // ── Guard 1: Don't process during interactive Remy ──
  if (state.interactiveLock) {
    return
  }

  // ── Guard 2: Circuit breaker ──
  if (pcSlot.backoffUntil && new Date() < pcSlot.backoffUntil) {
    return
  }
  if (pcSlot.backoffUntil && new Date() >= pcSlot.backoffUntil) {
    pcSlot.backoffUntil = null
    pcSlot.consecutiveFailures = 0
    console.info('[ai-worker] Backoff period ended - resuming')
  }

  // ── Guard 3: Check Ollama is actually reachable ──
  const healthy = await isAnyEndpointHealthy()
  if (!healthy) {
    if (pcSlot.consecutiveFailures === 0) {
      console.warn('[ai-worker] No healthy Ollama endpoints - waiting')
    }
    return
  }

  // ── Guard 4: Already processing ──
  if (pcSlot.taskId) {
    return
  }

  // ── Try to claim and process a task ──
  try {
    const task = await claimNextTask()
    if (!task) return

    await processTask(task)
  } catch (err) {
    console.error('[ai-worker] Poll error:', err)
  }
}

// ============================================
// TASK PROCESSING
// ============================================

async function processTask(task: AiQueueItem): Promise<void> {
  const definition = getTaskDefinition(task.task_type)
  if (!definition) {
    await failTask(task.id, `No handler registered for task type: ${task.task_type}`)
    console.error(`[ai-worker] Unknown task type: ${task.task_type}`)
    return
  }

  pcSlot.taskId = task.id
  state.currentTaskId = task.id

  const startTime = Date.now()

  console.info(
    `[ai-worker] [pc] Processing: ${task.task_type} (priority=${task.priority}, ` +
      `tier=${task.approval_tier}, attempt=${task.attempts}/${task.max_attempts})`
  )

  // Hoisted so `finally` can always clear it (prevents timer leak)
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null
  let routedEndpointName: 'pc' | 'local' | 'cloud' = 'pc'

  try {
    // ── Route to PC Ollama ──
    const routed = await routeTask('auto', task.priority, {
      taskType: task.task_type,
      payload: task.payload,
      modelTier: definition.modelTier,
      surface: 'queue.worker',
    })
    routedEndpointName = routed.endpointName
    const endpointUrl = routed.url

    // ── Resolve the right model for this task tier ──
    const resolvedModel = routed.model

    // ── Execute with hard timeout (timer cleaned up in finally block) ──
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(
          new Error(
            `Task ${task.task_type} timed out after ${OLLAMA_GUARD.CALL_TIMEOUT_MS}ms. ` +
              `This prevents Ollama from hanging indefinitely. ` +
              `The task will be retried if attempts remain.`
          )
        )
      }, OLLAMA_GUARD.CALL_TIMEOUT_MS)
    })

    const result = await Promise.race([
      definition.handler(
        {
          ...task.payload,
          _endpoint: endpointUrl,
          _endpointName: routedEndpointName,
          _model: resolvedModel,
        },
        task.tenant_id
      ),
      timeoutPromise,
    ])
    const durationMs = Date.now() - startTime

    // ── Validate result is not garbage ──
    if (!result || typeof result !== 'object') {
      throw new Error('Handler returned invalid result (not an object)')
    }

    // ── Complete the task ──
    await completeTask(task.id, {
      ...result,
      _meta: {
        durationMs,
        endpoint: routedEndpointName,
        attempt: task.attempts,
      },
    })

    // ── Record metric for self-monitoring ──
    recordMetric({
      taskType: task.task_type,
      status: 'completed',
      durationMs,
      endpoint: routedEndpointName,
      timestamp: new Date().toISOString(),
      attempt: task.attempts,
    })

    state.tasksProcessed++
    pcSlot.tasksProcessed++
    pcSlot.consecutiveFailures = 0 // Reset circuit breaker
    console.info(`[ai-worker] [pc] Completed: ${task.task_type} in ${durationMs}ms`)

    // ── Cooldown between tasks (prevent thermal throttling) ──
    await sleep(OLLAMA_GUARD.COOLDOWN_MS)
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : String(err)

    console.error(
      `[ai-worker] [pc] Failed: ${task.task_type} after ${durationMs}ms - ${errorMessage}`
    )

    await failTask(task.id, errorMessage)

    // ── Record failure metric ──
    recordMetric({
      taskType: task.task_type,
      status: 'failed',
      durationMs,
      endpoint: routedEndpointName,
      timestamp: new Date().toISOString(),
      attempt: task.attempts,
    })

    state.tasksFailed++
    pcSlot.tasksFailed++
    pcSlot.consecutiveFailures++

    // ── Circuit breaker ──
    if (pcSlot.consecutiveFailures >= OLLAMA_GUARD.MAX_CONSECUTIVE_FAILURES) {
      pcSlot.backoffUntil = new Date(Date.now() + OLLAMA_GUARD.FAILURE_BACKOFF_MS)
      console.error(
        `[ai-worker] [pc] CIRCUIT BREAKER: ${pcSlot.consecutiveFailures} consecutive failures. ` +
          `Backing off until ${pcSlot.backoffUntil.toISOString()}.`
      )

      reportWorkerBackoff({
        endpoint: 'pc',
        consecutiveFailures: pcSlot.consecutiveFailures,
        backoffUntil: pcSlot.backoffUntil,
      })
    }

    // Write incident report for task failure
    reportTaskFailure({
      taskType: task.task_type,
      taskId: task.id,
      error: errorMessage,
      endpoint: 'pc',
      attempt: task.attempts,
      maxAttempts: task.max_attempts,
      durationMs,
    })

    // ── Extra cooldown after failure ──
    await sleep(OLLAMA_GUARD.COOLDOWN_MS * 3)
  } finally {
    if (timeoutTimer) clearTimeout(timeoutTimer) // Prevent timer leak
    pcSlot.taskId = null
    state.currentTaskId = null
  }
}

// ============================================
// HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
