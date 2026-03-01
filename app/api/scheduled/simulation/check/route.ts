// Simulation Due-Check Route
// GET /api/scheduled/simulation/check
// Returns { dueFor: string[] } — list of tenant IDs whose last simulation run
// is older than 7 days (or who have never run one).
//
// Called by the auto-scheduler every 6 hours. Lightweight — no simulation work done here.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })

  // Only include ACTIVE tenants — those with at least one event or inquiry
  // created in the last 6 months. This excludes demo, test, and empty accounts.
  const activeSince = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

  const { data: activeEvents } = await supabase
    .from('events')
    .select('tenant_id')
    .gte('created_at', activeSince)

  const { data: activeInquiries } = await supabase
    .from('inquiries')
    .select('tenant_id')
    .gte('created_at', activeSince)

  const activeTenantIds = new Set<string>([
    ...((activeEvents ?? []) as { tenant_id: string }[]).map((r) => r.tenant_id),
    ...((activeInquiries ?? []) as { tenant_id: string }[]).map((r) => r.tenant_id),
  ])

  if (activeTenantIds.size === 0) {
    return NextResponse.json({ dueFor: [] })
  }

  const cutoff = new Date(Date.now() - THREE_DAYS_MS).toISOString()
  const dueFor: string[] = []

  for (const tenantId of activeTenantIds) {
    const { data: lastRun } = await supabase
      .from('simulation_runs')
      .select('started_at')
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const started = (lastRun as { started_at: string } | null)?.started_at
    // Due if never run, or last run was more than 3 days ago
    if (!started || started < cutoff) {
      dueFor.push(tenantId)
    }
  }

  return NextResponse.json({ dueFor })
}
