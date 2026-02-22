// Auto-Simulation Cron Route
// GET  /api/scheduled/simulation — trigger run for all due tenants (called by watchdog/scheduler)
// POST /api/scheduled/simulation — same, but accepts { tenantIds: string[] } body to scope the run
//
// Can also be called manually:
//   curl -X POST http://localhost:3000/api/scheduled/simulation \
//     -H "Authorization: Bearer $CRON_SECRET"

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { runSimulationInternal } from '@/lib/simulation/simulation-runner'
import { ALL_SIM_MODULES } from '@/lib/simulation/types'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'

// Vercel Pro supports up to 800s; local dev has no limit.
// 6 modules × 2 scenarios × ~15s ≈ 180s — well within budget.
export const maxDuration = 300

async function handleSimulation(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  const supabase = createServerClient({ admin: true })

  // Determine which tenants to run
  let tenantIds: string[]

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as { tenantIds?: string[] }
      tenantIds = body.tenantIds ?? []
    } catch {
      tenantIds = []
    }
  } else {
    tenantIds = []
  }

  // If no tenant IDs specified, run for all chefs
  if (tenantIds.length === 0) {
    const { data: chefs } = await supabase.from('chefs').select('id')
    tenantIds = (chefs ?? []).map((c: { id: string }) => c.id)
  }

  if (tenantIds.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'No tenants found' })
  }

  // Return immediately — simulation runs in the background.
  // Results are stored in simulation_runs / simulation_results tables.
  // The AI fix report is written to docs/simulation-report.md when done.
  const runningFor = tenantIds.slice(0, 1) // one tenant at a time — prevents Ollama overload

  // Fire-and-forget: don't await, respond immediately
  Promise.resolve()
    .then(async () => {
      const runStarted = Date.now()
      const results: Array<{
        tenantId: string
        success: boolean
        runId: string | null
        error: string | null
      }> = []

      for (const tenantId of runningFor) {
        try {
          const result = await runSimulationInternal(tenantId, {
            modules: ALL_SIM_MODULES,
            scenariosPerModule: 2,
          })
          results.push({ tenantId, ...result })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          console.error(`[sim-cron] Failed for tenant ${tenantId}:`, err)
          results.push({ tenantId, success: false, runId: null, error: msg })
        }
      }

      const durationMs = Date.now() - runStarted
      const allOk = results.every((r) => r.success)
      if (allOk) {
        await recordCronHeartbeat('simulation', { results }, durationMs).catch(() => {})
      } else {
        await recordCronError(
          'simulation',
          JSON.stringify(results.filter((r) => !r.success)),
          durationMs
        ).catch(() => {})
      }
      console.log(`[sim-cron] Background run complete — ${durationMs}ms, ok=${allOk}`)
    })
    .catch((err: unknown) => {
      console.error('[sim-cron] Background simulation failed:', err)
    })

  return NextResponse.json({ started: true, tenantIds: runningFor })
}

export async function GET(req: NextRequest) {
  return handleSimulation(req)
}

export async function POST(req: NextRequest) {
  return handleSimulation(req)
}
