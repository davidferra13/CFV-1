// LLM Router — Dual-Endpoint Routing for Ollama
// No 'use server' — pure utility, importable anywhere server-side.
//
// Routes AI tasks to the right Ollama instance:
//   PC  = primary, fast (better GPU), interactive + on-demand
//   Pi  = background, always-on (when available), scheduled + batch
//
// Today: only PC exists. When Pi arrives, set OLLAMA_PI_URL and
// background tasks automatically flow there. Zero code changes.

import { getOllamaConfig, getModelForEndpoint } from './providers'
import type { LlmEndpoint } from './queue/types'
import { AI_PRIORITY } from './queue/types'
import { reportHealthDegraded } from '../incidents/reporter'

// ============================================
// ENDPOINT TYPES
// ============================================

export interface OllamaEndpoint {
  name: 'pc' | 'pi'
  url: string
  healthy: boolean
  lastCheckedAt: Date | null
  latencyMs: number | null
}

interface RouterState {
  endpoints: OllamaEndpoint[]
  lastHealthCheck: Date | null
  /** Don't hammer health checks — minimum 60s between checks.
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
 * Returns all configured Ollama endpoints with current health status.
 * Runs health check if stale (>30s since last check).
 */
export async function getEndpoints(): Promise<OllamaEndpoint[]> {
  await refreshIfStale()
  return [...state.endpoints]
}

/**
 * Picks the best endpoint for a task based on priority and health.
 *
 * Routing rules:
 * - 'pc' or 'pi' requested explicitly → use that if healthy, fallback otherwise
 * - 'auto' (default):
 *   - Priority >= ON_DEMAND (800) → PC (faster GPU for interactive)
 *   - Priority < ON_DEMAND AND Pi healthy → Pi (offload background)
 *   - Priority < ON_DEMAND AND Pi offline → PC (fallback)
 */
export async function routeTask(
  preferredEndpoint: LlmEndpoint = 'auto',
  priority: number = AI_PRIORITY.SCHEDULED
): Promise<{ url: string; endpointName: 'pc' | 'pi' }> {
  await refreshIfStale()

  const pc = state.endpoints.find((e) => e.name === 'pc')
  const pi = state.endpoints.find((e) => e.name === 'pi')

  // Explicit endpoint requested
  if (preferredEndpoint === 'pc' || preferredEndpoint === 'pi') {
    const target = preferredEndpoint === 'pc' ? pc : pi
    if (target?.healthy) {
      return { url: target.url, endpointName: target.name }
    }
    // Fallback to the other if preferred is down
    const fallback = preferredEndpoint === 'pc' ? pi : pc
    if (fallback?.healthy) {
      console.warn(`[llm-router] ${preferredEndpoint} unhealthy, falling back to ${fallback.name}`)
      return { url: fallback.url, endpointName: fallback.name }
    }
    // Both down — return PC URL anyway and let the caller handle the error
    const defaultUrl = getOllamaConfig().baseUrl
    return { url: defaultUrl, endpointName: 'pc' }
  }

  // Auto routing
  if (priority >= AI_PRIORITY.ON_DEMAND) {
    // High priority → PC (faster GPU)
    if (pc?.healthy) return { url: pc.url, endpointName: 'pc' }
    if (pi?.healthy) return { url: pi.url, endpointName: 'pi' }
  } else {
    // Low priority → Pi (offload from PC)
    if (pi?.healthy) return { url: pi.url, endpointName: 'pi' }
    if (pc?.healthy) return { url: pc.url, endpointName: 'pc' }
  }

  // Nothing healthy — return PC URL and let caller handle error
  const defaultUrl = getOllamaConfig().baseUrl
  return { url: defaultUrl, endpointName: 'pc' }
}

/**
 * Route a Remy chat request. Returns full endpoint config or null if offline.
 * Convenience wrapper around routeTask() for the Remy streaming route.
 * Accepts an optional preferred endpoint override for load-aware routing.
 */
export async function routeForRemy(opts?: { preferEndpoint?: LlmEndpoint }): Promise<{
  host: string
  model: string
  endpointName: 'pc' | 'pi'
} | null> {
  const healthy = await isAnyEndpointHealthy()
  if (!healthy) return null

  const { url, endpointName } = await routeTask(
    opts?.preferEndpoint ?? 'auto',
    AI_PRIORITY.ON_DEMAND
  )

  return {
    host: url,
    // Use fast tier — the 30B models are 77% CPU-offloaded on 6GB VRAM GPUs,
    // causing 90-120s responses. The 4B model responds in 5-10s with good quality.
    // On Pi, getModelForEndpoint() always resolves to the Pi model.
    model: getModelForEndpoint(endpointName, 'fast'),
    endpointName,
  }
}

/**
 * Force a fresh health check on all endpoints. Call this after
 * configuration changes or when you suspect an endpoint recovered.
 */
export async function forceHealthCheck(): Promise<OllamaEndpoint[]> {
  await checkAllEndpoints()
  return [...state.endpoints]
}

/**
 * Returns true if at least one Ollama endpoint is healthy.
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
    // First call — discover and check endpoints
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

  // Pi endpoint (optional — only if OLLAMA_PI_URL is set AND not disabled)
  // Set OLLAMA_PI_DISABLED=true when Ollama is masked on Pi to prevent
  // fallback attempts that fail with "model not found" errors.
  const piUrl = process.env.OLLAMA_PI_URL
  const piDisabled = process.env.OLLAMA_PI_DISABLED === 'true'
  if (piUrl && !piDisabled) {
    const piHealth = await pingEndpoint(piUrl)
    endpoints.push({
      name: 'pi',
      url: piUrl,
      healthy: piHealth.healthy,
      lastCheckedAt: new Date(),
      latencyMs: piHealth.latencyMs,
    })
  }

  state.endpoints = endpoints
  state.lastHealthCheck = new Date()

  // Report if any endpoint is down (throttled to avoid spamming reports)
  const pcEp = endpoints.find((e) => e.name === 'pc')
  const piEp = endpoints.find((e) => e.name === 'pi')
  const piConfigured = !!process.env.OLLAMA_PI_URL
  const anyDown = (pcEp && !pcEp.healthy) || (piConfigured && piEp && !piEp.healthy)
  if (anyDown && shouldReportHealth()) {
    reportHealthDegraded({
      pcHealthy: pcEp?.healthy ?? false,
      piHealthy: piEp?.healthy ?? false,
      pcLatencyMs: pcEp?.latencyMs,
      piLatencyMs: piEp?.latencyMs,
    })
  }
}

/** Throttle health incident reports — max one every 10 minutes per state change */
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
