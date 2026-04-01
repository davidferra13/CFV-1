// Ollama Wake Utilities
// Functions to ping and manage a local Ollama endpoint.
// No 'use server' - pure utility module for server-side use.
// DEV-ONLY: These utilities assume a locally reachable Ollama process.
// Production uses a remote Ollama-compatible cloud endpoint and does not need wake/restart logic.

import { getOllamaConfig, getModelForEndpoint } from './providers'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ============================================
// TYPES
// ============================================

export interface WakeResult {
  endpoint: 'pc'
  success: boolean
  message: string
  latencyMs?: number
  error?: string
}

export interface PingResult {
  endpoint: 'pc'
  online: boolean
  latencyMs: number | null
  modelReady: boolean
  error: string | null
}

export interface LoadModelResult {
  endpoint: 'pc'
  success: boolean
  model: string
  message: string
  error?: string
}

export interface NetworkDiagResult {
  endpoint: 'pc'
  networkReachable: boolean
  sshReachable: boolean
  ollamaPortOpen: boolean
  latencyMs: number | null
  diagnosis: string
  error: string | null
}

// ============================================
// PING FUNCTIONS
// ============================================

/**
 * Ping the PC Ollama endpoint with extended timeout.
 * Used for deep health checks when troubleshooting.
 */
export async function pingEndpoint(
  name: 'pc',
  url: string,
  timeoutMs: number = 15000
): Promise<PingResult> {
  const expectedModel = getModelForEndpoint('pc', 'standard')
  const startTime = Date.now()

  try {
    const res = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    })

    const latencyMs = Date.now() - startTime

    if (!res.ok) {
      return {
        endpoint: 'pc',
        online: false,
        latencyMs: null,
        modelReady: false,
        error: `HTTP ${res.status}`,
      }
    }

    const data = (await res.json()) as { models?: Array<{ name: string }> }
    const models = (data.models ?? []).map((m) => m.name)
    const modelReady = models.some(
      (m) => m === expectedModel || m.startsWith(expectedModel.split(':')[0])
    )

    return {
      endpoint: 'pc',
      online: true,
      latencyMs,
      modelReady,
      error: null,
    }
  } catch (err) {
    return {
      endpoint: 'pc',
      online: false,
      latencyMs: null,
      modelReady: false,
      error: err instanceof Error ? err.message : 'Connection failed',
    }
  }
}

/**
 * Ping the PC Ollama endpoint.
 */
export async function pingAllEndpoints(): Promise<PingResult[]> {
  const config = getOllamaConfig()
  return [await pingEndpoint('pc', config.baseUrl)]
}

// ============================================
// WAKE FUNCTIONS
// ============================================

/**
 * Wake PC Ollama service.
 * On Windows: uses Start-Service Ollama
 * On Linux: uses systemctl start ollama
 */
export async function wakePcOllama(): Promise<WakeResult> {
  const isWindows = process.platform === 'win32'
  const startTime = Date.now()

  try {
    if (isWindows) {
      try {
        await execAsync('powershell -Command "Start-Service Ollama -ErrorAction SilentlyContinue"')
      } catch {
        await execAsync('start "" "ollama" serve', { windowsHide: true })
      }
    } else {
      try {
        await execAsync('systemctl start ollama 2>/dev/null || true')
      } catch {
        await execAsync('ollama serve &')
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const config = getOllamaConfig()
    const pingResult = await pingEndpoint('pc', config.baseUrl, 10000)

    if (pingResult.online) {
      return {
        endpoint: 'pc',
        success: true,
        message: `PC Ollama started successfully (${pingResult.latencyMs}ms)`,
        latencyMs: Date.now() - startTime,
      }
    }

    return {
      endpoint: 'pc',
      success: false,
      message: 'Ollama service started but not responding',
      error: 'Service started but health check failed',
    }
  } catch (err) {
    return {
      endpoint: 'pc',
      success: false,
      message: 'Failed to start PC Ollama',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Wake all offline endpoints (PC only).
 */
export async function wakeAllEndpoints(): Promise<WakeResult[]> {
  const config = getOllamaConfig()
  const pcPing = await pingEndpoint('pc', config.baseUrl)

  if (!pcPing.online) {
    return [await wakePcOllama()]
  }

  return [
    {
      endpoint: 'pc',
      success: true,
      message: 'All endpoints already online',
    },
  ]
}

// ============================================
// MODEL LOADING
// ============================================

/**
 * Preload a model on the PC endpoint.
 * Sends an empty generate request to load the model into memory.
 */
export async function loadModelOnEndpoint(name: 'pc', url: string): Promise<LoadModelResult> {
  const model = getModelForEndpoint('pc', 'standard')

  try {
    const res = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: '',
        keep_alive: '30m',
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      return {
        endpoint: 'pc',
        success: false,
        model,
        message: `Failed to load model: HTTP ${res.status}`,
        error: `HTTP ${res.status}`,
      }
    }

    return {
      endpoint: 'pc',
      success: true,
      model,
      message: `Model ${model} loaded successfully on PC`,
    }
  } catch (err) {
    return {
      endpoint: 'pc',
      success: false,
      model,
      message: `Failed to load model on PC`,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Load models on the PC endpoint if not already loaded.
 */
export async function loadModelsOnAllEndpoints(): Promise<LoadModelResult[]> {
  const config = getOllamaConfig()
  const pcPing = await pingEndpoint('pc', config.baseUrl)

  if (pcPing.online && !pcPing.modelReady) {
    return [await loadModelOnEndpoint('pc', config.baseUrl)]
  }

  return []
}

// ============================================
// NETWORK DIAGNOSTICS
// ============================================

/**
 * Deep network diagnostic for PC Ollama.
 * Checks if Ollama port is open locally.
 */
export async function networkDiagnosePc(): Promise<NetworkDiagResult> {
  const config = getOllamaConfig()
  const result: NetworkDiagResult = {
    endpoint: 'pc',
    networkReachable: true, // PC is always "reachable" (it's localhost)
    sshReachable: true, // N/A for PC
    ollamaPortOpen: false,
    latencyMs: null,
    diagnosis: '',
    error: null,
  }

  const startTime = Date.now()
  try {
    const res = await fetch(`${config.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    result.latencyMs = Date.now() - startTime
    result.ollamaPortOpen = res.ok
    result.diagnosis = res.ok
      ? 'PC Ollama is running and responding.'
      : `PC Ollama responded with HTTP ${res.status}.`
  } catch (err) {
    result.latencyMs = Date.now() - startTime
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ECONNREFUSED')) {
      result.diagnosis = 'Ollama is not running on this PC. Start it with: ollama serve'
    } else {
      result.diagnosis = `PC Ollama unreachable: ${msg}`
    }
    result.error = msg
  }

  return result
}

// ============================================
// RESTART FUNCTIONS
// ============================================

/**
 * Restart Ollama on PC (full restart, not just wake).
 */
export async function restartPcOllama(): Promise<WakeResult> {
  const isWindows = process.platform === 'win32'
  const startTime = Date.now()

  try {
    if (isWindows) {
      try {
        await execAsync(
          'powershell -Command "Stop-Service Ollama -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; Start-Service Ollama -ErrorAction SilentlyContinue"'
        )
      } catch {
        await execAsync('taskkill /F /IM ollama.exe 2>nul || true')
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await execAsync('start "" "ollama" serve', { windowsHide: true })
      }
    } else {
      await execAsync(
        'systemctl restart ollama 2>/dev/null || (pkill ollama; sleep 2; ollama serve &)'
      )
    }

    await new Promise((resolve) => setTimeout(resolve, 3000))

    const config = getOllamaConfig()
    const pingResult = await pingEndpoint('pc', config.baseUrl, 15000)

    if (pingResult.online) {
      return {
        endpoint: 'pc',
        success: true,
        message: `PC Ollama restarted successfully (${pingResult.latencyMs}ms)`,
        latencyMs: Date.now() - startTime,
      }
    }

    return {
      endpoint: 'pc',
      success: false,
      message: 'Ollama restarted but not responding',
      error: 'Service restarted but health check failed',
    }
  } catch (err) {
    return {
      endpoint: 'pc',
      success: false,
      message: 'Failed to restart PC Ollama',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
