#!/usr/bin/env node
// chefflow-connector.mjs
// ChefFlow Local AI Connector - runs on your machine, connects your Ollama to ChefFlow.
//
// Usage:
//   CHEFFLOW_CONNECTOR_KEY=cf_connector_... node scripts/chefflow-connector.mjs
//
// Or create a .chefflow-connector.env file with:
//   CHEFFLOW_CONNECTOR_KEY=cf_connector_...
//   CHEFFLOW_API_URL=https://app.cheflowhq.com   (optional, defaults to production)
//   OLLAMA_BASE_URL=http://localhost:11434         (optional, defaults to localhost)
//   OLLAMA_AUTH_TOKEN=                            (optional, only for proxy setups)
//
// The connector:
//  1. Sends a heartbeat to ChefFlow every 30s to show it's alive
//  2. Polls for pending AI jobs every 2s
//  3. Sends each job to your local Ollama
//  4. Posts results back to ChefFlow
//
// Security: Ollama never needs a public IP. This script connects OUT to ChefFlow.
// Your local port 11434 stays private.

import { readFileSync, existsSync } from 'fs'
import { createHash } from 'crypto'

// ============================================================
// CONFIG
// ============================================================

const ENV_FILE = '.chefflow-connector.env'
if (existsSync(ENV_FILE)) {
  readFileSync(ENV_FILE, 'utf-8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .forEach((line) => {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) {
        process.env[key.trim()] = rest.join('=').trim()
      }
    })
}

const CONNECTOR_KEY = process.env.CHEFFLOW_CONNECTOR_KEY
const API_URL = (process.env.CHEFFLOW_API_URL ?? 'https://app.cheflowhq.com').replace(/\/+$/, '')
const OLLAMA_BASE = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/+$/, '')
const OLLAMA_AUTH = process.env.OLLAMA_AUTH_TOKEN ?? null
const CONNECTOR_VERSION = '1.0.0'

const POLL_INTERVAL_MS = 2_000
const HEARTBEAT_INTERVAL_MS = 30_000
const OLLAMA_TIMEOUT_MS = 120_000

if (!CONNECTOR_KEY || !CONNECTOR_KEY.startsWith('cf_connector_')) {
  console.error(
    '[chefflow-connector] CHEFFLOW_CONNECTOR_KEY is required and must start with cf_connector_'
  )
  console.error('Set it via the environment or in .chefflow-connector.env')
  process.exit(1)
}

const AUTH_HEADER = `Bearer ${CONNECTOR_KEY}`

// ============================================================
// UTILITY
// ============================================================

async function cfFetch(path, options = {}) {
  const url = `${API_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: AUTH_HEADER,
      'Content-Type': 'application/json',
      'User-Agent': `chefflow-connector/${CONNECTOR_VERSION}`,
      ...(options.headers ?? {}),
    },
  })
  return res
}

async function ollamaRequest(model, prompt, systemPrompt, timeoutMs) {
  const body = {
    model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt },
    ],
    stream: false,
    options: { num_predict: 4096 },
  }

  const headers = { 'Content-Type': 'application/json' }
  if (OLLAMA_AUTH) headers['Authorization'] = `Bearer ${OLLAMA_AUTH}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? OLLAMA_TIMEOUT_MS)

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.status.toString())
      throw new Error(`Ollama error ${res.status}: ${text}`)
    }

    const data = await res.json()
    // Strip <think>...</think> blocks if present (some models include reasoning traces)
    let content = data?.message?.content ?? data?.response ?? ''
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    return content
  } finally {
    clearTimeout(timeout)
  }
}

// ============================================================
// HEARTBEAT
// ============================================================

async function sendHeartbeat() {
  // Check Ollama reachability
  let ollamaReachable = false
  let availableModels = []
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json()
      ollamaReachable = true
      availableModels = (data?.models ?? []).map((m) => m.name)
    }
  } catch {
    // Ollama unreachable - still send heartbeat so ChefFlow knows connector is alive
  }

  try {
    await cfFetch('/api/connector/v1/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ version: CONNECTOR_VERSION, ollamaReachable, availableModels }),
    })
    if (!ollamaReachable) {
      console.warn('[chefflow-connector] Heartbeat sent but Ollama is unreachable at', OLLAMA_BASE)
    }
  } catch (err) {
    console.warn('[chefflow-connector] Heartbeat failed:', err.message)
  }
}

// ============================================================
// POLL & PROCESS
// ============================================================

let busy = false

async function pollAndProcess() {
  if (busy) return

  try {
    const res = await cfFetch('/api/connector/v1/poll')

    if (res.status === 204) {
      // No work available
      return
    }

    if (res.status === 401) {
      console.error('[chefflow-connector] Unauthorized. Check your CHEFFLOW_CONNECTOR_KEY.')
      return
    }

    if (!res.ok) {
      console.warn('[chefflow-connector] Poll returned', res.status)
      return
    }

    const job = await res.json()
    if (!job?.taskId) return

    busy = true
    const start = Date.now()
    console.log(`[chefflow-connector] Job claimed: ${job.taskType} (${job.taskId})`)

    let result = null
    let success = false
    let errorMsg = null

    try {
      const raw = await ollamaRequest(
        job.model,
        job.prompt,
        job.systemPrompt,
        job.timeoutMs ?? OLLAMA_TIMEOUT_MS
      )

      // Try to parse as JSON if a schema is expected; fall back to raw string
      if (job.responseSchema) {
        try {
          // Extract JSON from the response (handles markdown code blocks)
          const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ?? [null, raw]
          result = JSON.parse(jsonMatch[1] ?? raw)
        } catch {
          result = { raw }
        }
      } else {
        result = { raw }
      }

      success = true
      console.log(`[chefflow-connector] Job completed in ${Date.now() - start}ms: ${job.taskId}`)
    } catch (err) {
      errorMsg = err.message ?? 'Ollama processing failed'
      console.error(`[chefflow-connector] Job failed: ${job.taskId}:`, errorMsg)
    }

    // Post result back (best-effort)
    try {
      await cfFetch('/api/connector/v1/result', {
        method: 'POST',
        body: JSON.stringify({
          taskId: job.taskId,
          success,
          result: success ? result : undefined,
          error: errorMsg ?? undefined,
          durationMs: Date.now() - start,
          model: job.model,
        }),
      })
    } catch (err) {
      console.error('[chefflow-connector] Failed to post result:', err.message)
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('[chefflow-connector] Poll error:', err.message)
    }
  } finally {
    busy = false
  }
}

// ============================================================
// MAIN LOOP
// ============================================================

console.log(`[chefflow-connector] Starting v${CONNECTOR_VERSION}`)
console.log(`[chefflow-connector] ChefFlow API: ${API_URL}`)
console.log(`[chefflow-connector] Ollama:       ${OLLAMA_BASE}`)
console.log(`[chefflow-connector] Key:          ${CONNECTOR_KEY.substring(0, 25)}...`)

// Initial heartbeat
await sendHeartbeat()

// Heartbeat loop
setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

// Poll loop
setInterval(pollAndProcess, POLL_INTERVAL_MS)

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[chefflow-connector] Shutting down...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('[chefflow-connector] Shutting down...')
  process.exit(0)
})
