// AI Task Queue — Worker
// No 'use server' — singleton module, runs inside Next.js process.
//
// SAFETY-FIRST DESIGN:
//   1. Ollama can NEVER be maxed out — cooldown between tasks, yield to Remy
//   2. Infinite loops are IMPOSSIBLE — max consecutive failures → backoff → stop
//   3. Self-monitoring — logs everything, detects anomalies, auto-pauses
//   4. Graceful shutdown — stops cleanly, no orphaned tasks
//   5. Privacy — worker NEVER sends data to cloud; ALL processing is local Ollama
//   6. Hallucination guard — structured output with validation, not free-form text
//   7. Cost-free — local LLM, local queue, zero API charges
//
// The worker polls the queue for pending tasks and processes them one at a time.
// It yields to interactive Remy chat — if the user opens the drawer, the worker
// pauses until Remy is done. The user's experience always comes first.

import { claimNextTask, completeTask, failTask } from './actions'
import { getTaskDefinition } from './registry'
import { routeTask, isAnyEndpointHealthy } from '../llm-router'
import { OLLAMA_GUARD } from './types'
import type { WorkerState, AiQueueItem } from './types'
import { recordMetric, writeDailySummary, writeTaskPerformance } from './monitor'

// ============================================
// SINGLETON STATE
// ============================================

const state: WorkerState = {
  running: false,
  interactiveLock: false,
  currentTaskId: null,
  lastPollAt: null,
  tasksProcessed: 0,
  tasksFailed: 0,
}

/** Track consecutive failures for circuit breaker */
let consecutiveFailures = 0

/** Timer handle for the polling loop */
let pollTimer: ReturnType<typeof setTimeout> | null = null

/** Track whether we're in backoff mode */
let backoffUntil: Date | null = null

/** Timer handle for periodic stats flush (every hour) */
let statsTimer: ReturnType<typeof setInterval> | null = null

// ============================================
// PUBLIC API
// ============================================

/**
 * Start the worker polling loop.
 * Safe to call multiple times — only one instance runs.
 */
export function startWorker(): void {
  if (state.running) {
    console.log('[ai-worker] Already running')
    return
  }

  state.running = true
  consecutiveFailures = 0
  backoffUntil = null
  console.log('[ai-worker] Started — polling every', OLLAMA_GUARD.POLL_INTERVAL_MS, 'ms')

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
 * Waits for the current task to finish (does NOT kill Ollama mid-request).
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

  console.log('[ai-worker] Stopped — stats written to data/remy-stats/')
}

/**
 * Signal that Remy interactive chat is active.
 * Worker will pause processing until released.
 */
export function acquireInteractiveLock(): void {
  state.interactiveLock = true
  console.log('[ai-worker] Interactive lock acquired — pausing background tasks')
}

/**
 * Signal that Remy interactive chat has ended.
 * Worker resumes processing.
 */
export function releaseInteractiveLock(): void {
  state.interactiveLock = false
  console.log('[ai-worker] Interactive lock released — resuming background tasks')
}

/**
 * Get current worker state (for monitoring/admin UI).
 */
export function getWorkerState(): WorkerState & {
  consecutiveFailures: number
  backoffUntil: Date | null
} {
  return {
    ...state,
    consecutiveFailures,
    backoffUntil,
  }
}

/**
 * Check if the worker is currently processing a task.
 * Used by Remy streaming to know if it should wait.
 */
export function isWorkerProcessing(): boolean {
  return state.currentTaskId !== null
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

  // ── Guard 2: Circuit breaker — too many consecutive failures ──
  if (backoffUntil && new Date() < backoffUntil) {
    return
  }
  if (backoffUntil && new Date() >= backoffUntil) {
    // Backoff period is over — reset
    backoffUntil = null
    consecutiveFailures = 0
    console.log('[ai-worker] Backoff period ended — resuming')
  }

  // ── Guard 3: Check Ollama is actually reachable ──
  const healthy = await isAnyEndpointHealthy()
  if (!healthy) {
    // Don't log every 3 seconds — only on transition
    if (consecutiveFailures === 0) {
      console.warn('[ai-worker] No healthy Ollama endpoints — waiting')
    }
    return
  }

  // ── Guard 4: Already processing (shouldn't happen, but be safe) ──
  if (state.currentTaskId) {
    return
  }

  // ── Try to claim and process a task ──
  try {
    const task = await claimNextTask()
    if (!task) return // No tasks ready

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

  state.currentTaskId = task.id
  const startTime = Date.now()

  console.log(
    `[ai-worker] Processing: ${task.task_type} (priority=${task.priority}, ` +
      `tier=${task.approval_tier}, attempt=${task.attempts}/${task.max_attempts})`
  )

  try {
    // ── Route to the right Ollama endpoint ──
    const endpoint = await routeTask(task.target_endpoint as 'auto' | 'pc' | 'pi', task.priority)

    // ── Execute with hard timeout ──
    const result = await Promise.race([
      definition.handler(
        { ...task.payload, _endpoint: endpoint.url, _endpointName: endpoint.endpointName },
        task.tenant_id
      ),
      createTimeout(OLLAMA_GUARD.CALL_TIMEOUT_MS, task.task_type),
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
        endpoint: endpoint.endpointName,
        attempt: task.attempts,
      },
    })

    // ── Record metric for self-monitoring ──
    recordMetric({
      taskType: task.task_type,
      status: 'completed',
      durationMs,
      endpoint: endpoint.endpointName,
      timestamp: new Date().toISOString(),
      attempt: task.attempts,
    })

    state.tasksProcessed++
    consecutiveFailures = 0 // Reset circuit breaker
    console.log(
      `[ai-worker] Completed: ${task.task_type} in ${durationMs}ms ` +
        `(endpoint=${endpoint.endpointName})`
    )

    // ── Cooldown between tasks (prevent thermal throttling) ──
    await sleep(OLLAMA_GUARD.COOLDOWN_MS)
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : String(err)

    console.error(`[ai-worker] Failed: ${task.task_type} after ${durationMs}ms — ${errorMessage}`)

    await failTask(task.id, errorMessage)

    // ── Record failure metric ──
    recordMetric({
      taskType: task.task_type,
      status: 'failed',
      durationMs,
      endpoint: 'unknown',
      timestamp: new Date().toISOString(),
      attempt: task.attempts,
    })

    state.tasksFailed++
    consecutiveFailures++

    // ── Circuit breaker ──
    if (consecutiveFailures >= OLLAMA_GUARD.MAX_CONSECUTIVE_FAILURES) {
      backoffUntil = new Date(Date.now() + OLLAMA_GUARD.FAILURE_BACKOFF_MS)
      console.error(
        `[ai-worker] CIRCUIT BREAKER: ${consecutiveFailures} consecutive failures. ` +
          `Backing off until ${backoffUntil.toISOString()}. ` +
          `This prevents Ollama from being overwhelmed.`
      )
    }

    // ── Extra cooldown after failure (don't hammer a struggling Ollama) ──
    await sleep(OLLAMA_GUARD.COOLDOWN_MS * 3)
  } finally {
    state.currentTaskId = null
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Creates a promise that rejects after a timeout.
 * Used with Promise.race to enforce hard time limits on Ollama calls.
 */
function createTimeout(ms: number, taskType: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Task ${taskType} timed out after ${ms}ms. ` +
            `This prevents Ollama from hanging indefinitely. ` +
            `The task will be retried if attempts remain.`
        )
      )
    }, ms)
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
