import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { createServerClient } from '@/lib/db/server'
import { ensureCurrentEventServiceSimulationForTenant } from '@/lib/service-simulation/state'

export const maxDuration = 180

async function handleRequest(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const db: any = createServerClient({ admin: true })
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + 7)
  const fromDate = today.toISOString().slice(0, 10)
  const toDate = end.toISOString().slice(0, 10)

  const { data: events, error } = await db
    .from('events')
    .select('id, tenant_id')
    .in('status', ['paid', 'confirmed', 'in_progress'])
    .gte('event_date', fromDate)
    .lte('event_date', toDate)
    .limit(250)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const refreshed: string[] = []
  const failed: Array<{ eventId: string; error: string }> = []

  for (const event of (events ?? []) as Array<{ id: string; tenant_id: string }>) {
    try {
      await ensureCurrentEventServiceSimulationForTenant(event.id, event.tenant_id)
      refreshed.push(event.id)
    } catch (err) {
      failed.push({
        eventId: event.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    success: failed.length === 0,
    fromDate,
    toDate,
    refreshed: refreshed.length,
    failed,
  })
}

export async function GET(request: NextRequest) {
  return handleRequest(request)
}
