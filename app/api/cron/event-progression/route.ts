import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

// Event Time-Progression Cron
// Advances events through the FSM based on wall-clock time:
//   confirmed  -> in_progress : when event_date has arrived (date <= today)
//   in_progress -> completed  : when departure_time has passed, or event_date is past

const db = createAdminClient()

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const start = Date.now()

  try {
    const result = await runMonitoredCronJob('event-progression', async () => {
      const now = new Date().toISOString()
      const today = now.slice(0, 10)

      const { data: toStart, error: startErr } = await db
        .from('events')
        .select('id, tenant_id, event_date, serve_time, arrival_time')
        .eq('status', 'confirmed')
        .lte('event_date', today)

      if (startErr) {
        console.error('[event-progression] Query confirmed failed:', startErr)
        throw new Error('Query failed')
      }

      let started = 0
      for (const event of toStart ?? []) {
        const { error } = await db
          .from('events')
          .update({ status: 'in_progress' })
          .eq('id', event.id)
          .eq('tenant_id', event.tenant_id)
          .eq('status', 'confirmed')
        if (!error) {
          started += 1
          console.log(`[event-progression] ${event.id} confirmed -> in_progress`)
        }
      }

      const { data: toComplete, error: completeErr } = await db
        .from('events')
        .select('id, tenant_id, event_date, departure_time')
        .eq('status', 'in_progress')

      if (completeErr) {
        console.error('[event-progression] Query in_progress failed:', completeErr)
        throw new Error('Query failed')
      }

      let completed = 0
      for (const event of toComplete ?? []) {
        const isOver =
          (event.departure_time && event.departure_time <= now) ||
          (!event.departure_time && event.event_date < today)

        if (!isOver) continue

        const { error } = await db
          .from('events')
          .update({ status: 'completed' })
          .eq('id', event.id)
          .eq('tenant_id', event.tenant_id)
          .eq('status', 'in_progress')
        if (!error) {
          completed += 1
          console.log(`[event-progression] ${event.id} in_progress -> completed`)
        }
      }

      return {
        started,
        completed,
        durationMs: Date.now() - start,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[event-progression] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
