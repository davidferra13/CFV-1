'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type TimelineEntry = {
  label: string
  time: string | null
  completed: boolean
  active: boolean
}

export type ServiceTimeline = {
  entries: TimelineEntry[]
  /** Percentage of timeline completed (0-100) */
  progressPercent: number
  /** Total elapsed since service start, in minutes */
  elapsedMinutes: number | null
  /** Estimated total service duration in minutes */
  estimatedTotalMinutes: number | null
}

/**
 * Builds a service day timeline from event timestamps.
 * Each milestone (shopping, prep, travel, courses, cleanup) becomes an entry.
 * Progress is computed from completed entries.
 */
export async function getServiceTimeline(eventId: string): Promise<ServiceTimeline> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      `
      id, event_date, serve_time, arrival_time,
      shopping_started_at, shopping_completed_at,
      prep_started_at, prep_completed_at,
      travel_started_at, travel_completed_at,
      service_started_at, service_completed_at,
      reset_started_at, reset_completed_at,
      car_packed, car_packed_at
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    throw new Error(eventError?.message || 'Event not found')
  }

  const { data: courseRows } = await db
    .from('event_course_progress')
    .select('course_name, course_order, status, fired_at, served_at')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('course_order', { ascending: true })
    .catch(() => ({ data: [] }))

  const courses = courseRows ?? []

  const entries: TimelineEntry[] = []

  entries.push({
    label: 'Shopping',
    time: event.shopping_completed_at ?? event.shopping_started_at ?? null,
    completed: Boolean(event.shopping_completed_at),
    active: Boolean(event.shopping_started_at) && !event.shopping_completed_at,
  })

  entries.push({
    label: 'Prep',
    time: event.prep_completed_at ?? event.prep_started_at ?? null,
    completed: Boolean(event.prep_completed_at),
    active: Boolean(event.prep_started_at) && !event.prep_completed_at,
  })

  entries.push({
    label: 'Car packed',
    time: event.car_packed_at ?? null,
    completed: Boolean(event.car_packed),
    active: false,
  })

  entries.push({
    label: 'Travel',
    time: event.travel_completed_at ?? event.travel_started_at ?? null,
    completed: Boolean(event.travel_completed_at),
    active: Boolean(event.travel_started_at) && !event.travel_completed_at,
  })

  entries.push({
    label: 'Service started',
    time: event.service_started_at ?? null,
    completed: Boolean(event.service_started_at),
    active: false,
  })

  for (const course of courses) {
    const isServed = course.status === 'served' || course.status === 'skipped'
    const isFiring = course.status === 'firing'
    entries.push({
      label: course.course_name ?? `Course ${course.course_order}`,
      time: (course as any).served_at ?? (course as any).fired_at ?? null,
      completed: isServed,
      active: isFiring,
    })
  }

  entries.push({
    label: 'Service complete',
    time: event.service_completed_at ?? null,
    completed: Boolean(event.service_completed_at),
    active: false,
  })

  entries.push({
    label: 'Reset complete',
    time: event.reset_completed_at ?? event.reset_started_at ?? null,
    completed: Boolean(event.reset_completed_at),
    active: Boolean(event.reset_started_at) && !event.reset_completed_at,
  })

  const completedCount = entries.filter((e) => e.completed).length
  const progressPercent =
    entries.length > 0 ? Math.round((completedCount / entries.length) * 100) : 0

  let elapsedMinutes: number | null = null
  if (event.service_started_at) {
    const startMs = new Date(event.service_started_at).getTime()
    const endMs = event.service_completed_at
      ? new Date(event.service_completed_at).getTime()
      : Date.now()
    if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
      elapsedMinutes = Math.round((endMs - startMs) / 60000)
    }
  }

  const courseCount = courses.length || 1
  const estimatedTotalMinutes = 30 + courseCount * 20 + 30

  return {
    entries,
    progressPercent,
    elapsedMinutes,
    estimatedTotalMinutes,
  }
}
