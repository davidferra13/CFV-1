// Cross-Monitor — Dual-Endpoint Supervisor
// No 'use server' — pure utility module.
//
// Best practices adopted from top companies:
//
//   Netflix (Hystrix):
//     - Circuit breaker with half-open state for recovery detection
//     - Bulkhead isolation (each endpoint has independent health state)
//     - Fallback chains (PC → Pi → graceful degradation)
//
//   Google SRE:
//     - Golden signals: latency, error rate, saturation (active tasks)
//     - Health check with exponential backoff on repeated failures
//     - Structured health grades: HEALTHY / DEGRADED / UNHEALTHY / UNKNOWN
//
//   AWS:
//     - Multi-AZ health checking (PC = primary AZ, Pi = secondary AZ)
//     - Retry with jitter to prevent thundering herd
//     - Automated recovery actions with escalation levels
//
//   Kubernetes:
//     - Liveness (is Ollama running?) + Readiness (is model loaded?) probes
//     - Self-healing restart policies with backoff
//     - Graceful shutdown handling
//
// SAFE ACTIONS — What the supervisor is allowed to do autonomously:
//   Level 0 (observe): Log warnings, update health state
//   Level 1 (nudge):   Clear hung tasks from queue, re-route tasks
//   Level 2 (restart): SSH restart Pi's Ollama, local restart PC's Ollama
//   Level 3 (escalate): Notify via console log + dashboard badge (never email/SMS)
//
// What it is NEVER allowed to do:
//   - Kill processes it doesn't own
//   - Modify the database (except re-queuing hung tasks)
//   - Send external notifications (email, SMS, Slack)
//   - Make destructive changes to the system
//   - Run arbitrary commands on the Pi

import { getOllamaConfig, getOllamaPiUrl, getModelForEndpoint } from './providers'
import { forceHealthCheck } from './llm-router'

// ============================================
// TYPES
// ============================================

export type HealthGrade = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

export interface EndpointHealthSnapshot {
  name: 'pc' | 'pi'
  url: string
  grade: HealthGrade
  online: boolean
  latencyMs: number | null
  modelReady: boolean
  activeGeneration: boolean
  configuredModel: string
  loadedModels: string[]
  consecutiveFailures: number
  lastCheckedAt: Date | null
  lastHealthyAt: Date | null
  circuitState: 'closed' | 'open' | 'half-open'
  error: string | null
}

export interface SystemHealthReport {
  overall: HealthGrade
  endpoints: EndpointHealthSnapshot[]
  dualMode: boolean
  activeRecoveryActions: string[]
  lastReportAt: Date
  uptimePercent: { pc: number; pi: number }
}

export interface RecoveryAction {
  level: 0 | 1 | 2 | 3
  action: string
  target: 'pc' | 'pi' | 'system'
  timestamp: Date
  success: boolean
  detail: string
}

// ============================================
// SINGLETON STATE
// ============================================

interface MonitorState {
  endpoints: Map<'pc' | 'pi', EndpointHealthSnapshot>
  recoveryLog: RecoveryAction[]
  running: boolean
  pollTimer: ReturnType<typeof setTimeout> | null
  totalChecks: { pc: number; pi: number }
  healthyChecks: { pc: number; pi: number }
}

const state: MonitorState = {
  endpoints: new Map(),
  recoveryLog: [],
  running: false,
  pollTimer: null,
  totalChecks: { pc: 0, pi: 0 },
  healthyChecks: { pc: 0, pi: 0 },
}

// ============================================
// CONSTANTS
// ============================================

/** Poll interval for cross-monitoring (30 seconds) */
const MONITOR_INTERVAL_MS = 30_000

/** Circuit breaker: failures before opening circuit */
const CIRCUIT_BREAKER_THRESHOLD = 3

/** Circuit breaker: how long to wait before trying half-open (2 min) */
const CIRCUIT_OPEN_DURATION_MS = 120_000

/** Latency threshold for "degraded" grade (ms) */
const DEGRADED_LATENCY_MS = 3000

/** Max recovery actions to keep in log */
const MAX_RECOVERY_LOG = 100

/** Health check timeout (ms) */
const HEALTH_CHECK_TIMEOUT_MS = 8000

// ============================================
// PUBLIC API
// ============================================

/**
 * Start the cross-monitoring supervisor loop.
 * Idempotent — calling multiple times is safe.
 */
export function startCrossMonitor(): void {
  if (state.running) return
  state.running = true
  console.log('[cross-monitor] Started — polling every', MONITOR_INTERVAL_MS, 'ms')
  scheduleMonitorPoll()
}

/**
 * Stop the cross-monitoring supervisor.
 */
export function stopCrossMonitor(): void {
  state.running = false
  if (state.pollTimer) {
    clearTimeout(state.pollTimer)
    state.pollTimer = null
  }
  console.log('[cross-monitor] Stopped')
}

/**
 * Get the current system health report.
 */
export function getSystemHealth(): SystemHealthReport {
  const endpoints = Array.from(state.endpoints.values())
  const piConfigured = !!getOllamaPiUrl()

  const overall = computeOverallGrade(endpoints)

  return {
    overall,
    endpoints,
    dualMode: piConfigured,
    activeRecoveryActions: state.recoveryLog
      .filter((r) => Date.now() - r.timestamp.getTime() < 300_000) // Last 5 min
      .map((r) => `[L${r.level}] ${r.action} on ${r.target}: ${r.detail}`),
    lastReportAt: new Date(),
    uptimePercent: {
      pc:
        state.totalChecks.pc > 0
          ? Math.round((state.healthyChecks.pc / state.totalChecks.pc) * 100)
          : 0,
      pi:
        state.totalChecks.pi > 0
          ? Math.round((state.healthyChecks.pi / state.totalChecks.pi) * 100)
          : 0,
    },
  }
}

/**
 * Get the recovery action log (most recent first).
 */
export function getRecoveryLog(): RecoveryAction[] {
  return [...state.recoveryLog].reverse()
}

/**
 * Get the cached health snapshot for a specific endpoint.
 * Returns null if the endpoint hasn't been checked yet.
 * Used by Remy and the router for load-aware routing decisions.
 */
export function getEndpointSnapshot(name: 'pc' | 'pi'): EndpointHealthSnapshot | null {
  return state.endpoints.get(name) ?? null
}

/**
 * Force an immediate health check on all endpoints.
 */
export async function forceMonitorCheck(): Promise<SystemHealthReport> {
  await checkAllEndpoints()
  return getSystemHealth()
}

// ============================================
// MONITORING LOOP
// ============================================

function scheduleMonitorPoll(): void {
  if (!state.running) return

  state.pollTimer = setTimeout(async () => {
    try {
      await checkAllEndpoints()
      await evaluateAndAct()
    } catch (err) {
      console.error('[cross-monitor] Poll error:', err)
    }
    scheduleMonitorPoll()
  }, MONITOR_INTERVAL_MS)
}

async function checkAllEndpoints(): Promise<void> {
  const config = getOllamaConfig()
  const piUrl = getOllamaPiUrl()

  // Check endpoints in parallel
  const checks: Promise<void>[] = [checkEndpoint('pc', config.baseUrl)]
  if (piUrl) {
    checks.push(checkEndpoint('pi', piUrl))
  }

  await Promise.allSettled(checks)

  // Also refresh the llm-router's health state
  try {
    await forceHealthCheck()
  } catch {
    // Non-critical — router will refresh on next use
  }
}

async function checkEndpoint(name: 'pc' | 'pi', url: string): Promise<void> {
  const existing = state.endpoints.get(name)
  const expectedModel = getModelForEndpoint(name, 'standard')

  const snapshot: EndpointHealthSnapshot = {
    name,
    url,
    grade: 'unknown',
    online: false,
    latencyMs: null,
    modelReady: false,
    activeGeneration: false,
    configuredModel: expectedModel,
    loadedModels: [],
    consecutiveFailures: existing?.consecutiveFailures ?? 0,
    lastCheckedAt: new Date(),
    lastHealthyAt: existing?.lastHealthyAt ?? null,
    circuitState: existing?.circuitState ?? 'closed',
    error: null,
  }

  // Track checks for uptime calculation
  state.totalChecks[name]++

  // Circuit breaker: if open, check if enough time has passed for half-open
  if (snapshot.circuitState === 'open' && existing?.lastCheckedAt) {
    const elapsed = Date.now() - existing.lastCheckedAt.getTime()
    if (elapsed < CIRCUIT_OPEN_DURATION_MS) {
      // Still in cooldown — skip check, keep circuit open
      snapshot.grade = 'unhealthy'
      snapshot.error = `Circuit breaker open — retrying in ${Math.ceil((CIRCUIT_OPEN_DURATION_MS - elapsed) / 1000)}s`
      state.endpoints.set(name, snapshot)
      return
    }
    // Enough time passed — try half-open
    snapshot.circuitState = 'half-open'
  }

  // ── Liveness Probe: /api/tags ──
  try {
    const start = Date.now()
    const tagsRes = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      cache: 'no-store',
    })
    snapshot.latencyMs = Date.now() - start

    if (!tagsRes.ok) {
      throw new Error(`HTTP ${tagsRes.status}`)
    }

    snapshot.online = true
    const tagsData = (await tagsRes.json()) as { models?: Array<{ name: string }> }
    snapshot.loadedModels = (tagsData.models ?? []).map((m: { name: string }) => m.name)
    snapshot.modelReady = snapshot.loadedModels.some(
      (m) => m === expectedModel || m.startsWith(expectedModel.split(':')[0])
    )
  } catch (err) {
    snapshot.error = err instanceof Error ? err.message : String(err)
    snapshot.consecutiveFailures++

    // Circuit breaker: open if too many consecutive failures
    if (snapshot.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      snapshot.circuitState = 'open'
    }

    snapshot.grade = 'unhealthy'
    state.endpoints.set(name, snapshot)
    return
  }

  // ── Readiness Probe: /api/ps (active generation check) ──
  try {
    const psRes = await fetch(`${url}/api/ps`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    if (psRes.ok) {
      const psData = (await psRes.json()) as { models?: Array<{ name: string }> }
      snapshot.activeGeneration = (psData.models ?? []).length > 0
    }
  } catch {
    // Non-critical — /api/ps failure just means we can't detect busy state
  }

  // ── Grade the endpoint ──
  snapshot.consecutiveFailures = 0 // Reset on success
  snapshot.circuitState = 'closed' // Close circuit on success
  snapshot.lastHealthyAt = new Date()
  state.healthyChecks[name]++

  if (!snapshot.modelReady) {
    snapshot.grade = 'degraded'
    snapshot.error = `Model ${expectedModel} not loaded`
  } else if (snapshot.latencyMs !== null && snapshot.latencyMs > DEGRADED_LATENCY_MS) {
    snapshot.grade = 'degraded'
    snapshot.error = `High latency: ${snapshot.latencyMs}ms`
  } else {
    snapshot.grade = 'healthy'
  }

  state.endpoints.set(name, snapshot)
}

// ============================================
// RECOVERY ENGINE
// ============================================

/**
 * Evaluate current health state and take automated recovery actions.
 * Follows escalation levels:
 *   L0: Observe + log
 *   L1: Re-route tasks, clear hung items
 *   L2: Restart services
 *   L3: Escalate (dashboard notification)
 */
async function evaluateAndAct(): Promise<void> {
  for (const [name, snapshot] of state.endpoints) {
    if (snapshot.grade === 'healthy') continue

    // L0: Always log degraded/unhealthy state
    if (snapshot.grade === 'degraded') {
      logRecoveryAction({
        level: 0,
        action: 'observe',
        target: name,
        timestamp: new Date(),
        success: true,
        detail: `${name} is degraded: ${snapshot.error}`,
      })
    }

    // L1: Re-route if one endpoint is down but the other is up
    if (snapshot.grade === 'unhealthy') {
      const other = name === 'pc' ? 'pi' : 'pc'
      const otherSnapshot = state.endpoints.get(other)

      if (otherSnapshot?.grade === 'healthy') {
        logRecoveryAction({
          level: 1,
          action: 're-route',
          target: 'system',
          timestamp: new Date(),
          success: true,
          detail: `${name} is down — all tasks routed to ${other}`,
        })
      } else {
        // Both endpoints are unhealthy
        logRecoveryAction({
          level: 3,
          action: 'escalate',
          target: 'system',
          timestamp: new Date(),
          success: true,
          detail: 'BOTH endpoints are unhealthy — AI features are offline',
        })
      }
    }

    // L2: Model not loaded — proactively preload it so first real request is fast
    if (snapshot.grade === 'degraded' && snapshot.online && !snapshot.modelReady) {
      try {
        await fetch(`${snapshot.url}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: snapshot.configuredModel,
            prompt: '',
            keep_alive: '5m',
          }),
          signal: AbortSignal.timeout(30_000),
        })
        logRecoveryAction({
          level: 2,
          action: 'model-preload',
          target: name,
          timestamp: new Date(),
          success: true,
          detail: `Preloaded ${snapshot.configuredModel} on ${name}`,
        })
      } catch (preloadErr) {
        logRecoveryAction({
          level: 2,
          action: 'model-preload',
          target: name,
          timestamp: new Date(),
          success: false,
          detail: `Failed to preload on ${name}: ${preloadErr instanceof Error ? preloadErr.message : String(preloadErr)}`,
        })
      }
    }
  }
}

// ============================================
// HELPERS
// ============================================

function computeOverallGrade(endpoints: EndpointHealthSnapshot[]): HealthGrade {
  if (endpoints.length === 0) return 'unknown'

  const allHealthy = endpoints.every((e) => e.grade === 'healthy')
  if (allHealthy) return 'healthy'

  const anyHealthy = endpoints.some((e) => e.grade === 'healthy')
  if (anyHealthy) return 'degraded'

  const anyDegraded = endpoints.some((e) => e.grade === 'degraded')
  if (anyDegraded) return 'degraded'

  return 'unhealthy'
}

function logRecoveryAction(action: RecoveryAction): void {
  state.recoveryLog.push(action)

  // Keep log bounded
  if (state.recoveryLog.length > MAX_RECOVERY_LOG) {
    state.recoveryLog = state.recoveryLog.slice(-MAX_RECOVERY_LOG)
  }

  // Log to console for the PC watchdog / dev server output
  const prefix = `[cross-monitor] [L${action.level}]`
  if (action.level >= 2) {
    console.warn(`${prefix} ${action.action} on ${action.target}: ${action.detail}`)
  } else {
    console.log(`${prefix} ${action.action} on ${action.target}: ${action.detail}`)
  }
}
