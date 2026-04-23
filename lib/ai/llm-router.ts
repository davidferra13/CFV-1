// LLM Router - local-first routing for Ollama-compatible runtime endpoints
// No 'use server' - pure utility, importable anywhere server-side.

import { getAiRuntimePolicy } from './dispatch/routing-table'
import { resolveAiDispatch } from './dispatch/router'
import type { AiExecutionLocation } from './dispatch/types'
import type { LlmEndpoint } from './queue/types'
import { AI_PRIORITY } from './queue/types'
import { reportHealthDegraded } from '../incidents/reporter'

export interface OllamaEndpoint {
  name: 'local' | 'cloud'
  location: AiExecutionLocation
  url: string
  healthy: boolean
  lastCheckedAt: Date | null
  latencyMs: number | null
}

interface RouterState {
  endpoints: OllamaEndpoint[]
  lastHealthCheck: Date | null
  healthCheckCooldownMs: number
}

export interface RouteTaskHints {
  taskType?: string
  payload?: Record<string, unknown>
  modelTier?: 'fast' | 'standard' | 'complex'
  surface?: string
}

const state: RouterState = {
  endpoints: [],
  lastHealthCheck: null,
  healthCheckCooldownMs: 30_000,
}

export async function getEndpoints(): Promise<OllamaEndpoint[]> {
  await refreshIfStale()
  return [...state.endpoints]
}

export async function routeTask(
  _preferredEndpoint: LlmEndpoint = 'auto',
  priority: number = AI_PRIORITY.SCHEDULED,
  hints?: RouteTaskHints
): Promise<{
  url: string
  endpointName: 'local' | 'cloud'
  executionLocation: AiExecutionLocation
  model: string
}> {
  await refreshIfStale()

  const decision = resolveAiDispatch({
    taskType: hints?.taskType,
    modelTier: hints?.modelTier ?? 'standard',
    surface: hints?.surface ?? 'queue.worker',
    source: priority >= AI_PRIORITY.ON_DEMAND ? 'queue.on_demand' : 'queue.background',
    metadata: hints?.payload,
    latencySensitive: priority >= AI_PRIORITY.ON_DEMAND,
    confidence:
      typeof hints?.payload?._aiConfidence === 'number'
        ? (hints.payload._aiConfidence as number)
        : null,
  })

  const preferredLocation = decision.endpoint?.location ?? decision.runtimePolicy.defaultLocation
  const healthyEndpoint =
    state.endpoints.find(
      (endpoint) => endpoint.location === preferredLocation && endpoint.healthy
    ) ??
    state.endpoints.find((endpoint) => endpoint.healthy) ??
    null

  const routedEndpoint = healthyEndpoint ?? decision.endpoint
  if (routedEndpoint) {
    const routedUrl = 'url' in routedEndpoint ? routedEndpoint.url : routedEndpoint.baseUrl
    const routedModel = decision.model ?? ('model' in routedEndpoint ? routedEndpoint.model : null)

    return {
      url: routedUrl,
      endpointName: routedEndpoint.location,
      executionLocation: routedEndpoint.location,
      model: routedModel ?? 'gemma4',
    }
  }

  const policy = getAiRuntimePolicy()
  const fallbackLocation = policy.defaultLocation
  const fallback =
    policy.endpoints.find((endpoint) => endpoint.location === fallbackLocation) ??
    policy.endpoints[0]

  return {
    url: fallback.baseUrl,
    endpointName: fallback.location,
    executionLocation: fallback.location,
    model: decision.model ?? fallback.model,
  }
}

export async function routeForRemy(): Promise<{
  host: string
  model: string
  endpointName: 'local' | 'cloud'
} | null> {
  const healthy = await isAnyEndpointHealthy()
  if (!healthy) return null

  const routed = await routeTask('auto', AI_PRIORITY.ON_DEMAND, {
    taskType: 'remy.chat',
    modelTier: 'standard',
    surface: 'remy.stream',
  })

  return {
    host: routed.url,
    model: routed.model,
    endpointName: routed.endpointName,
  }
}

export async function forceHealthCheck(): Promise<OllamaEndpoint[]> {
  await checkAllEndpoints()
  return [...state.endpoints]
}

export async function isAnyEndpointHealthy(): Promise<boolean> {
  await refreshIfStale()
  return state.endpoints.some((endpoint) => endpoint.healthy)
}

async function refreshIfStale(): Promise<void> {
  if (state.endpoints.length === 0) {
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
  const policy = getAiRuntimePolicy()
  const enabled = policy.endpoints.filter((endpoint) => endpoint.enabled)

  const endpointsToCheck = enabled.length > 0 ? enabled : policy.endpoints.slice(0, 1)
  const checks = await Promise.all(
    endpointsToCheck.map(async (endpoint) => {
      const health = await pingEndpoint(endpoint.baseUrl)
      return {
        name: endpoint.name,
        location: endpoint.location,
        url: endpoint.baseUrl,
        healthy: health.healthy,
        lastCheckedAt: new Date(),
        latencyMs: health.latencyMs,
      } satisfies OllamaEndpoint
    })
  )

  state.endpoints = checks
  state.lastHealthCheck = new Date()

  const degraded = checks.find(
    (endpoint) => endpoint.location === policy.defaultLocation && !endpoint.healthy
  )
  if (degraded && shouldReportHealth()) {
    reportHealthDegraded({
      pcHealthy: false,
      pcLatencyMs: degraded.latencyMs,
    })
  }
}

let lastHealthReportAt = 0
const HEALTH_REPORT_COOLDOWN_MS = 600_000

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
