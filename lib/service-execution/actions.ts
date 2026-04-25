'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildCourseProgressInsertRows,
  buildCourseStatusUpdate,
  toCourseProgress,
  type CourseProgress,
  type EventCourseDish,
} from '@/lib/service-execution/progress-core'

export type { CourseProgress, CourseStatus } from '@/lib/service-execution/progress-core'

async function getCourseProgressRows(
  db: ReturnType<typeof createServerClient>,
  eventId: string,
  tenantId: string
): Promise<CourseProgress[]> {
  const { data, error } = await db
    .from('event_course_progress')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('course_order', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to load course progress')
  }

  return ((data ?? []) as unknown[]).map(toCourseProgress)
}

export async function getCourseProgress(eventId: string): Promise<CourseProgress[]> {
  const user = await requireChef()
  const db = createServerClient()
  return getCourseProgressRows(db, eventId, user.tenantId!)
}

export async function initializeCourseProgress(eventId: string): Promise<CourseProgress[]> {
  const user = await requireChef()
  const db = createServerClient()
  const tenantId = user.tenantId!

  const existing = await getCourseProgressRows(db, eventId, tenantId)
  if (existing.length > 0) return existing

  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  if ((event as { status?: string }).status !== 'in_progress') {
    return []
  }

  const { data: dishes, error: dishesError } = await db
    .from('dishes')
    .select(
      `
      id, course_name, course_number, sort_order,
      menu:menus!inner(event_id)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('menu.event_id', eventId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (dishesError) {
    throw new Error(dishesError.message || 'Failed to load event menu courses')
  }

  const courseRows = buildCourseProgressInsertRows({
    eventId,
    tenantId,
    dishes: (dishes ?? []) as EventCourseDish[],
  })

  if (courseRows.length === 0) return []

  const { error: insertError } = await db
    .from('event_course_progress')
    .upsert(courseRows, { onConflict: 'event_id,course_order', ignoreDuplicates: true })

  if (insertError) {
    throw new Error(insertError.message || 'Failed to initialize course progress')
  }

  revalidatePath(`/events/${eventId}`)
  return getCourseProgressRows(db, eventId, tenantId)
}

export async function advanceCourseStatus(
  progressId: string,
  newStatus: 'firing' | 'served' | 'skipped'
): Promise<CourseProgress> {
  const user = await requireChef()
  const db = createServerClient()
  const tenantId = user.tenantId!

  if (!['firing', 'served', 'skipped'].includes(newStatus)) {
    throw new Error('Invalid course status')
  }

  const { data: existing, error: existingError } = await db
    .from('event_course_progress')
    .select('*')
    .eq('id', progressId)
    .eq('tenant_id', tenantId)
    .single()

  if (existingError || !existing) {
    throw new Error('Course progress not found')
  }

  const row = toCourseProgress(existing)
  const now = new Date().toISOString()
  const updateData = buildCourseStatusUpdate({
    current: row,
    newStatus,
    nowIso: now,
  })

  const { data: updated, error: updateError } = await db
    .from('event_course_progress')
    .update(updateData)
    .eq('id', progressId)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (updateError || !updated) {
    throw new Error(updateError?.message || 'Failed to update course progress')
  }

  const progress = toCourseProgress(updated)
  revalidatePath(`/events/${progress.event_id}`)
  return progress
}

export async function updateCourseNotes(progressId: string, notes: string): Promise<void> {
  const user = await requireChef()
  const db = createServerClient()
  const tenantId = user.tenantId!

  const { data: existing, error: existingError } = await db
    .from('event_course_progress')
    .select('id')
    .eq('id', progressId)
    .eq('tenant_id', tenantId)
    .single()

  if (existingError || !existing) {
    throw new Error('Course progress not found')
  }

  const normalizedNotes = notes.trim()
  const { error } = await db
    .from('event_course_progress')
    .update({
      notes: normalizedNotes.length > 0 ? normalizedNotes : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', progressId)
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(error.message || 'Failed to update course notes')
  }
}
