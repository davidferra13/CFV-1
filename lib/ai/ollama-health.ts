// Ollama Health Check
// Proactive availability check — distinct from the passive fallback in parse-ollama.ts
// Used by: dashboard badge, /api/ollama-status, watchdog health monitor
// Not a server action — can be imported from any server-side context

import { getOllamaConfig } from './providers'

export interface OllamaHealthStatus {
  online: boolean
  model: string
  modelReady: boolean
  latencyMs: number | null
  models: string[]
  gpuLayers: number | null
  totalLayers: number | null
  error: string | null
}

/**
 * Pings the Ollama /api/tags endpoint and returns availability + latency.
 * Also checks whether the configured model is loaded and detects GPU offloading.
 * Times out after 5 seconds. Never throws — always returns a status object.
 */
export async function checkOllamaHealth(): Promise<OllamaHealthStatus> {
  const config = getOllamaConfig()
  const startTime = Date.now()

  const baseResult = {
    model: config.model,
    modelReady: false,
    models: [] as string[],
    gpuLayers: null as number | null,
    totalLayers: null as number | null,
  }

  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })

    if (!response.ok) {
      return {
        ...baseResult,
        online: false,
        latencyMs: null,
        error: `HTTP ${response.status}`,
      }
    }

    const latencyMs = Date.now() - startTime
    const data = await response.json()
    const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name)

    // Check if the configured model (or its base name) is in the model list
    const modelBase = config.model.split(':')[0]
    const modelReady = models.some((m) => m === config.model || m.startsWith(modelBase + ':'))

    // NOTE: GPU detection via /api/show was removed (2026-02-22).
    // The POST /api/show endpoint may reset Ollama's keep_alive timer,
    // preventing the model from unloading after idle timeout.
    // Polling this every 30-60s kept ~16 GB of RAM pinned indefinitely.

    return {
      online: true,
      model: config.model,
      modelReady,
      latencyMs,
      models,
      gpuLayers: null,
      totalLayers: null,
      error: null,
    }
  } catch (err) {
    return {
      ...baseResult,
      online: false,
      latencyMs: null,
      error: err instanceof Error ? err.message : 'Connection failed',
    }
  }
}
