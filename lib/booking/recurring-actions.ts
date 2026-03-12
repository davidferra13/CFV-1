// Recurring Event Series Server Actions
// Creates and manages recurring event series using the recurrence engine.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  RecurrenceRuleSchema,
  generateRecurrenceDates,
  describeRecurrence,
  type RecurrenceRule,
} from '@/lib/booking/recurrence-engine'
import { getDefaultServeTimeForMealSlot } from '@/lib/booking/series-planning'

// --- Types ---

export type RecurringSeriesResult = {
  success: boolean
  seriesId?: string
  eventCount?: number
  error?: string
}

// --- Schemas ---

const CreateRecurringSeriesSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recurrence_rule: RecurrenceRuleSchema,
  guest_count: z.number().int().positive().optional(),
  location_address: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  location_zip: z.string().optional(),
  occasion: z.string().optional(),
  service_style: z.string().optional(),
  quoted_price_per_session_cents: z.number().int().optional(),
  deposit_amount_cents: z.number().int().optional(),
  pricing_model: z.string().optional(),
  special_requests: z.string().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
})

// --- Actions ---

/**
 * Create a recurring event series with auto-generated events.
 * Uses the recurrence engine to expand dates, then creates one event per date.
 */
export async function createRecurringSeries(
  input: z.infer<typeof CreateRecurringSeriesSchema>
): Promise<RecurringSeriesResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const validated = CreateRecurringSeriesSchema.parse(input)

  // Verify client belongs to this tenant
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('id', validated.client_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  // Generate dates from recurrence rule
  const sessions = generateRecurrenceDates(
    validated.recurrence_rule,
    validated.start_date,
    validated.end_date
  )

  if (sessions.length === 0) {
    return { success: false, error: 'No dates match the recurrence pattern in the selected range' }
  }

  // Create the series record
  const { data: series, error: seriesError } = await supabase
    .from('event_series')
    .insert({
      tenant_id: user.tenantId!,
      client_id: validated.client_id,
      service_mode: 'recurring',
      title: validated.title,
      start_date: validated.start_date,
      end_date: validated.end_date,
      base_guest_count: validated.guest_count || null,
      location_address: validated.location_address || null,
      location_city: validated.location_city || null,
      location_state: validated.location_state || null,
      location_zip: validated.location_zip || null,
      pricing_model: validated.pricing_model || null,
      quoted_total_cents: validated.quoted_price_per_session_cents
        ? validated.quoted_price_per_session_cents * sessions.length
        : null,
      deposit_total_cents: validated.deposit_amount_cents || null,
      notes: validated.special_requests || null,
      recurrence_rule: validated.recurrence_rule,
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select('id')
    .single()

  if (seriesError || !series) {
    console.error('[createRecurringSeries] Series insert error:', seriesError)
    return { success: false, error: 'Failed to create recurring series' }
  }

  // Create service sessions
  const sessionInserts = sessions.map((s, idx) => ({
    series_id: series.id,
    tenant_id: user.tenantId!,
    client_id: validated.client_id,
    session_date: s.session_date,
    meal_slot: s.meal_slot,
    execution_type: 'on_site',
    start_time: s.start_time,
    end_time: s.end_time,
    guest_count: validated.guest_count || null,
    service_style: validated.service_style || 'plated',
    location_address: validated.location_address || null,
    location_city: validated.location_city || null,
    location_state: validated.location_state || null,
    location_zip: validated.location_zip || null,
    quoted_price_cents: validated.quoted_price_per_session_cents || null,
    status: 'draft',
    sort_order: idx + 1,
    created_by: user.id,
    updated_by: user.id,
  }))

  const { data: insertedSessions, error: sessionsError } = await supabase
    .from('event_service_sessions')
    .insert(sessionInserts as any)
    .select('id, session_date, meal_slot, start_time, end_time, guest_count')

  if (sessionsError) {
    console.error('[createRecurringSeries] Sessions insert error:', sessionsError)
    return { success: false, error: 'Failed to create service sessions' }
  }

  // Create draft events for each session
  const recurrenceDesc = describeRecurrence(validated.recurrence_rule)
  const eventInserts = (insertedSessions || []).map((session: any, idx: number) => {
    const serveTime = session.start_time || getDefaultServeTimeForMealSlot(session.meal_slot)

    return {
      tenant_id: user.tenantId!,
      client_id: validated.client_id,
      event_series_id: series.id,
      source_session_id: session.id,
      service_mode: 'recurring',
      booking_source: 'series',
      event_date: session.session_date,
      serve_time: serveTime,
      guest_count: session.guest_count || validated.guest_count || 1,
      location_address: validated.location_address || null,
      location_city: validated.location_city || 'TBD',
      location_state: validated.location_state || null,
      location_zip: validated.location_zip || null,
      occasion:
        sessions.length > 1
          ? `${validated.occasion || validated.title} (${recurrenceDesc}, #${idx + 1})`
          : validated.occasion || validated.title,
      quoted_price_cents: idx === 0 ? validated.quoted_price_per_session_cents : null,
      deposit_amount_cents: idx === 0 ? validated.deposit_amount_cents : null,
      pricing_model: validated.pricing_model || null,
      dietary_restrictions: validated.dietary_restrictions || [],
      special_requests: validated.special_requests || null,
      created_by: user.id,
      updated_by: user.id,
    }
  })

  const { data: insertedEvents, error: eventsError } = await supabase
    .from('events')
    .insert(eventInserts as any)
    .select('id, source_session_id')

  if (eventsError) {
    console.error('[createRecurringSeries] Events insert error:', eventsError)
    return { success: false, error: 'Failed to create recurring events' }
  }

  // Link sessions to events
  if (insertedEvents && insertedEvents.length > 0) {
    // State transitions
    await supabase.from('event_state_transitions').insert(
      insertedEvents.map((e: any) => ({
        tenant_id: user.tenantId!,
        event_id: e.id,
        from_status: null,
        to_status: 'draft',
        transitioned_by: user.id,
        metadata: {
          action: 'created_from_recurring_series',
          series_id: series.id,
          source_session_id: e.source_session_id,
        },
      }))
    )

    // Link session -> event
    await Promise.all(
      insertedEvents
        .filter((e: any) => e.source_session_id)
        .map((e: any) =>
          supabase
            .from('event_service_sessions')
            .update({ event_id: e.id, updated_by: user.id } as any)
            .eq('id', e.source_session_id)
            .eq('tenant_id', user.tenantId!)
        )
    )
  }

  // Activity log (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'event_created',
      domain: 'event',
      entityType: 'event_series',
      entityId: series.id,
      summary: `Created recurring series "${validated.title}" with ${insertedEvents?.length || 0} events (${recurrenceDesc})`,
      context: {
        series_id: series.id,
        event_count: insertedEvents?.length || 0,
        recurrence: validated.recurrence_rule,
      },
    })
  } catch (err) {
    console.error('[createRecurringSeries] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/events')
  revalidatePath('/calendar')

  return {
    success: true,
    seriesId: series.id,
    eventCount: insertedEvents?.length || 0,
  }
}

/** Preview how many events a recurrence rule would generate */
export async function previewRecurrence(
  rule: RecurrenceRule,
  startDate: string,
  endDate: string
): Promise<{ dates: string[]; count: number; description: string }> {
  await requireChef() // auth check only
  const sessions = generateRecurrenceDates(rule, startDate, endDate)
  return {
    dates: sessions.map((s) => s.session_date),
    count: sessions.length,
    description: describeRecurrence(rule),
  }
}
