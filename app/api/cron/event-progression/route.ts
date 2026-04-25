import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { transitionEvent } from '@/lib/events/transitions'
import { dateToDateString } from '@/lib/utils/format'
import { executeInteraction } from '@/lib/interactions'

// Event Time-Progression Cron
// Advances events through the FSM based on wall-clock time:
//   confirmed  -> in_progress : when event_date has arrived (date <= today in event timezone)
//   in_progress -> completed  : when departure_time has passed, or event_date is past
// Also detects stuck events and creates chef_todos as nudges.
//
// Timezone: each event resolves to event_timezone or chef.timezone (default America/New_York).
// "Today" is computed per-event in the event's local timezone.

// Days allowed in each state before flagged as stuck
const STUCK_THRESHOLDS_DAYS: Record<string, number> = {
  draft: 7,
  proposed: 14,
  accepted: 7,
  paid: 7,
}

const STUCK_LABELS: Record<string, string> = {
  draft: 'Send proposal',
  proposed: 'Follow up with client',
  accepted: 'Collect deposit',
  paid: 'Confirm event',
}

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const start = Date.now()

  try {
    const result = await runMonitoredCronJob('event-progression', async () => {
      const db = createAdminClient()
      // Fetch all confirmed events; filter per-event using local timezone
      const { data: toStart, error: startErr } = await db
        .from('events')
        .select('id, tenant_id, event_date, event_timezone, serve_time, arrival_time')
        .eq('status', 'confirmed')

      if (startErr) {
        console.error('[event-progression] Query confirmed failed:', startErr)
        throw new Error('Query failed')
      }

      let started = 0
      let failed = 0
      for (const event of toStart ?? []) {
        // Compute "today" in the event's local timezone
        const tz = event.event_timezone || 'America/New_York'
        const eventLocalDate = new Date().toLocaleDateString('en-CA', { timeZone: tz })
        const eventDateStr =
          typeof event.event_date === 'string'
            ? event.event_date.slice(0, 10)
            : new Date(event.event_date).toISOString().slice(0, 10)
        if (eventDateStr > eventLocalDate) continue // not yet event day in local tz

        try {
          await executeInteraction({
            action_type: 'auto_reminder',
            actor_id: 'system',
            actor: { role: 'system', actorId: 'system', tenantId: event.tenant_id },
            target_type: 'event',
            target_id: event.id,
            context_type: 'event',
            context_id: event.id,
            visibility: 'system',
            metadata: {
              tenant_id: event.tenant_id,
              event_id: event.id,
              reminder_type: 'event_date',
              event_date: eventDateStr,
              source: 'event_progression_cron',
              suppress_interaction_notifications: true,
              suppress_interaction_activity: true,
            },
            idempotency_key: `auto_reminder:event_date:${event.id}:${eventDateStr}`,
          })
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
          failed += 1
          console.error(`[event-progression] Failed to start event ${event.id}:`, error)
        }
      }

      const { data: toComplete, error: completeErr } = await db
        .from('events')
        .select('id, tenant_id, event_date, event_timezone, departure_time')
        .eq('status', 'in_progress')
        .limit(500)

      if (completeErr) {
        console.error('[event-progression] Query in_progress failed:', completeErr)
        throw new Error('Query failed')
      }

      const nowIso = new Date().toISOString()
      let completed = 0
      for (const event of toComplete ?? []) {
        const tz2 = event.event_timezone || 'America/New_York'
        const localToday = new Date().toLocaleDateString('en-CA', { timeZone: tz2 })
        const departureStr =
          event.departure_time instanceof Date
            ? event.departure_time.toISOString()
            : (event.departure_time as string | null)
        const isOver =
          (departureStr && departureStr <= nowIso) ||
          (!event.departure_time &&
            dateToDateString(event.event_date as Date | string) < localToday)

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
          failed += 1
          console.error(`[event-progression] Failed to complete event ${event.id}:`, error)
        }
      }

      if (failed > 0) {
        console.error(
          `[event-progression] ${failed} transition(s) failed. started=${started} completed=${completed}`
        )
      }

      // ── Stuck-event detection: create chef_todos for events stuck too long ──
      let stuckNudges = 0
      try {
        const stuckStatuses = Object.keys(STUCK_THRESHOLDS_DAYS)
        const { data: stuckCandidates } = await db
          .from('events')
          .select('id, tenant_id, occasion, status, updated_at')
          .in('status', stuckStatuses)
          .order('updated_at', { ascending: true })
          .limit(200)

        const nowMs = Date.now()
        for (const row of stuckCandidates ?? []) {
          const ev = row as any
          const threshold = STUCK_THRESHOLDS_DAYS[ev.status]
          if (!threshold) continue
          const daysStuck = Math.floor((nowMs - new Date(ev.updated_at).getTime()) / 86400000)
          if (daysStuck < threshold) continue

          // Check if todo already exists for this event (dedup by event id in text)
          const { data: existing } = await db
            .from('chef_todos')
            .select('id')
            .eq('chef_id', ev.tenant_id)
            .ilike('text', `%${ev.id}%`)
            .eq('completed', false)
            .limit(1)

          if (existing && existing.length > 0) continue

          const label = STUCK_LABELS[ev.status] || 'Take action'
          const occasion = ev.occasion || 'Untitled event'
          const todoText = `${label}: "${occasion}" has been in ${ev.status} for ${daysStuck} days → /events/${ev.id}`

          await db.from('chef_todos').insert({
            chef_id: ev.tenant_id,
            text: todoText,
            completed: false,
            created_by: 'system',
            sort_order: 0,
          })
          stuckNudges++
        }
      } catch (stuckErr) {
        console.error('[event-progression] Stuck-event scan failed (non-blocking):', stuckErr)
      }

      return {
        started,
        completed,
        failed,
        stuckNudges,
        durationMs: Date.now() - start,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[event-progression] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
