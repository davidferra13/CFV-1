// Simulation Auto-Scheduler
// Called once from instrumentation.ts on server startup.
// Checks every 6 hours whether the weekly simulation is due, then fires it
// by POSTing to /api/scheduled/simulation — so the full request context is
// available (cookies, headers, etc.) and the auth check remains meaningful.
//
// Also warms up Ollama on startup by sending a tiny test prompt to force
// the model into memory before a real user request hits it.
//
// No 'use server' — plain Node.js module, runs in the instrumentation context.

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000 // every 6 hours
const RUN_IF_OLDER_THAN_DAYS = 3 // skip if last run was within 3 days
const WARMUP_DELAY_MS = 45_000 // wait 45s after startup before first check

export function scheduleSimulation(): void {
  // Delay the first check so the server is fully up before we try to fetch
  setTimeout(() => {
    void warmupOllama()
    void runCheck()
    setInterval(() => void runCheck(), CHECK_INTERVAL_MS)
  }, WARMUP_DELAY_MS)

  console.log('[sim-auto] Simulation auto-scheduler registered. First check in 45s.')
}

/**
 * Send a tiny test prompt to Ollama to force the model into memory.
 * The first real user request will be much faster after this warmup.
 * Non-blocking — failures are logged but never propagated.
 */
async function warmupOllama(): Promise<void> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL
  if (!ollamaUrl) return

  const model = process.env.OLLAMA_MODEL || 'qwen3-coder:30b'

  try {
    console.log(`[ollama-warmup] Warming up ${model}...`)
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Respond with JSON.' },
          { role: 'user', content: 'Return: {"status":"ok"}' },
        ],
        format: 'json',
        stream: false,
      }),
      signal: AbortSignal.timeout(120_000), // 2 min — model loading can be slow
    })

    if (res.ok) {
      console.log(`[ollama-warmup] Model ${model} is warm and ready.`)
    } else {
      console.warn(`[ollama-warmup] Warmup returned HTTP ${res.status}`)
    }
  } catch (err) {
    console.warn(
      '[ollama-warmup] Warmup failed (non-blocking):',
      err instanceof Error ? err.message : err
    )
  }
}

async function runCheck(): Promise<void> {
  const baseUrl =
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const secret = process.env.CRON_SECRET

  if (!secret) {
    console.warn('[sim-auto] CRON_SECRET not set — skipping simulation check.')
    return
  }

  try {
    // Ask the API route whether a run is due; it handles all DB logic.
    const res = await fetch(`${baseUrl}/api/scheduled/simulation/check`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
    })

    if (!res.ok) {
      console.warn(`[sim-auto] Check returned ${res.status} — skipping.`)
      return
    }

    const { dueFor } = (await res.json()) as { dueFor: string[] }

    if (dueFor.length === 0) {
      console.log('[sim-auto] All tenants ran within the last 7 days — no action needed.')
      return
    }

    console.log(`[sim-auto] ${dueFor.length} tenant(s) need a simulation run — triggering...`)

    // Fire the actual simulation run (non-blocking — result is stored in DB)
    fetch(`${baseUrl}/api/scheduled/simulation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenantIds: dueFor }),
    }).catch((err: unknown) => {
      console.error('[sim-auto] Failed to trigger simulation:', err)
    })
  } catch (err) {
    console.error('[sim-auto] Error during simulation check:', err)
  }
}
