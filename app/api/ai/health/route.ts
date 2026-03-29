// GET /api/ai/health
// Returns health status of the PC Ollama endpoint.
// Used by dashboard, watchdog, and cross-monitoring system.
// Gated behind CRON_SECRET or authenticated admin access to prevent
// exposing internal infrastructure details (model names).

import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { getOllamaConfig, getModelForEndpoint } from '@/lib/ai/providers'

// ============================================
// TYPES
// ============================================

interface EndpointHealth {
  name: 'pc'
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
  dualMode: false
  summary: string
  timestamp: string
}

// ============================================
// ENDPOINT HEALTH CHECK
// ============================================

async function checkEndpoint(url: string, expectedModel: string): Promise<EndpointHealth> {
  const result: EndpointHealth = {
    name: 'pc',
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

  // Liveness Probe: /api/tags
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
    console.error('[ai/health] Endpoint check failed:', err)
    result.error = 'Health check failed'
    return result
  }

  // Saturation Probe: /api/ps (is Ollama busy generating?)
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
    // Non-critical - /api/ps failure just means we can't detect busy state
  }

  return result
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function GET(req: Request) {
  // Gate behind cron secret - exposes model details
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) return authError

  const config = getOllamaConfig()

  const endpoint = await checkEndpoint(config.baseUrl, getModelForEndpoint('pc', 'standard'))

  const status =
    endpoint.online && endpoint.modelReady
      ? 'all_healthy'
      : endpoint.online
        ? 'degraded'
        : 'offline'

  const summary =
    endpoint.online && endpoint.modelReady
      ? `PC: healthy (${endpoint.latencyMs}ms)`
      : endpoint.online
        ? 'PC: online but model not ready'
        : `PC: offline (${endpoint.error ?? 'unreachable'})`

  // Redact internal URLs from the response
  const sanitizedEndpoint = {
    ...endpoint,
    url: '[redacted-pc]',
  }

  const response: HealthResponse = {
    status,
    endpoints: [sanitizedEndpoint],
    dualMode: false,
    summary,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
