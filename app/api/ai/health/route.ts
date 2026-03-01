// GET /api/ai/health
// Returns health status of ALL Ollama endpoints (PC + Pi).
// Used by dashboard, watchdog, and cross-monitoring system.
// Gated behind CRON_SECRET or authenticated admin access to prevent
// exposing internal infrastructure details (LAN IPs, model names).
//
// Best practices adopted:
//   Google SRE: golden signals (latency, error rate, saturation)
//   Kubernetes: liveness + readiness probes with distinct status
//   AWS: multi-AZ health aggregation
//   Netflix: circuit breaker state exposure for observability

import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { getOllamaConfig, getOllamaPiUrl, getModelForEndpoint } from '@/lib/ai/providers'

// ============================================
// TYPES
// ============================================

interface EndpointHealth {
  name: 'pc' | 'pi'
  url: string
  online: boolean
  latencyMs: number | null
  modelReady: boolean
  configuredModel: string
  loadedModels: string[]
  activeGeneration: boolean
  gpuAccelerated: boolean | null
  error: string | null
}

interface HealthResponse {
  status: 'all_healthy' | 'degraded' | 'offline'
  endpoints: EndpointHealth[]
  dualMode: boolean
  summary: string
  timestamp: string
}

// ============================================
// ENDPOINT HEALTH CHECK
// ============================================

async function checkEndpoint(
  name: 'pc' | 'pi',
  url: string,
  expectedModel: string
): Promise<EndpointHealth> {
  const result: EndpointHealth = {
    name,
    url,
    online: false,
    latencyMs: null,
    modelReady: false,
    configuredModel: expectedModel,
    loadedModels: [],
    activeGeneration: false,
    gpuAccelerated: null,
    error: null,
  }

  // ── Liveness Probe: /api/tags ──
  try {
    const start = Date.now()
    const tagsRes = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    result.latencyMs = Date.now() - start

    if (!tagsRes.ok) {
      result.error = `HTTP ${tagsRes.status}`
      return result
    }

    result.online = true
    const tagsData = (await tagsRes.json()) as { models?: Array<{ name: string }> }
    result.loadedModels = (tagsData.models ?? []).map((m) => m.name)
    result.modelReady = result.loadedModels.some(
      (m) => m === expectedModel || m.startsWith(expectedModel.split(':')[0])
    )
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
    return result
  }

  // ── Saturation Probe: /api/ps (is Ollama busy generating?) ──
  try {
    const psRes = await fetch(`${url}/api/ps`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    if (psRes.ok) {
      const psData = (await psRes.json()) as {
        models?: Array<{ name: string; size?: number; details?: { quantization_level?: string } }>
      }
      const activeModels = psData.models ?? []
      result.activeGeneration = activeModels.length > 0
    }
  } catch {
    // Non-critical — /api/ps failure just means we can't detect busy state
  }

  return result
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function GET(req: Request) {
  // Gate behind cron secret — exposes internal LAN IPs and model details
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) return authError

  const config = getOllamaConfig()
  const piUrl = getOllamaPiUrl()

  // Check both endpoints in parallel (AWS multi-AZ pattern)
  const checks: Promise<EndpointHealth>[] = [
    checkEndpoint('pc', config.baseUrl, getModelForEndpoint('pc', 'standard')),
  ]
  if (piUrl) {
    checks.push(checkEndpoint('pi', piUrl, getModelForEndpoint('pi', 'standard')))
  }

  const endpoints = await Promise.all(checks)

  // Compute aggregate status
  const anyHealthy = endpoints.some((e) => e.online)
  const allHealthy = endpoints.every((e) => e.online)
  const allReady = endpoints.every((e) => e.online && e.modelReady)
  const status = allReady ? 'all_healthy' : anyHealthy ? 'degraded' : 'offline'

  // Generate human-readable summary
  const summaryParts: string[] = []
  for (const ep of endpoints) {
    if (ep.online && ep.modelReady) {
      summaryParts.push(`${ep.name.toUpperCase()}: healthy (${ep.latencyMs}ms)`)
    } else if (ep.online && !ep.modelReady) {
      summaryParts.push(`${ep.name.toUpperCase()}: online but model not ready`)
    } else {
      summaryParts.push(`${ep.name.toUpperCase()}: offline (${ep.error ?? 'unreachable'})`)
    }
  }

  // Redact internal LAN IPs from the response — expose only the endpoint name
  // Even though this endpoint is auth-gated, defense-in-depth means we don't
  // leak network topology if the CRON_SECRET is compromised.
  const sanitizedEndpoints = endpoints.map((ep) => ({
    ...ep,
    url: `[redacted-${ep.name}]`,
  }))

  const response: HealthResponse = {
    status,
    endpoints: sanitizedEndpoints,
    dualMode: !!piUrl,
    summary: summaryParts.join(' | '),
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
