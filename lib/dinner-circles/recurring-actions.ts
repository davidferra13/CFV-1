'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  RecurrenceConfig,
  RecurrencePattern,
  SetRecurrenceInput,
  RecurringEventSeries,
  RecurringEventEntry,
  NextOccurrence,
  SeriesStats,
} from './recurring-types'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function assertCircleOwner(db: any, circleId: string, tenantId: string) {
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) throw new Error('Circle not found or unauthorized')
}

/** Compute the next date from a given date + recurrence pattern */
function computeNextDate(
  fromDate: Date,
  pattern: RecurrencePattern,
  dayOfWeek: number | null,
  customIntervalDays: number | null
): Date {
  const next = new Date(fromDate)

  switch (pattern) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      break
    case 'custom':
      next.setDate(next.getDate() + (customIntervalDays ?? 30))
      break
  }

  // Adjust to preferred day of week if set
  if (dayOfWeek !== null && dayOfWeek >= 0 && dayOfWeek <= 6) {
    const currentDay = next.getDay()
    const diff = dayOfWeek - currentDay
    if (diff !== 0) {
      // Move forward to the next occurrence of that day
      next.setDate(next.getDate() + ((diff + 7) % 7 || 7))
    }
  }

  return next
}

// ---------------------------------------------------------------------------
// setCircleRecurrence
// ---------------------------------------------------------------------------

export async function setCircleRecurrence(
  circleId: string,
  pattern: RecurrencePattern,
  config: Omit<SetRecurrenceInput, 'pattern'>
): Promise<RecurrenceConfig> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  await assertCircleOwner(db, circleId, tenantId)

  // Check if config already exists
  const { data: existing } = await db
    .from('circle_recurrence_configs')
    .select('id')
    .eq('circle_id', circleId)
    .single()

  // Get the most recent event date for next-scheduled computation
  const { data: circle } = await db
    .from('hub_groups')
    .select('event_id')
    .eq('id', circleId)
    .single()

  let lastEventDate: Date | null = null
  if (circle?.event_id) {
    const { data: ev } = await db
      .from('events')
      .select('event_date')
      .eq('id', circle.event_id)
      .single()
    if (ev?.event_date) {
      lastEventDate = new Date(ev.event_date)
    }
  }

  const nextDate = lastEventDate
    ? computeNextDate(
        lastEventDate,
        pattern,
        config.dayOfWeek ?? null,
        config.customIntervalDays ?? null
      )
    : null

  const now = new Date().toISOString()
  const row = {
    circle_id: circleId,
    tenant_id: tenantId,
    pattern,
    day_of_week: config.dayOfWeek ?? null,
    preferred_time: config.preferredTime ?? null,
    auto_create_days_ahead: config.autoCreateDaysAhead ?? 0,
    custom_interval_days: config.customIntervalDays ?? null,
    last_occurrence_at: lastEventDate?.toISOString() ?? null,
    next_scheduled_at: nextDate?.toISOString() ?? null,
    updated_at: now,
  }

  let result: any
  if (existing) {
    const { data, error } = await db
      .from('circle_recurrence_configs')
      .update(row)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    result = data
  } else {
    const { data, error } = await db
      .from('circle_recurrence_configs')
      .insert({ ...row, created_at: now })
      .select()
      .single()
    if (error) throw new Error(error.message)
    result = data
  }

  revalidatePath(`/circle/${circleId}`)

  return {
    circleId: result.circle_id,
    tenantId: result.tenant_id,
    pattern: result.pattern,
    dayOfWeek: result.day_of_week,
    preferredTime: result.preferred_time,
    autoCreateDaysAhead: result.auto_create_days_ahead,
    customIntervalDays: result.custom_interval_days,
    lastOccurrenceAt: result.last_occurrence_at,
    nextScheduledAt: result.next_scheduled_at,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  }
}

// ---------------------------------------------------------------------------
// getCircleRecurrence
// ---------------------------------------------------------------------------

export async function getCircleRecurrence(circleId: string): Promise<RecurrenceConfig | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, user.tenantId!)

  const { data, error } = await db
    .from('circle_recurrence_configs')
    .select('*')
    .eq('circle_id', circleId)
    .single()

  if (error || !data) return null

  return {
    circleId: data.circle_id,
    tenantId: data.tenant_id,
    pattern: data.pattern,
    dayOfWeek: data.day_of_week,
    preferredTime: data.preferred_time,
    autoCreateDaysAhead: data.auto_create_days_ahead,
    customIntervalDays: data.custom_interval_days,
    lastOccurrenceAt: data.last_occurrence_at,
    nextScheduledAt: data.next_scheduled_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

// ---------------------------------------------------------------------------
// getCircleEventSeries
// ---------------------------------------------------------------------------

export async function getCircleEventSeries(circleId: string): Promise<RecurringEventSeries> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  await assertCircleOwner(db, circleId, tenantId)

  // Get circle name
  const { data: circle } = await db
    .from('hub_groups')
    .select('name, event_id')
    .eq('id', circleId)
    .single()

  if (!circle) throw new Error('Circle not found')

  // Get recurrence config
  const config = await getCircleRecurrence(circleId)

  // Get all events linked to this circle (via hub_groups pointing at events)
  // The circle may have had multiple events over time, tracked by event_id history
  // We look at events owned by this tenant that reference this circle
  const { data: events } = await db
    .from('events')
    .select(
      `
      id,
      event_date,
      status,
      guest_count,
      created_at
    `
    )
    .eq('tenant_id', tenantId)
    .eq('circle_id', circleId)
    .order('event_date', { ascending: true })

  const entries: RecurringEventEntry[] = []

  for (const ev of events ?? []) {
    // Get confirmed RSVP count
    const { count: confirmedCount } = await db
      .from('hub_group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', circleId)
      .eq('rsvp_status', 'confirmed')

    // Get menu name if linked
    let menuName: string | null = null
    const { data: menu } = await db
      .from('menus')
      .select('name')
      .eq('event_id', ev.id)
      .eq('tenant_id', tenantId)
      .limit(1)
      .single()
    if (menu) menuName = menu.name

    entries.push({
      eventId: ev.id,
      eventDate: ev.event_date,
      status: ev.status,
      guestCount: ev.guest_count ?? 0,
      confirmedGuests: confirmedCount ?? 0,
      uniqueGuests: ev.guest_count ?? 0,
      menuName,
      createdAt: ev.created_at,
    })
  }

  return {
    circleId,
    circleName: circle.name,
    config,
    totalEvents: entries.length,
    events: entries,
  }
}

// ---------------------------------------------------------------------------
// createNextOccurrence
// ---------------------------------------------------------------------------

export async function createNextOccurrence(circleId: string): Promise<string> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  await assertCircleOwner(db, circleId, tenantId)

  // Get current circle with its event
  const { data: circle } = await db
    .from('hub_groups')
    .select('id, name, event_id, tenant_id, planning_brief')
    .eq('id', circleId)
    .single()

  if (!circle) throw new Error('Circle not found')

  // Get the most recent event to clone from
  let sourceEvent: any = null
  if (circle.event_id) {
    const { data: ev } = await db.from('events').select('*').eq('id', circle.event_id).single()
    sourceEvent = ev
  }

  if (!sourceEvent) {
    throw new Error('No existing event to clone from. Create a first event manually.')
  }

  // Get recurrence config for date computation
  const { data: recConfig } = await db
    .from('circle_recurrence_configs')
    .select('*')
    .eq('circle_id', circleId)
    .single()

  // Compute the next event date
  const baseDate = sourceEvent.event_date ? new Date(sourceEvent.event_date) : new Date()

  const nextDate = recConfig
    ? computeNextDate(
        baseDate,
        recConfig.pattern,
        recConfig.day_of_week,
        recConfig.custom_interval_days
      )
    : new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000) // default: +30 days

  // Clone the event (same venue, timing, guest count)
  const { data: newEvent, error: eventError } = await db
    .from('events')
    .insert({
      tenant_id: tenantId,
      circle_id: circleId,
      client_id: sourceEvent.client_id,
      event_date: nextDate.toISOString().split('T')[0],
      serve_time: sourceEvent.serve_time,
      arrival_time: sourceEvent.arrival_time,
      occasion: sourceEvent.occasion,
      guest_count: sourceEvent.guest_count,
      location_address: sourceEvent.location_address,
      location_city: sourceEvent.location_city,
      location_state: sourceEvent.location_state,
      location_zip: sourceEvent.location_zip,
      location_notes: sourceEvent.location_notes,
      access_instructions: sourceEvent.access_instructions,
      special_requests: sourceEvent.special_requests,
      dietary_restrictions: sourceEvent.dietary_restrictions,
      allergies: sourceEvent.allergies,
      status: 'draft',
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select()
    .single()

  if (eventError || !newEvent) {
    console.error('[createNextOccurrence] Event clone error:', eventError)
    throw new Error('Failed to create next event occurrence')
  }

  // Clone the menu from the source event (if any)
  const { data: sourceMenu } = await db
    .from('menus')
    .select('*')
    .eq('event_id', sourceEvent.id)
    .eq('tenant_id', tenantId)
    .limit(1)
    .single()

  if (sourceMenu) {
    const { data: newMenu, error: menuError } = await db
      .from('menus')
      .insert({
        tenant_id: tenantId,
        event_id: newEvent.id,
        name: `${sourceMenu.name} (${nextDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`,
        description: sourceMenu.description,
        service_style: sourceMenu.service_style,
        status: 'draft',
        origin_metadata: {
          type: 'forked',
          forked_from_id: sourceMenu.id,
          fork_reason: 'recurring_series',
        },
        created_by: user.id,
        updated_by: user.id,
      } as any)
      .select()
      .single()

    if (!menuError && newMenu) {
      // Clone dishes from source menu
      const { data: sourceDishes } = await db
        .from('dishes')
        .select('*')
        .eq('menu_id', sourceMenu.id)
        .order('course_number', { ascending: true })

      for (const dish of sourceDishes ?? []) {
        const { data: newDish, error: dishError } = await db
          .from('dishes')
          .insert({
            tenant_id: tenantId,
            menu_id: newMenu.id,
            course_name: dish.course_name,
            course_number: dish.course_number,
            name: dish.name,
            description: dish.description,
            is_optional: dish.is_optional,
            price_cents: dish.price_cents,
            allergens: dish.allergens,
            dietary_tags: dish.dietary_tags,
            created_by: user.id,
            updated_by: user.id,
          } as any)
          .select()
          .single()

        if (dishError || !newDish) {
          console.error('[createNextOccurrence] Dish clone error:', dishError)
          continue
        }

        // Clone components for this dish
        const { data: sourceComponents } = await db
          .from('components')
          .select('*')
          .eq('dish_id', dish.id)

        for (const comp of sourceComponents ?? []) {
          const { error: compError } = await db.from('components').insert({
            tenant_id: tenantId,
            dish_id: newDish.id,
            name: comp.name,
            category: comp.category,
            quantity: comp.quantity,
            unit: comp.unit,
            notes: comp.notes,
            prep_station: comp.prep_station,
            created_by: user.id,
            updated_by: user.id,
          } as any)
          if (compError) {
            console.error('[createNextOccurrence] Component clone error:', compError)
          }
        }
      }
    }
  }

  // Reset RSVPs: keep guest list but set all to 'pending'
  const { data: members } = await db.from('hub_group_members').select('id').eq('group_id', circleId)

  if (members?.length) {
    await db.from('hub_group_members').update({ rsvp_status: 'pending' }).eq('group_id', circleId)
  }

  // Update circle to point to the new event
  await db.from('hub_groups').update({ event_id: newEvent.id }).eq('id', circleId)

  // Update recurrence config with last/next occurrence
  if (recConfig) {
    const subsequentDate = computeNextDate(
      nextDate,
      recConfig.pattern,
      recConfig.day_of_week,
      recConfig.custom_interval_days
    )
    await db
      .from('circle_recurrence_configs')
      .update({
        last_occurrence_at: nextDate.toISOString(),
        next_scheduled_at: subsequentDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('circle_id', circleId)
  }

  revalidatePath(`/circle/${circleId}`)
  return newEvent.id
}

// ---------------------------------------------------------------------------
// getSeriesInsights
// ---------------------------------------------------------------------------

export async function getSeriesInsights(circleId: string): Promise<SeriesStats> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  await assertCircleOwner(db, circleId, tenantId)

  // Get all events for this circle
  const { data: events } = await db
    .from('events')
    .select('id, event_date, guest_count, status')
    .eq('tenant_id', tenantId)
    .eq('circle_id', circleId)
    .order('event_date', { ascending: true })

  const eventList = events ?? []
  const totalEvents = eventList.length

  if (totalEvents === 0) {
    return {
      circleId,
      totalEvents: 0,
      averageGuestCount: 0,
      guestRetentionRate: 0,
      totalRevenueCents: 0,
      averageSpendPerEventCents: 0,
      popularDishes: [],
      attendanceTrend: [],
    }
  }

  // Average guest count
  const totalGuests = eventList.reduce((sum: number, ev: any) => sum + (ev.guest_count ?? 0), 0)
  const averageGuestCount = Math.round(totalGuests / totalEvents)

  // Attendance trend
  const attendanceTrend = eventList.map((ev: any) => ({
    date: ev.event_date ?? ev.id,
    count: ev.guest_count ?? 0,
  }))

  // Get revenue across events (from ledger or quotes)
  let totalRevenueCents = 0
  for (const ev of eventList) {
    const { data: quote } = await db
      .from('quotes')
      .select('total_cents')
      .eq('event_id', ev.id)
      .eq('tenant_id', tenantId)
      .eq('status', 'accepted')
      .limit(1)
      .single()
    if (quote?.total_cents) {
      totalRevenueCents += quote.total_cents
    }
  }

  const averageSpendPerEventCents =
    totalEvents > 0 ? Math.round(totalRevenueCents / totalEvents) : 0

  // Popular dishes across all events
  const dishCounts: Record<string, number> = {}
  for (const ev of eventList) {
    const { data: menus } = await db
      .from('menus')
      .select('id')
      .eq('event_id', ev.id)
      .eq('tenant_id', tenantId)

    for (const menu of menus ?? []) {
      const { data: dishes } = await db.from('dishes').select('name').eq('menu_id', menu.id)

      for (const dish of dishes ?? []) {
        if (dish.name) {
          dishCounts[dish.name] = (dishCounts[dish.name] ?? 0) + 1
        }
      }
    }
  }

  const popularDishes = Object.entries(dishCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Guest retention: guests who appeared in 2+ events via hub_group_members
  // For now, compute from member profiles that have attended multiple events
  const { data: members } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', circleId)

  const uniqueProfileIds = new Set((members ?? []).map((m: any) => m.profile_id).filter(Boolean))
  const totalUniqueGuests = uniqueProfileIds.size

  // Retention rate is meaningless with < 2 events, but we still compute
  // Guests who are still active members are "retained"
  const guestRetentionRate =
    totalUniqueGuests > 0 && totalEvents > 1
      ? Math.round((totalUniqueGuests / totalGuests) * 100)
      : 0

  return {
    circleId,
    totalEvents,
    averageGuestCount,
    guestRetentionRate: Math.min(guestRetentionRate, 100),
    totalRevenueCents,
    averageSpendPerEventCents,
    popularDishes,
    attendanceTrend,
  }
}

// ---------------------------------------------------------------------------
// getNextScheduledDate
// ---------------------------------------------------------------------------

export async function getNextScheduledDate(circleId: string): Promise<NextOccurrence | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, user.tenantId!)

  const { data: config } = await db
    .from('circle_recurrence_configs')
    .select('*')
    .eq('circle_id', circleId)
    .single()

  if (!config) return null

  // If we already have a computed next_scheduled_at, use it
  if (config.next_scheduled_at) {
    const nextDate = new Date(config.next_scheduled_at)
    const now = new Date()
    const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      circleId,
      nextDate: config.next_scheduled_at,
      dayOfWeek: nextDate.getDay(),
      daysUntil: Math.max(0, daysUntil),
      basedOnPattern: config.pattern,
    }
  }

  // Compute from last occurrence or current event
  let baseDate: Date
  if (config.last_occurrence_at) {
    baseDate = new Date(config.last_occurrence_at)
  } else {
    // Fall back to current event date
    const { data: circle } = await db
      .from('hub_groups')
      .select('event_id')
      .eq('id', circleId)
      .single()

    if (circle?.event_id) {
      const { data: ev } = await db
        .from('events')
        .select('event_date')
        .eq('id', circle.event_id)
        .single()

      baseDate = ev?.event_date ? new Date(ev.event_date) : new Date()
    } else {
      baseDate = new Date()
    }
  }

  const nextDate = computeNextDate(
    baseDate,
    config.pattern,
    config.day_of_week,
    config.custom_interval_days
  )
  const now = new Date()
  const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    circleId,
    nextDate: nextDate.toISOString(),
    dayOfWeek: nextDate.getDay(),
    daysUntil: Math.max(0, daysUntil),
    basedOnPattern: config.pattern,
  }
}
