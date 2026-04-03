// Simulation Due-Check Route
// GET /api/scheduled/simulation/check
// Returns { dueFor: string[] } - list of tenant IDs whose last simulation run
// is older than 7 days (or who have never run one).
//
// Called by the auto-scheduler every 6 hours. Lightweight - no simulation work done here.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('simulation-check', async () => {
      const db = createServerClient({ admin: true })

      const activeSince = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
      const { data: activeEvents } = await db
        .from('events')
        .select('tenant_id')
        .gte('created_at', activeSince)

      const { data: activeInquiries } = await db
        .from('inquiries')
        .select('tenant_id')
        .gte('created_at', activeSince)

      const activeTenantIds = new Set<string>([
        ...((activeEvents ?? []) as { tenant_id: string }[]).map((r) => r.tenant_id),
        ...((activeInquiries ?? []) as { tenant_id: string }[]).map((r) => r.tenant_id),
      ])

      if (activeTenantIds.size === 0) {
        return { dueFor: [] }
      }

      const cutoff = new Date(Date.now() - THREE_DAYS_MS).toISOString()
      const dueFor: string[] = []

      for (const tenantId of activeTenantIds) {
        const { data: lastRun } = await db
          .from('simulation_runs')
          .select('started_at')
          .eq('tenant_id', tenantId)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const started = (lastRun as { started_at: string } | null)?.started_at
        if (!started || started < cutoff) {
          dueFor.push(tenantId)
        }
      }

      return { dueFor }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[simulation-check] Failed:', error)
    return NextResponse.json({ error: 'Simulation check failed' }, { status: 500 })
  }
}
