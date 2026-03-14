import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    // Single query: find clients whose most recent completed event is older than 90 days
    // and who have no upcoming non-cancelled events
    const { data: coolingClients, error } = await supabaseAdmin.rpc('get_cooling_clients', {
      cutoff_date: ninetyDaysAgo,
      today_date: today,
    })

    // Fallback: if the RPC doesn't exist, use a simpler approach with 2 queries instead of N+1
    if (error) {
      // Get all client-chef pairs with their latest completed event date
      const { data: latestEvents } = await supabaseAdmin
        .from('events')
        .select('tenant_id, client_id, event_date')
        .eq('status', 'completed')
        .lt('event_date', ninetyDaysAgo)
        .order('event_date', { ascending: false })

      if (!latestEvents || latestEvents.length === 0) {
        return NextResponse.json({ message: 'No cooling relationships detected' })
      }

      // Deduplicate to latest event per tenant+client
      const seen = new Set<string>()
      const candidates: { tenant_id: string; client_id: string }[] = []
      for (const e of latestEvents) {
        const key = `${e.tenant_id}:${e.client_id}`
        if (!seen.has(key)) {
          seen.add(key)
          candidates.push({ tenant_id: e.tenant_id, client_id: e.client_id })
        }
      }

      // Check which candidates have NO upcoming events (batch query)
      const { data: upcomingEvents } = await supabaseAdmin
        .from('events')
        .select('tenant_id, client_id')
        .gte('event_date', today)
        .not('status', 'eq', 'cancelled')

      const upcomingSet = new Set(
        (upcomingEvents || []).map((e) => `${e.tenant_id}:${e.client_id}`)
      )

      const coolingPairs = candidates.filter(
        (c) => !upcomingSet.has(`${c.tenant_id}:${c.client_id}`)
      )

      for (const pair of coolingPairs) {
        console.log(`[cooling-alert] Client ${pair.client_id} cooling for chef ${pair.tenant_id}`)
      }

      return NextResponse.json({
        message: `Detected ${coolingPairs.length} cooling relationships`,
      })
    }

    const totalAlerts = coolingClients?.length ?? 0
    for (const row of coolingClients ?? []) {
      console.log(`[cooling-alert] Client ${row.client_id} cooling for chef ${row.tenant_id}`)
    }

    return NextResponse.json({ message: `Detected ${totalAlerts} cooling relationships` })
  } catch (err) {
    console.error('[cooling-alert] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
