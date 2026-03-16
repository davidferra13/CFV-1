// GET /api/ollama-status
// Returns Ollama availability for dashboard badge polling.
// No auth required - status is non-sensitive metadata only.
// `configured` = true when OLLAMA_BASE_URL is explicitly set in env.
// The badge uses this to suppress itself when Ollama was never set up.
//
// Now includes Pi endpoint info when OLLAMA_PI_URL is configured.

import { checkOllamaHealth } from '@/lib/ai/ollama-health'
import {
  isOllamaEnabled,
  getOllamaConfig,
  getOllamaPiUrl,
  getModelForEndpoint,
} from '@/lib/ai/providers'
import { NextResponse } from 'next/server'

export async function GET() {
  const configured = isOllamaEnabled()
  const config = getOllamaConfig()
  const isRemote = !config.baseUrl.includes('localhost') && !config.baseUrl.includes('127.0.0.1')
  const status = await checkOllamaHealth()

  const piUrl = getOllamaPiUrl()
  let piStatus = null

  // Check Pi endpoint if configured
  if (piUrl) {
    try {
      const start = Date.now()
      const res = await fetch(`${piUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      })
      const latencyMs = Date.now() - start

      if (res.ok) {
        const data = await res.json()
        const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name)
        const expectedModel = getModelForEndpoint('pi', 'standard')
        const modelBase = expectedModel.split(':')[0]
        const modelReady = models.some(
          (m: string) => m === expectedModel || m.startsWith(modelBase + ':')
        )

        piStatus = {
          online: true,
          model: expectedModel,
          modelReady,
          latencyMs,
          models,
          error: null,
        }
      } else {
        piStatus = {
          online: false,
          model: getModelForEndpoint('pi', 'standard'),
          modelReady: false,
          latencyMs: null,
          models: [],
          error: `HTTP ${res.status}`,
        }
      }
    } catch (err) {
      piStatus = {
        online: false,
        model: getModelForEndpoint('pi', 'standard'),
        modelReady: false,
        latencyMs: null,
        models: [],
        error: err instanceof Error ? err.message : 'Connection failed',
      }
    }
  }

  return NextResponse.json(
    {
      ...status,
      configured,
      isRemote,
      dualMode: !!piUrl,
      pi: piStatus,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
