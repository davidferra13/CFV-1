// Ollama Health Check
// Proactive availability check — distinct from the passive fallback in parse-ollama.ts
// Used by: dashboard badge, /api/ollama-status, watchdog health monitor
// Not a server action — can be imported from any server-side context

import { getOllamaConfig } from './providers'

export interface OllamaHealthStatus {
  online: boolean
  model: string
  latencyMs: number | null
  models: string[]
  error: string | null
}

/**
 * Pings the Ollama /api/tags endpoint and returns availability + latency.
 * Times out after 5 seconds. Never throws — always returns a status object.
 */
export async function checkOllamaHealth(): Promise<OllamaHealthStatus> {
  const config = getOllamaConfig()
  const startTime = Date.now()

  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })

    if (!response.ok) {
      return {
        online: false,
        model: config.model,
        latencyMs: null,
        models: [],
        error: `HTTP ${response.status}`,
      }
    }

    const latencyMs = Date.now() - startTime
    const data = await response.json()
    const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name)

    return {
      online: true,
      model: config.model,
      latencyMs,
      models,
      error: null,
    }
  } catch (err) {
    return {
      online: false,
      model: config.model,
      latencyMs: null,
      models: [],
      error: err instanceof Error ? err.message : 'Connection failed',
    }
  }
}
