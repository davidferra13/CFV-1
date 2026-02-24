// @agent Kilo — review-pending
// POST /api/ai/wake
// Wake, ping, and manage Ollama endpoints.
// Admin-only endpoint for controlling AI infrastructure.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import {
  pingAllEndpoints,
  pingEndpoint,
  wakePcOllama,
  wakePiOllama,
  wakeAllEndpoints,
  loadModelOnEndpoint,
  loadModelsOnAllEndpoints,
  restartPcOllama,
  restartPiOllama,
  type PingResult,
  type WakeResult,
  type LoadModelResult,
} from '@/lib/ai/ollama-wake'
import { getOllamaConfig, getOllamaPiUrl } from '@/lib/ai/providers'

// ============================================
// TYPES
// ============================================

interface WakeRequest {
  action: 'ping' | 'wake' | 'load-model' | 'restart'
  endpoint?: 'pc' | 'pi' | 'all'
}

interface WakeResponse {
  success: boolean
  message: string
  results: Array<WakeResult | PingResult | LoadModelResult>
  timestamp: string
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(request: Request) {
  // Verify admin access
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body
  let body: WakeRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, endpoint = 'all' } = body
  const timestamp = new Date().toISOString()

  // Route to appropriate handler
  try {
    switch (action) {
      case 'ping':
        return handlePing(endpoint)

      case 'wake':
        return handleWake(endpoint, timestamp)

      case 'load-model':
        return handleLoadModel(endpoint, timestamp)

      case 'restart':
        return handleRestart(endpoint, timestamp)

      default:
        return NextResponse.json(
          {
            success: false,
            message: `Unknown action: ${action}`,
            results: [],
            timestamp,
          } as WakeResponse,
          { status: 400 }
        )
    }
  } catch (err) {
    console.error('[api/ai/wake] Error:', err)
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
        results: [],
        timestamp,
      } as WakeResponse,
      { status: 500 }
    )
  }
}

// ============================================
// ACTION HANDLERS
// ============================================

async function handlePing(endpoint: 'pc' | 'pi' | 'all'): Promise<Response> {
  const config = getOllamaConfig()
  const piUrl = getOllamaPiUrl()
  const timestamp = new Date().toISOString()

  if (endpoint === 'all') {
    const results = await pingAllEndpoints()
    const allOnline = results.every((r) => r.online)

    return NextResponse.json({
      success: allOnline,
      message: allOnline ? 'All endpoints online' : 'Some endpoints offline',
      results,
      timestamp,
    } as WakeResponse)
  }

  const url = endpoint === 'pc' ? config.baseUrl : piUrl
  if (!url) {
    return NextResponse.json({
      success: false,
      message: `${endpoint.toUpperCase()} endpoint not configured`,
      results: [],
      timestamp,
    } as WakeResponse)
  }

  const result = await pingEndpoint(endpoint, url, 15000)

  return NextResponse.json({
    success: result.online,
    message: result.online
      ? `${endpoint.toUpperCase()} online (${result.latencyMs}ms)`
      : `${endpoint.toUpperCase()} offline: ${result.error}`,
    results: [result],
    timestamp,
  } as WakeResponse)
}

async function handleWake(endpoint: 'pc' | 'pi' | 'all', timestamp: string): Promise<Response> {
  let results: WakeResult[]

  if (endpoint === 'all') {
    results = await wakeAllEndpoints()
  } else if (endpoint === 'pc') {
    results = [await wakePcOllama()]
  } else {
    results = [await wakePiOllama()]
  }

  const allSuccess = results.every((r) => r.success)

  return NextResponse.json({
    success: allSuccess,
    message: allSuccess
      ? 'Wake successful'
      : `Wake completed with errors: ${results.map((r) => r.message).join('; ')}`,
    results,
    timestamp,
  } as WakeResponse)
}

async function handleLoadModel(
  endpoint: 'pc' | 'pi' | 'all',
  timestamp: string
): Promise<Response> {
  const config = getOllamaConfig()
  const piUrl = getOllamaPiUrl()

  let results: LoadModelResult[]

  if (endpoint === 'all') {
    results = await loadModelsOnAllEndpoints()
    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All models already loaded',
        results: [],
        timestamp,
      } as WakeResponse)
    }
  } else {
    const url = endpoint === 'pc' ? config.baseUrl : piUrl
    if (!url) {
      return NextResponse.json({
        success: false,
        message: `${endpoint.toUpperCase()} endpoint not configured`,
        results: [],
        timestamp,
      } as WakeResponse)
    }
    results = [await loadModelOnEndpoint(endpoint, url)]
  }

  const allSuccess = results.every((r) => r.success)

  return NextResponse.json({
    success: allSuccess,
    message: allSuccess
      ? 'Model(s) loaded successfully'
      : `Load completed with errors: ${results.map((r) => r.message).join('; ')}`,
    results,
    timestamp,
  } as WakeResponse)
}

async function handleRestart(endpoint: 'pc' | 'pi' | 'all', timestamp: string): Promise<Response> {
  const results: WakeResult[] = []

  if (endpoint === 'pc' || endpoint === 'all') {
    results.push(await restartPcOllama())
  }

  if (endpoint === 'pi' || endpoint === 'all') {
    const piUrl = getOllamaPiUrl()
    if (piUrl) {
      results.push(await restartPiOllama())
    }
  }

  const allSuccess = results.every((r) => r.success)

  return NextResponse.json({
    success: allSuccess,
    message: allSuccess
      ? 'Restart successful'
      : `Restart completed with errors: ${results.map((r) => r.message).join('; ')}`,
    results,
    timestamp,
  } as WakeResponse)
}

// GET endpoint for quick status check
export async function GET() {
  const config = getOllamaConfig()
  const piUrl = getOllamaPiUrl()
  const timestamp = new Date().toISOString()

  const results = await pingAllEndpoints()

  return NextResponse.json({
    success: true,
    message: 'Status check complete',
    results,
    timestamp,
    endpoints: {
      pc: config.baseUrl,
      pi: piUrl || null,
    },
  } as WakeResponse & { endpoints: { pc: string; pi: string | null } })
}
