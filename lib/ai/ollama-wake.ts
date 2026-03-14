// @agent Kilo — reviewed by Claude Code
// Ollama Wake Utilities
// Functions to wake, ping, and manage Ollama endpoints.
// No 'use server' — pure utility module for server-side use.
//
// SSH to Pi uses the 'pi' alias from ~/.ssh/config (user: davidferra, key-based auth).
// Raw IP SSH (ssh 10.0.0.177) doesn't work — always use the alias.

import { getOllamaConfig, getOllamaPiUrl, getModelForEndpoint } from './providers'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// SSH alias for the Raspberry Pi (defined in ~/.ssh/config)
const PI_SSH_ALIAS = 'pi'
// Short timeout so SSH fails fast when Pi is unreachable
const SSH_CONNECT_TIMEOUT = 5

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
 * Ping all configured endpoints in parallel.
 * PC and Pi are independent — don't let a slow Pi block the PC result.
 */
export async function pingAllEndpoints(): Promise<PingResult[]> {
  const config = getOllamaConfig()
  const piUrl = getOllamaPiUrl()

  const checks: Promise<PingResult>[] = [pingEndpoint('pc', config.baseUrl)]

  if (piUrl) {
    checks.push(pingEndpoint('pi', piUrl))
  }

  return Promise.all(checks)
}

// ============================================
// SSH HELPER
// ============================================

/**
 * Run a command on the Pi via SSH using the 'pi' alias.
 * Uses ConnectTimeout so it fails fast when the Pi is unreachable.
 */
async function sshPi(command: string, timeoutMs: number = 10000): Promise<string> {
  const { stdout } = await execAsync(
    `ssh -o ConnectTimeout=${SSH_CONNECT_TIMEOUT} -o StrictHostKeyChecking=no ${PI_SSH_ALIAS} '${command}'`,
    { timeout: timeoutMs }
  )
  return stdout.trim()
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
 * Wake Pi Ollama service via SSH.
 * Uses the 'pi' SSH alias (key-based, user davidferra).
 * Fails fast (5s connect timeout) when Pi is unreachable.
 */
export async function wakePiOllama(): Promise<WakeResult> {
  const piUrl = getOllamaPiUrl()
  const startTime = Date.now()

  if (!piUrl) {
    return {
      endpoint: 'pi',
      success: false,
      message: 'Pi endpoint not configured',
      error: 'OLLAMA_PI_URL not set in environment',
    }
  }

  try {
    try {
      await sshPi('sudo systemctl restart ollama', 15000)
    } catch (sshErr) {
      console.warn(
        '[ollama-wake] SSH to Pi failed:',
        sshErr instanceof Error ? sshErr.message : sshErr
      )
      return {
        endpoint: 'pi',
        success: false,
        message: 'Cannot reach Pi via SSH',
        error: sshErr instanceof Error ? sshErr.message : 'SSH connection failed',
      }
    }

    // Wait for service to start
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Verify it's running
    const pingResult = await pingEndpoint('pi', piUrl, 15000)

    if (pingResult.online) {
      return {
        endpoint: 'pi',
        success: true,
        message: `Pi Ollama started successfully (${pingResult.latencyMs}ms)`,
        latencyMs: Date.now() - startTime,
      }
    }

    return {
      endpoint: 'pi',
      success: false,
      message: 'Pi Ollama service restarted but not responding',
      error: 'Service restarted but health check failed',
    }
  } catch (err) {
    return {
      endpoint: 'pi',
      success: false,
      message: 'Failed to wake Pi Ollama',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Wake all offline endpoints.
 */
export async function wakeAllEndpoints(): Promise<WakeResult[]> {
  const config = getOllamaConfig()
  const piUrl = getOllamaPiUrl()

  // Ping in parallel
  const pcPing = await pingEndpoint('pc', config.baseUrl)
  const piPing = piUrl ? await pingEndpoint('pi', piUrl) : null

  const results: WakeResult[] = []

  if (!pcPing.online) {
    results.push(await wakePcOllama())
  }

  if (piUrl && piPing && !piPing.online) {
    results.push(await wakePiOllama())
  }

  if (results.length === 0) {
    results.push({
      endpoint: 'pc',
      success: true,
      message: 'All endpoints already online',
    })
  }

  return results
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
  const piUrl = getOllamaPiUrl()

  const results: LoadModelResult[] = []

  const pcPing = await pingEndpoint('pc', config.baseUrl)
  if (pcPing.online && !pcPing.modelReady) {
    results.push(await loadModelOnEndpoint('pc', config.baseUrl))
  }

  if (piUrl) {
    const piPing = await pingEndpoint('pi', piUrl)
    if (piPing.online && !piPing.modelReady) {
      results.push(await loadModelOnEndpoint('pi', piUrl))
    }
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

/**
 * Deep network diagnostic for an endpoint.
 * Tests three layers: network (TCP:22), SSH auth, Ollama port (TCP:11434).
 * Tells you exactly WHERE the connection is failing.
 */
export async function networkDiagnosePi(): Promise<NetworkDiagResult> {
  const piUrl = getOllamaPiUrl()
  const result: NetworkDiagResult = {
    endpoint: 'pi',
    networkReachable: false,
    sshReachable: false,
    ollamaPortOpen: false,
    latencyMs: null,
    diagnosis: '',
    error: null,
  }

  if (!piUrl) {
    result.diagnosis = 'Pi endpoint not configured (OLLAMA_PI_URL not set)'
    result.error = 'Not configured'
    return result
  }

  // Extract host from URL
  const piHost = new URL(piUrl).hostname

  // Layer 1: Can we reach the Pi at all? (TCP ping to port 22)
  const startTime = Date.now()
  try {
    await execAsync(
      process.platform === 'win32'
        ? `powershell -Command "Test-NetConnection -ComputerName ${piHost} -Port 22 -InformationLevel Quiet -WarningAction SilentlyContinue | Out-Null; if ($?) { exit 0 } else { exit 1 }"`
        : `nc -z -w 3 ${piHost} 22`,
      { timeout: 8000 }
    )
    result.networkReachable = true
    result.latencyMs = Date.now() - startTime
  } catch {
    result.diagnosis = `Pi is UNREACHABLE on the network (${piHost}:22 timed out). Either powered off, disconnected, or IP changed. Walk to the Pi and power-cycle it.`
    result.error = 'Network unreachable'
    return result
  }

  // Layer 2: Can SSH connect and authenticate?
  try {
    await sshPi('echo ok', 8000)
    result.sshReachable = true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('Permission denied') || msg.includes('publickey')) {
      result.diagnosis = `Pi is on the network but SSH auth failed. Key issue. Error: ${msg}`
      result.error = 'SSH auth failed'
    } else if (msg.includes('Connection refused')) {
      result.diagnosis = `Pi is on the network but SSH service is not running (port 22 refused). The Pi OS is up but sshd is down.`
      result.error = 'SSH refused'
    } else {
      result.diagnosis = `Pi is on the network but SSH failed: ${msg}`
      result.error = 'SSH failed'
    }
    return result
  }

  // Layer 3: Is Ollama's port open?
  try {
    const ollamaPort = new URL(piUrl).port || '11434'
    await sshPi(
      `curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 http://localhost:${ollamaPort}/api/tags`,
      10000
    )
    result.ollamaPortOpen = true
    result.diagnosis = 'Pi is fully reachable. Network OK, SSH OK, Ollama responding.'
  } catch {
    result.diagnosis =
      'Pi is on the network and SSH works, but Ollama is not responding on the Pi itself. Try: Reboot Pi or restart Ollama service.'
    result.error = 'Ollama not responding on Pi'
  }

  return result
}

/**
 * Deep network diagnostic for PC Ollama.
 * Simpler than Pi — just checks if Ollama port is open locally.
 */
export async function networkDiagnosePc(): Promise<NetworkDiagResult> {
  const config = getOllamaConfig()
  const result: NetworkDiagResult = {
    endpoint: 'pc',
    networkReachable: true, // PC is always "reachable" — it's localhost
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
// REBOOT FUNCTIONS
// ============================================

/**
 * Reboot the Raspberry Pi via SSH.
 * This is the nuclear option — use when Pi is frozen but SSH still connects.
 * The Pi will go offline for ~30-60 seconds during reboot.
 */
export async function rebootPi(): Promise<WakeResult> {
  const startTime = Date.now()

  try {
    // Fire and forget — the SSH connection will drop as the Pi reboots
    try {
      await sshPi('sudo reboot', 10000)
    } catch {
      // Expected: SSH connection drops during reboot, which throws
    }

    return {
      endpoint: 'pi',
      success: true,
      message: 'Pi reboot command sent. It will be offline for ~30-60 seconds.',
      latencyMs: Date.now() - startTime,
    }
  } catch (err) {
    return {
      endpoint: 'pi',
      success: false,
      message: 'Failed to send reboot command to Pi',
      error: err instanceof Error ? err.message : 'SSH connection failed',
    }
  }
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

/**
 * Restart Ollama on Pi via SSH.
 * Uses the 'pi' SSH alias with fast connect timeout.
 */
export async function restartPiOllama(): Promise<WakeResult> {
  const piUrl = getOllamaPiUrl()
  const startTime = Date.now()

  if (!piUrl) {
    return {
      endpoint: 'pi',
      success: false,
      message: 'Pi endpoint not configured',
      error: 'OLLAMA_PI_URL not set in environment',
    }
  }

  try {
    await sshPi('sudo systemctl restart ollama', 20000)

    await new Promise((resolve) => setTimeout(resolve, 4000))

    const pingResult = await pingEndpoint('pi', piUrl, 15000)

    if (pingResult.online) {
      return {
        endpoint: 'pi',
        success: true,
        message: `Pi Ollama restarted successfully (${pingResult.latencyMs}ms)`,
        latencyMs: Date.now() - startTime,
      }
    }

    return {
      endpoint: 'pi',
      success: false,
      message: 'Pi Ollama restarted but not responding',
      error: 'Service restarted but health check failed',
    }
  } catch (err) {
    return {
      endpoint: 'pi',
      success: false,
      message: 'Failed to restart Pi Ollama',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
