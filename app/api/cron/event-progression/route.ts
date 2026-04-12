import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { transitionEvent } from '@/lib/events/transitions'
import { dateToDateString } from '@/lib/utils/format'

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
        try {
          await transitionEvent({
            eventId: event.id,
            toStatus: 'in_progress',
            systemTransition: true,
            metadata: {
              action: 'cron_started',
              source: 'event_progression_cron',
            },
          })
          started += 1
          console.log(`[event-progression] ${event.id} confirmed -> in_progress`)
        } catch (error) {
          console.error(`[event-progression] Failed to start event ${event.id}:`, error)
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
        const departureStr =
          event.departure_time instanceof Date
            ? event.departure_time.toISOString()
            : (event.departure_time as string | null)
        const isOver =
          (departureStr && departureStr <= now) ||
          (!event.departure_time && dateToDateString(event.event_date as Date | string) < today)

        if (!isOver) continue

        try {
          await transitionEvent({
            eventId: event.id,
            toStatus: 'completed',
            systemTransition: true,
            metadata: {
              action: 'cron_completed',
              source: 'event_progression_cron',
            },
          })
          completed += 1
          console.log(`[event-progression] ${event.id} in_progress -> completed`)
        } catch (error) {
          console.error(`[event-progression] Failed to complete event ${event.id}:`, error)
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
