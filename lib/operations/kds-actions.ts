// Kitchen Display System (KDS) Server Actions
// Chef-only: Manage service courses during live events
// Tracks course lifecycle: pending -> fired -> plated -> served | eighty_sixed

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateServiceCoursesSchema = z.object({
  eventId: z.string().uuid('Event ID must be a valid UUID'),
  courses: z
    .array(
      z.object({
        courseName: z.string().min(1, 'Course name is required'),
        courseNumber: z.number().int().positive('Course number must be positive'),
      })
    )
    .min(1, 'At least one course is required'),
})

export type CreateServiceCoursesInput = z.infer<typeof CreateServiceCoursesSchema>

// ============================================
// RETURN TYPES
// ============================================

export type ServiceCourse = {
  id: string
  eventId: string
  courseName: string
  courseNumber: number
  status: 'pending' | 'fired' | 'plated' | 'served' | 'eighty_sixed'
  firedAt: string | null
  servedAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================
// HELPERS
// ============================================

function mapServiceCourse(row: any): ServiceCourse {
  return {
    id: row.id,
    eventId: row.event_id,
    courseName: row.course_name,
    courseNumber: row.course_number,
    status: row.status,
    firedAt: row.fired_at ?? null,
    servedAt: row.served_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================
// ACTIONS
// ============================================

/**
 * Get all service courses for an event, ordered by course number.
 */
export async function getServiceCourses(eventId: string): Promise<ServiceCourse[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('service_courses')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('course_number', { ascending: true })

  if (error) {
    console.error('[getServiceCourses] Error:', error)
    throw new Error('Failed to fetch service courses')
  }

  return (data ?? []).map(mapServiceCourse)
}

/**
 * Bulk create service courses for an event.
 * Typically called when setting up the service plan before an event.
 */
export async function createServiceCourses(
  eventId: string,
  courses: { courseName: string; courseNumber: number }[]
) {
  const user = await requireChef()
  const validated = CreateServiceCoursesSchema.parse({ eventId, courses })
  const supabase: any = createServerClient()

  const rows = validated.courses.map((c) => ({
    event_id: validated.eventId,
    chef_id: user.tenantId!,
    course_name: c.courseName,
    course_number: c.courseNumber,
    status: 'pending',
  }))

  const { data, error } = await supabase.from('service_courses').insert(rows).select()

  if (error) {
    console.error('[createServiceCourses] Error:', error)
    throw new Error('Failed to create service courses')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true, courses: (data ?? []).map(mapServiceCourse) }
}

/**
 * Fire a course — marks it as actively being prepared.
 * Sets status='fired' and records the fired_at timestamp.
 */
export async function fireCourse(courseId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('service_courses')
    .update({
      status: 'fired',
      fired_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[fireCourse] Error:', error)
    throw new Error('Failed to fire course')
  }

  revalidatePath(`/events/${data.event_id}`)
  return { success: true, course: mapServiceCourse(data) }
}

/**
 * Mark a course as plated — food is on plates, ready to serve.
 */
export async function markCoursePlated(courseId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('service_courses')
    .update({ status: 'plated' })
    .eq('id', courseId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[markCoursePlated] Error:', error)
    throw new Error('Failed to mark course as plated')
  }

  revalidatePath(`/events/${data.event_id}`)
  return { success: true, course: mapServiceCourse(data) }
}

/**
 * Mark a course as served — food has been delivered to guests.
 * Records the served_at timestamp.
 */
export async function markCourseServed(courseId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('service_courses')
    .update({
      status: 'served',
      served_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[markCourseServed] Error:', error)
    throw new Error('Failed to mark course as served')
  }

  revalidatePath(`/events/${data.event_id}`)
  return { success: true, course: mapServiceCourse(data) }
}

// Aliases for component imports
export async function markPlated(courseId: string) {
  return markCoursePlated(courseId)
}

export async function markServed(courseId: string) {
  return markCourseServed(courseId)
}

/**
 * Mark a course as 86'd (eighty-sixed) — course cancelled or unavailable.
 */
export async function mark86(courseId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('service_courses')
    .update({ status: 'eighty_sixed' })
    .eq('id', courseId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[mark86] Error:', error)
    throw new Error('Failed to 86 course')
  }

  revalidatePath(`/events/${data.event_id}`)
  return { success: true, course: mapServiceCourse(data) }
}
