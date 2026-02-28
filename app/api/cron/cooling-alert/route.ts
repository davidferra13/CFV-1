import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find clients whose last event was more than 90 days ago (tier-based thresholds)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const { data: chefs } = await supabaseAdmin.from('chefs').select('id').limit(10000)

    if (!chefs || chefs.length === 0) {
      return NextResponse.json({ message: 'No chefs' })
    }

    let totalAlerts = 0

    for (const chef of chefs) {
      // Get all clients for this chef
      const { data: clients } = await supabaseAdmin
        .from('clients')
        .select('id, display_name')
        .eq('tenant_id', chef.id)
        .limit(10000)

      if (!clients || clients.length === 0) continue

      for (const client of clients) {
        // Find most recent completed event
        const { data: lastEvent } = await supabaseAdmin
          .from('events')
          .select('event_date')
          .eq('tenant_id', chef.id)
          .eq('client_id', client.id)
          .eq('status', 'completed')
          .order('event_date', { ascending: false })
          .limit(1)
          .single()

        if (!lastEvent) continue

        // Check if cooling (no event in 90+ days and no upcoming events)
        if (lastEvent.event_date < ninetyDaysAgo.split('T')[0]) {
          const { count } = await supabaseAdmin
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', chef.id)
            .eq('client_id', client.id)
            .gte('event_date', new Date().toISOString().split('T')[0])
            .not('status', 'eq', 'cancelled')

          if (!count || count === 0) {
            // Queue a notification (using notification_queue if exists, else log)
            console.log(`[cooling-alert] Client ${client.id} cooling for chef ${chef.id}`)
            totalAlerts++
          }
        }
      }
    }

    return NextResponse.json({ message: `Detected ${totalAlerts} cooling relationships` })
  } catch (err) {
    console.error('[cooling-alert] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
