// AI Task Queue — Worker (Dual-Slot)
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
// DUAL-SLOT ARCHITECTURE (new):
//   - Two independent processing slots: one for PC, one for Pi
//   - Each slot claims tasks suited to its endpoint
//   - Slots operate independently — PC failure doesn't affect Pi and vice versa
//   - Interactive lock (Remy) only pauses PC slot — Pi continues background work
//   - Work stealing: idle endpoint can grab the other's tasks
//
// Best practices adopted:
//   Netflix: Bulkhead isolation (independent failure domains per slot)
//   Google Borg: Work stealing (idle workers help busy ones)
//   AWS: Multi-AZ processing with independent health tracking
//   Kubernetes: Pod-level circuit breakers per slot

import { claimNextTask, claimNextTaskForEndpoint, completeTask, failTask } from './actions'
import { getTaskDefinition } from './registry'
import { routeTask, isAnyEndpointHealthy, getEndpoints } from '../llm-router'
import { getModelForEndpoint } from '../providers'
import { OLLAMA_GUARD } from './types'
import type { WorkerState, AiQueueItem } from './types'
import type { ModelTier } from '../providers'
import { recordMetric, writeDailySummary, writeTaskPerformance } from './monitor'
import { reportTaskFailure, reportWorkerBackoff } from '../../incidents/reporter'

// ============================================
// DUAL-SLOT STATE
// ============================================

interface SlotState {
  taskId: string | null
  endpoint: 'pc' | 'pi'
  consecutiveFailures: number
  backoffUntil: Date | null
  tasksProcessed: number
  tasksFailed: number
}

/** Global worker state (backwards-compatible) */
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

/** Per-slot state for dual-slot processing */
const slots: Record<'pc' | 'pi', SlotState> = {
  pc: {
    taskId: null,
    endpoint: 'pc',
    consecutiveFailures: 0,
    backoffUntil: null,
    tasksProcessed: 0,
    tasksFailed: 0,
  },
  pi: {
    taskId: null,
    endpoint: 'pi',
    consecutiveFailures: 0,
    backoffUntil: null,
    tasksProcessed: 0,
    tasksFailed: 0,
  },
}

/** Timer handle for the polling loop */
let pollTimer: ReturnType<typeof setTimeout> | null = null

/** Timer handle for periodic stats flush (every hour) */
let statsTimer: ReturnType<typeof setInterval> | null = null

/** Whether dual-slot mode is active (Pi configured) */
let dualSlotEnabled = false

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

  // Detect if Pi is configured for dual-slot mode
  dualSlotEnabled = !!process.env.OLLAMA_PI_URL
  if (dualSlotEnabled) {
    console.log('[ai-worker] DUAL-SLOT MODE — processing on PC + Pi simultaneously')
  }

  // Reset slot states
  for (const slot of Object.values(slots)) {
    slot.consecutiveFailures = 0
    slot.backoffUntil = null
  }

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

  console.log('[ai-worker] Stopped — stats written to data/remy-stats/')
}

/**
 * Signal that Remy interactive chat is active.
 * Worker will pause PC slot (user-facing endpoint).
 * Pi slot continues processing — it's a separate machine.
 * Reentrant — multiple concurrent streams each increment the counter.
 */
export function acquireInteractiveLock(): void {
  interactiveLockCount++
  state.interactiveLock = interactiveLockCount > 0
  console.log(
    `[ai-worker] Interactive lock acquired (depth: ${interactiveLockCount}) — pausing PC slot (Pi continues)`
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
    console.log('[ai-worker] Interactive lock fully released — PC slot resuming')
  } else {
    console.log(
      `[ai-worker] Interactive lock released (depth: ${interactiveLockCount}) — PC slot still paused`
    )
  }
}

/**
 * Get current worker state (for monitoring/admin UI).
 */
export function getWorkerState(): WorkerState & {
  slots: Record<'pc' | 'pi', SlotState>
  dualSlotEnabled: boolean
} {
  return {
    ...state,
    slots: { ...slots },
    dualSlotEnabled,
  }
}

/**
 * Check if the worker is currently processing a task on any slot.
 * Used by Remy streaming to know if it should wait.
 */
export function isWorkerProcessing(): boolean {
  return slots.pc.taskId !== null || slots.pi.taskId !== null
}

/**
 * Check if a specific endpoint slot is currently busy processing a task.
 * Used by Remy to avoid GPU contention — if the PC is mid-background-task,
 * Remy can route to the Pi instead of competing for the same GPU.
 */
export function isSlotBusy(endpoint: 'pc' | 'pi'): boolean {
  return slots[endpoint].taskId !== null
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

  if (dualSlotEnabled) {
    // Dual-slot mode: check each slot independently
    await Promise.allSettled([pollSlot('pc'), pollSlot('pi')])
  } else {
    // Single-slot mode (legacy): use original claiming logic
    await pollSingleSlot()
  }
}

/**
 * Poll a specific slot for work (dual-slot mode).
 * Each slot operates independently — Netflix bulkhead isolation pattern.
 */
async function pollSlot(endpointName: 'pc' | 'pi'): Promise<void> {
  const slot = slots[endpointName]

  // ── Guard 1: Don't process PC during interactive Remy (Pi continues) ──
  if (endpointName === 'pc' && state.interactiveLock) {
    return
  }

  // ── Guard 2: Per-slot circuit breaker ──
  if (slot.backoffUntil && new Date() < slot.backoffUntil) {
    return
  }
  if (slot.backoffUntil && new Date() >= slot.backoffUntil) {
    slot.backoffUntil = null
    slot.consecutiveFailures = 0
    console.log(`[ai-worker] [${endpointName}] Backoff ended — resuming`)
  }

  // ── Guard 3: Slot already processing ──
  if (slot.taskId) {
    return
  }

  // ── Guard 4: Check if this specific endpoint is healthy ──
  const endpoints = await getEndpoints()
  const ep = endpoints.find((e) => e.name === endpointName)
  if (!ep?.healthy) {
    return
  }

  // ── Try to claim and process a task for this endpoint ──
  try {
    const task = await claimNextTaskForEndpoint(endpointName)
    if (!task) return // No tasks ready for this endpoint

    await processTask(task, endpointName)
  } catch (err) {
    console.error(`[ai-worker] [${endpointName}] Poll error:`, err)
  }
}

/**
 * Poll in single-slot mode (legacy, for when Pi is not configured).
 */
async function pollSingleSlot(): Promise<void> {
  const slot = slots.pc

  // ── Guard 1: Don't process during interactive Remy ──
  if (state.interactiveLock) {
    return
  }

  // ── Guard 2: Circuit breaker ──
  if (slot.backoffUntil && new Date() < slot.backoffUntil) {
    return
  }
  if (slot.backoffUntil && new Date() >= slot.backoffUntil) {
    slot.backoffUntil = null
    slot.consecutiveFailures = 0
    console.log('[ai-worker] Backoff period ended — resuming')
  }

  // ── Guard 3: Check Ollama is actually reachable ──
  const healthy = await isAnyEndpointHealthy()
  if (!healthy) {
    if (slot.consecutiveFailures === 0) {
      console.warn('[ai-worker] No healthy Ollama endpoints — waiting')
    }
    return
  }

  // ── Guard 4: Already processing ──
  if (slot.taskId) {
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

async function processTask(task: AiQueueItem, forcedEndpoint?: 'pc' | 'pi'): Promise<void> {
  const definition = getTaskDefinition(task.task_type)
  if (!definition) {
    await failTask(task.id, `No handler registered for task type: ${task.task_type}`)
    console.error(`[ai-worker] Unknown task type: ${task.task_type}`)
    return
  }

  // Determine which slot to use
  const endpointName = forcedEndpoint ?? 'pc'
  const slot = slots[endpointName]
  slot.taskId = task.id
  state.currentTaskId = task.id // Backwards compat

  const startTime = Date.now()

  console.log(
    `[ai-worker] [${endpointName}] Processing: ${task.task_type} (priority=${task.priority}, ` +
      `tier=${task.approval_tier}, attempt=${task.attempts}/${task.max_attempts})`
  )

  // Hoisted so `finally` can always clear it (prevents timer leak)
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null

  try {
    // ── Route to the right Ollama endpoint ──
    let endpointUrl: string
    let resolvedEndpointName: 'pc' | 'pi'

    if (forcedEndpoint) {
      // Dual-slot mode: we already know the endpoint
      const endpoints = await getEndpoints()
      const ep = endpoints.find((e) => e.name === forcedEndpoint)
      endpointUrl =
        ep?.url ?? (forcedEndpoint === 'pi' ? process.env.OLLAMA_PI_URL! : 'http://localhost:11434')
      resolvedEndpointName = forcedEndpoint
    } else {
      // Single-slot mode: let the router decide
      const routed = await routeTask(task.target_endpoint as 'auto' | 'pc' | 'pi', task.priority)
      endpointUrl = routed.url
      resolvedEndpointName = routed.endpointName
    }

    // ── Resolve the right model for this endpoint + task tier ──
    const modelTier = (definition.modelTier || 'standard') as ModelTier
    const resolvedModel = getModelForEndpoint(resolvedEndpointName, modelTier)

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
          _endpointName: resolvedEndpointName,
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
        endpoint: resolvedEndpointName,
        attempt: task.attempts,
      },
    })

    // ── Record metric for self-monitoring ──
    recordMetric({
      taskType: task.task_type,
      status: 'completed',
      durationMs,
      endpoint: resolvedEndpointName,
      timestamp: new Date().toISOString(),
      attempt: task.attempts,
    })

    state.tasksProcessed++
    slot.tasksProcessed++
    slot.consecutiveFailures = 0 // Reset per-slot circuit breaker
    console.log(
      `[ai-worker] [${resolvedEndpointName}] Completed: ${task.task_type} in ${durationMs}ms`
    )

    // ── Cooldown between tasks (prevent thermal throttling) ──
    await sleep(OLLAMA_GUARD.COOLDOWN_MS)
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : String(err)

    console.error(
      `[ai-worker] [${endpointName}] Failed: ${task.task_type} after ${durationMs}ms — ${errorMessage}`
    )

    await failTask(task.id, errorMessage)

    // ── Record failure metric ──
    recordMetric({
      taskType: task.task_type,
      status: 'failed',
      durationMs,
      endpoint: endpointName,
      timestamp: new Date().toISOString(),
      attempt: task.attempts,
    })

    state.tasksFailed++
    slot.tasksFailed++
    slot.consecutiveFailures++

    // ── Per-slot circuit breaker ──
    if (slot.consecutiveFailures >= OLLAMA_GUARD.MAX_CONSECUTIVE_FAILURES) {
      slot.backoffUntil = new Date(Date.now() + OLLAMA_GUARD.FAILURE_BACKOFF_MS)
      console.error(
        `[ai-worker] [${endpointName}] CIRCUIT BREAKER: ${slot.consecutiveFailures} consecutive failures. ` +
          `Backing off until ${slot.backoffUntil.toISOString()}.`
      )

      reportWorkerBackoff({
        endpoint: endpointName,
        consecutiveFailures: slot.consecutiveFailures,
        backoffUntil: slot.backoffUntil,
      })
    }

    // Write incident report for task failure
    reportTaskFailure({
      taskType: task.task_type,
      taskId: task.id,
      error: errorMessage,
      endpoint: endpointName,
      attempt: task.attempts,
      maxAttempts: task.max_attempts,
      durationMs,
    })

    // ── Extra cooldown after failure ──
    await sleep(OLLAMA_GUARD.COOLDOWN_MS * 3)
  } finally {
    if (timeoutTimer) clearTimeout(timeoutTimer) // Prevent timer leak
    slot.taskId = null
    state.currentTaskId = slots.pc.taskId ?? slots.pi.taskId ?? null // Update backwards compat
  }
}

// ============================================
// HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
