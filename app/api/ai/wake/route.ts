// POST /api/ai/wake
// Wake, ping, and manage the PC Ollama endpoint.
// Admin-only endpoint for controlling AI infrastructure.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import {
  pingEndpoint,
  wakePcOllama,
  loadModelOnEndpoint,
  restartPcOllama,
  networkDiagnosePc,
  type PingResult,
  type WakeResult,
  type LoadModelResult,
  type NetworkDiagResult,
} from '@/lib/ai/ollama-wake'
import { getOllamaConfig } from '@/lib/ai/providers'

// ============================================
// TYPES
// ============================================

interface WakeRequest {
  action: 'ping' | 'wake' | 'load-model' | 'restart' | 'diagnose'
  endpoint?: 'pc' | 'all'
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

  const { action } = body
  const timestamp = new Date().toISOString()

  // Route to appropriate handler
  try {
    switch (action) {
      case 'ping':
        return handlePing(timestamp)

      case 'wake':
        return handleWake(timestamp)

      case 'load-model':
        return handleLoadModel(timestamp)

      case 'restart':
        return handleRestart(timestamp)

      case 'diagnose':
        return handleDiagnose(timestamp)

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

async function handlePing(timestamp: string): Promise<Response> {
  const config = getOllamaConfig()
  const result = await pingEndpoint('pc', config.baseUrl, 15000)

  return NextResponse.json({
    success: result.online,
    message: result.online ? `PC online (${result.latencyMs}ms)` : `PC offline: ${result.error}`,
    results: [result],
    timestamp,
  } as WakeResponse)
}

async function handleWake(timestamp: string): Promise<Response> {
  const result = await wakePcOllama()

  return NextResponse.json({
    success: result.success,
    message: result.success ? 'Wake successful' : `Wake failed: ${result.message}`,
    results: [result],
    timestamp,
  } as WakeResponse)
}

async function handleLoadModel(timestamp: string): Promise<Response> {
  const config = getOllamaConfig()
  const result = await loadModelOnEndpoint('pc', config.baseUrl)

  return NextResponse.json({
    success: result.success,
    message: result.success ? 'Model loaded successfully' : `Load failed: ${result.message}`,
    results: [result],
    timestamp,
  } as WakeResponse)
}

async function handleRestart(timestamp: string): Promise<Response> {
  const result = await restartPcOllama()

  return NextResponse.json({
    success: result.success,
    message: result.success ? 'Restart successful' : `Restart failed: ${result.message}`,
    results: [result],
    timestamp,
  } as WakeResponse)
}

async function handleDiagnose(timestamp: string): Promise<Response> {
  const result: NetworkDiagResult = await networkDiagnosePc()

  return NextResponse.json({
    success: result.ollamaPortOpen,
    message: result.diagnosis,
    results: [result],
    timestamp,
  })
}

// GET endpoint for quick status check - admin only
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = getOllamaConfig()
  const timestamp = new Date().toISOString()

  const result = await pingEndpoint('pc', config.baseUrl, 15000)

  return NextResponse.json({
    success: true,
    message: 'Status check complete',
    results: [result],
    timestamp,
    endpoints: {
      pc: config.baseUrl,
    },
  })
}
