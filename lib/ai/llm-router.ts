// LLM Router - Single-Endpoint Routing for Ollama
// No 'use server' - pure utility, importable anywhere server-side.
//
// Routes all AI tasks to the PC Ollama at localhost:11434.
// Pi is permanently retired. No dual-endpoint routing.

import { getOllamaConfig, getModelForEndpoint } from './providers'
import type { LlmEndpoint } from './queue/types'
import { AI_PRIORITY } from './queue/types'
import { reportHealthDegraded } from '../incidents/reporter'

// ============================================
// ENDPOINT TYPES
// ============================================

export interface OllamaEndpoint {
  name: 'pc'
  url: string
  healthy: boolean
  lastCheckedAt: Date | null
  latencyMs: number | null
}

interface RouterState {
  endpoints: OllamaEndpoint[]
  lastHealthCheck: Date | null
  /** Don't hammer health checks - minimum 60s between checks.
   *  The badge also polls /api/tags separately, so keep this relaxed
   *  to avoid double-polling Ollama every few seconds. */
  healthCheckCooldownMs: number
}

// ============================================
// SINGLETON STATE
// ============================================

const state: RouterState = {
  endpoints: [],
  lastHealthCheck: null,
  healthCheckCooldownMs: 60_000,
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Returns the PC Ollama endpoint with current health status.
 * Runs health check if stale (>60s since last check).
 */
export async function getEndpoints(): Promise<OllamaEndpoint[]> {
  await refreshIfStale()
  return [...state.endpoints]
}

/**
 * Picks the PC endpoint for a task. Always returns PC.
 * Kept for API compatibility with callers that use routing logic.
 */
export async function routeTask(
  _preferredEndpoint: LlmEndpoint = 'auto',
  _priority: number = AI_PRIORITY.SCHEDULED
): Promise<{ url: string; endpointName: 'pc' }> {
  await refreshIfStale()

  const pc = state.endpoints.find((e) => e.name === 'pc')
  if (pc?.healthy) {
    return { url: pc.url, endpointName: 'pc' }
  }

  // PC unhealthy - return URL anyway and let the caller handle the error
  const defaultUrl = getOllamaConfig().baseUrl
  return { url: defaultUrl, endpointName: 'pc' }
}

/**
 * Route a Remy chat request. Returns full endpoint config or null if offline.
 * Convenience wrapper around routeTask() for the Remy streaming route.
 */
export async function routeForRemy(_opts?: { preferEndpoint?: LlmEndpoint }): Promise<{
  host: string
  model: string
  endpointName: 'pc'
} | null> {
  const healthy = await isAnyEndpointHealthy()
  if (!healthy) return null

  const { url } = await routeTask('auto', AI_PRIORITY.ON_DEMAND)

  return {
    host: url,
    // Use fast tier - the 30B models are 77% CPU-offloaded on 6GB VRAM GPUs,
    // causing 90-120s responses. The 4B model responds in 5-10s with good quality.
    model: getModelForEndpoint('pc', 'fast'),
    endpointName: 'pc',
  }
}

/**
 * Force a fresh health check on the PC endpoint. Call this after
 * configuration changes or when you suspect it recovered.
 */
export async function forceHealthCheck(): Promise<OllamaEndpoint[]> {
  await checkAllEndpoints()
  return [...state.endpoints]
}

/**
 * Returns true if the PC Ollama endpoint is healthy.
 */
export async function isAnyEndpointHealthy(): Promise<boolean> {
  await refreshIfStale()
  return state.endpoints.some((e) => e.healthy)
}

// ============================================
// INTERNAL
// ============================================

async function refreshIfStale(): Promise<void> {
  if (state.endpoints.length === 0) {
    // First call - discover and check endpoints
    await checkAllEndpoints()
    return
  }

  const now = Date.now()
  const lastCheck = state.lastHealthCheck?.getTime() ?? 0
  if (now - lastCheck > state.healthCheckCooldownMs) {
    await checkAllEndpoints()
  }
}

async function checkAllEndpoints(): Promise<void> {
  const endpoints: OllamaEndpoint[] = []

  // PC endpoint (always configured)
  const pcUrl = getOllamaConfig().baseUrl
  const pcHealth = await pingEndpoint(pcUrl)
  endpoints.push({
    name: 'pc',
    url: pcUrl,
    healthy: pcHealth.healthy,
    lastCheckedAt: new Date(),
    latencyMs: pcHealth.latencyMs,
  })

  state.endpoints = endpoints
  state.lastHealthCheck = new Date()

  // Report if PC is down
  const pcEp = endpoints.find((e) => e.name === 'pc')
  if (pcEp && !pcEp.healthy && shouldReportHealth()) {
    reportHealthDegraded({
      pcHealthy: false,
      pcLatencyMs: pcEp.latencyMs,
    })
  }
}

/** Throttle health incident reports - max one every 10 minutes per state change */
let lastHealthReportAt = 0
const HEALTH_REPORT_COOLDOWN_MS = 600_000 // 10 minutes

function shouldReportHealth(): boolean {
  const now = Date.now()
  if (now - lastHealthReportAt < HEALTH_REPORT_COOLDOWN_MS) return false
  lastHealthReportAt = now
  return true
}

async function pingEndpoint(url: string): Promise<{ healthy: boolean; latencyMs: number | null }> {
  try {
    const start = Date.now()
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    const latencyMs = Date.now() - start

    if (!response.ok) {
      return { healthy: false, latencyMs: null }
    }

    return { healthy: true, latencyMs }
  } catch {
    return { healthy: false, latencyMs: null }
  }
}
