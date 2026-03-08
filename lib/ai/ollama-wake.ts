// Ollama Wake Utilities
// Functions to wake, ping, and manage the local Ollama endpoint.
// No 'use server' - pure utility module for server-side use.
//
// Pi support removed (Mar 2026) - all Ollama runs on PC now.
// Pi function signatures kept as stubs so callers don't break.

import { getOllamaConfig, getModelForEndpoint } from './providers'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ============================================
// TYPES
// ============================================

export interface WakeResult {
  endpoint: 'pc' | 'pi'
  success: boolean
  message: string
  latencyMs?: number
  error?: string
}

export interface PingResult {
  endpoint: 'pc' | 'pi'
  online: boolean
  latencyMs: number | null
  modelReady: boolean
  error: string | null
}

export interface LoadModelResult {
  endpoint: 'pc' | 'pi'
  success: boolean
  model: string
  message: string
  error?: string
}

// ============================================
// PING FUNCTIONS
// ============================================

/**
 * Ping an Ollama endpoint with extended timeout.
 * Used for deep health checks when troubleshooting.
 */
export async function pingEndpoint(
  name: 'pc' | 'pi',
  url: string,
  timeoutMs: number = 15000
): Promise<PingResult> {
  const expectedModel = getModelForEndpoint(name, 'standard')
  const startTime = Date.now()

  try {
    const res = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    })

    const latencyMs = Date.now() - startTime

    if (!res.ok) {
      return {
        endpoint: name,
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
      endpoint: name,
      online: true,
      latencyMs,
      modelReady,
      error: null,
    }
  } catch (err) {
    return {
      endpoint: name,
      online: false,
      latencyMs: null,
      modelReady: false,
      error: err instanceof Error ? err.message : 'Connection failed',
    }
  }
}

/**
 * Ping all configured endpoints. Currently PC only.
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

/** Stub: Pi is shelved. Returns not-configured result. */
export async function wakePiOllama(): Promise<WakeResult> {
  return {
    endpoint: 'pi',
    success: false,
    message: 'Pi is shelved (Mar 2026). All Ollama runs on PC.',
    error: 'Pi not available',
  }
}

/**
 * Wake all offline endpoints. Currently PC only.
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
 * Preload a model on an endpoint.
 * Sends an empty generate request to load the model into memory.
 */
export async function loadModelOnEndpoint(
  name: 'pc' | 'pi',
  url: string
): Promise<LoadModelResult> {
  const model = getModelForEndpoint(name, 'standard')

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
        endpoint: name,
        success: false,
        model,
        message: `Failed to load model: HTTP ${res.status}`,
        error: `HTTP ${res.status}`,
      }
    }

    return {
      endpoint: name,
      success: true,
      model,
      message: `Model ${model} loaded successfully on ${name.toUpperCase()}`,
    }
  } catch (err) {
    return {
      endpoint: name,
      success: false,
      model,
      message: `Failed to load model on ${name.toUpperCase()}`,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Load models on all online endpoints that don't have the model ready.
 */
export async function loadModelsOnAllEndpoints(): Promise<LoadModelResult[]> {
  const config = getOllamaConfig()
  const results: LoadModelResult[] = []

  const pcPing = await pingEndpoint('pc', config.baseUrl)
  if (pcPing.online && !pcPing.modelReady) {
    results.push(await loadModelOnEndpoint('pc', config.baseUrl))
  }

  return results
}

// ============================================
// NETWORK DIAGNOSTICS
// ============================================

export interface NetworkDiagResult {
  endpoint: 'pc' | 'pi'
  networkReachable: boolean
  sshReachable: boolean
  ollamaPortOpen: boolean
  latencyMs: number | null
  diagnosis: string
  error: string | null
}

/** Stub: Pi is shelved. Returns not-configured result. */
export async function networkDiagnosePi(): Promise<NetworkDiagResult> {
  return {
    endpoint: 'pi',
    networkReachable: false,
    sshReachable: false,
    ollamaPortOpen: false,
    latencyMs: null,
    diagnosis: 'Pi is shelved (Mar 2026). All Ollama runs on PC.',
    error: 'Pi not available',
  }
}

/**
 * Deep network diagnostic for PC Ollama.
 * Checks if Ollama port is open locally.
 */
export async function networkDiagnosePc(): Promise<NetworkDiagResult> {
  const config = getOllamaConfig()
  const result: NetworkDiagResult = {
    endpoint: 'pc',
    networkReachable: true,
    sshReachable: true,
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

/** Stub: Pi is shelved. Returns not-configured result. */
export async function restartPiOllama(): Promise<WakeResult> {
  return {
    endpoint: 'pi',
    success: false,
    message: 'Pi is shelved (Mar 2026). All Ollama runs on PC.',
    error: 'Pi not available',
  }
}

/** Stub: Pi is shelved. Returns not-configured result. */
export async function rebootPi(): Promise<WakeResult> {
  return {
    endpoint: 'pi',
    success: false,
    message: 'Pi is shelved (Mar 2026). All Ollama runs on PC.',
    error: 'Pi not available',
  }
}
