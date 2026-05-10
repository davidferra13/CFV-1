// Recurring Auto-Generation Scanner
// NOT a 'use server' file: no auth gate, called from cron routes only.
// Scans all active recurring schedules with auto_generate=true and creates
// draft events when (next_occurrence - lead_time_days) <= today.

import { createServerClient } from '@/lib/db/server'
import { addDays, addWeeks, addMonths, nextDay, format, startOfDay, isAfter } from 'date-fns'

type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly'

function calculateNextOccurrences(
  frequency: Frequency,
  dayOfWeek: number | null,
  startDate: Date,
  count: number = 1
): Date[] {
  const occurrences: Date[] = []
  let current = startOfDay(startDate)

  if (dayOfWeek !== null && dayOfWeek >= 0 && dayOfWeek <= 6) {
    const currentDay = current.getDay()
    if (currentDay !== dayOfWeek) {
      current = nextDay(current, dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6)
    }
  }

  for (let i = 0; i < count; i++) {
    if (i === 0) {
      occurrences.push(new Date(current))
    } else {
      switch (frequency) {
        case 'weekly':
          current = addWeeks(current, 1)
          break
        case 'biweekly':
          current = addWeeks(current, 2)
          break
        case 'monthly':
          current = addMonths(current, 1)
          break
        case 'quarterly':
          current = addMonths(current, 3)
          break
      }
      occurrences.push(new Date(current))
    }
  }

  return occurrences
}

export interface AutoGenResult {
  tenantId: string
  scheduleId: string
  clientName: string
  eventId: string
  eventDate: string
}

/**
 * Process all recurring schedules across all tenants and auto-generate
 * draft events when the lead time threshold is reached.
 * Called from cron route only; no user auth context.
 */
export async function processRecurringAutoGeneration(): Promise<{
  generated: AutoGenResult[]
  errors: string[]
}> {
  const db: any = createServerClient({ admin: true })
  const generated: AutoGenResult[] = []
  const errors: string[] = []

  // Fetch all active schedules with auto_generate enabled
  const { data: schedules, error: fetchErr } = await db
    .from('recurring_schedules' as any)
    .select('*, clients(full_name, address, city, state, zip)')
    .eq('is_active', true)
    .eq('auto_generate', true)

  if (fetchErr) {
    errors.push(`Failed to fetch schedules: ${fetchErr.message}`)
    return { generated, errors }
  }

  if (!schedules || schedules.length === 0) {
    return { generated, errors }
  }

  const today = startOfDay(new Date())

  for (const schedule of schedules) {
    try {
      const nextOcc = schedule.next_occurrence ? new Date(schedule.next_occurrence) : null

      if (!nextOcc) continue

      const leadDays = schedule.lead_time_days ?? 21
      const triggerDate = addDays(nextOcc, -leadDays)

      // Not time yet
      if (isAfter(triggerDate, today)) continue

      // Check if we already generated an event for this occurrence date
      const occDateStr = format(nextOcc, 'yyyy-MM-dd')
      const { data: existingEvents } = await db
        .from('events')
        .select('id')
        .eq('tenant_id', schedule.tenant_id)
        .eq('client_id', schedule.client_id)
        .eq('event_date', occDateStr)
        .limit(1)

      if (existingEvents && existingEvents.length > 0) {
        // Already have an event for this date; advance next_occurrence
        const futureOcc = calculateNextOccurrences(
          schedule.frequency as Frequency,
          schedule.day_of_week,
          addDays(nextOcc, 1),
          1
        )
        await db
          .from('recurring_schedules' as any)
          .update({
            next_occurrence: futureOcc.length > 0 ? format(futureOcc[0], 'yyyy-MM-dd') : null,
            last_generated_date: occDateStr,
            updated_at: new Date().toISOString(),
          })
          .eq('id', schedule.id)
        continue
      }

      // Pull info from the client's most recent completed event for defaults
      const { data: lastEvent } = await db
        .from('events')
        .select(
          'guest_count, location_address, location_city, location_state, location_zip, serve_time, occasion, service_style'
        )
        .eq('tenant_id', schedule.tenant_id)
        .eq('client_id', schedule.client_id)
        .in('status', ['completed', 'confirmed', 'paid'])
        .order('event_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      const client = schedule.clients ?? {}
      const fallbackAddress = client.address || 'TBD'
      const fallbackCity = client.city || ''
      const fallbackState = client.state || ''
      const fallbackZip = client.zip || ''

      // Build event payload: schedule overrides > last event > client defaults
      const eventPayload = {
        tenant_id: schedule.tenant_id,
        client_id: schedule.client_id,
        event_date: occDateStr,
        serve_time: schedule.preferred_time || lastEvent?.serve_time || '18:00',
        guest_count: schedule.guest_count ?? lastEvent?.guest_count ?? 2,
        occasion: schedule.occasion || lastEvent?.occasion || schedule.title,
        status: 'draft',
        location_address:
          schedule.location_address || lastEvent?.location_address || fallbackAddress,
        location_city: schedule.location_city || lastEvent?.location_city || fallbackCity,
        location_state: schedule.location_state || lastEvent?.location_state || fallbackState,
        location_zip: schedule.location_zip || lastEvent?.location_zip || fallbackZip,
        service_style: schedule.service_style || lastEvent?.service_style || null,
        menu_id: schedule.menu_id ?? null,
        notes: `Auto-generated from recurring booking: ${schedule.title}`,
        created_by: schedule.created_by,
      }

      const { data: newEvent, error: insertErr } = await db
        .from('events')
        .insert(eventPayload)
        .select('id, event_date')
        .single()

      if (insertErr) {
        errors.push(`Schedule ${schedule.id}: ${insertErr.message}`)
        continue
      }

      // Record in tracking table
      await db.from('recurring_auto_generated_events').insert({
        tenant_id: schedule.tenant_id,
        schedule_id: schedule.id,
        event_id: newEvent.id,
      })

      // Log event state transition
      await db.from('event_state_transitions').insert({
        tenant_id: schedule.tenant_id,
        event_id: newEvent.id,
        from_status: null,
        to_status: 'draft',
        transitioned_by: schedule.created_by,
        metadata: { action: 'recurring_auto_generate', schedule_id: schedule.id },
      })

      // Advance next_occurrence
      const futureOcc = calculateNextOccurrences(
        schedule.frequency as Frequency,
        schedule.day_of_week,
        addDays(nextOcc, 1),
        1
      )
      await db
        .from('recurring_schedules' as any)
        .update({
          next_occurrence: futureOcc.length > 0 ? format(futureOcc[0], 'yyyy-MM-dd') : null,
          last_generated_date: occDateStr,
          updated_at: new Date().toISOString(),
        })
        .eq('id', schedule.id)

      generated.push({
        tenantId: schedule.tenant_id,
        scheduleId: schedule.id,
        clientName: client.full_name ?? 'Unknown',
        eventId: newEvent.id,
        eventDate: occDateStr,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Schedule ${schedule.id}: ${msg}`)
    }
  }

  return { generated, errors }
}
