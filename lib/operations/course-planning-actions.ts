// Course Planning Server Actions
// Manages service course order for events.
// Uses service_courses table (from migration 20260312000006)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type ServiceCourse = {
  id: string
  eventId: string
  chefId: string
  courseName: string
  courseNumber: number
  notes: string | null
  createdAt: string
}

// --- Schemas ---

const GenerateCoursesSchema = z.object({
  eventId: z.string().uuid(),
  courseNames: z
    .array(z.string().min(1, 'Course name is required'))
    .min(1, 'At least one course is required'),
})

const ReorderCoursesSchema = z.object({
  courseIds: z.array(z.string().uuid()).min(1, 'At least one course ID is required'),
})

// --- Actions ---

/**
 * Generate default service courses for an event.
 * Creates service_courses entries numbered sequentially based on the
 * provided course names array.
 */
export async function generateDefaultCourses(
  eventId: string,
  courseNames: string[]
): Promise<{ success: boolean; courses: ServiceCourse[] }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const validated = GenerateCoursesSchema.parse({ eventId, courseNames })

  // Verify the event belongs to this tenant
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  // Check if courses already exist for this event
  const { data: existingCourses } = await supabase
    .from('service_courses')
    .select('id')
    .eq('event_id', validated.eventId)
    .eq('chef_id', user.tenantId!)

  if (existingCourses && existingCourses.length > 0) {
    // Delete existing courses before generating new ones
    await supabase
      .from('service_courses')
      .delete()
      .eq('event_id', validated.eventId)
      .eq('chef_id', user.tenantId!)
  }

  // Create new courses numbered sequentially
  const insertPayload = validated.courseNames.map((name, index) => ({
    event_id: validated.eventId,
    chef_id: user.tenantId!,
    course_name: name.trim(),
    course_number: index + 1,
    notes: null,
  }))

  const { data: courses, error } = await supabase
    .from('service_courses')
    .insert(insertPayload)
    .select()

  if (error) {
    console.error('[generateDefaultCourses] Error:', error)
    throw new Error('Failed to generate service courses')
  }

  revalidatePath(`/events/${validated.eventId}`)

  return {
    success: true,
    courses: (courses || []).map((row: any) => ({
      id: row.id,
      eventId: row.event_id,
      chefId: row.chef_id,
      courseName: row.course_name,
      courseNumber: row.course_number,
      notes: row.notes,
      createdAt: row.created_at,
    })),
  }
}

/**
 * Reorder service courses based on the provided array of course IDs.
 * The position in the array determines the new course_number (1-indexed).
 */
export async function reorderCourses(courseIds: string[]): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const validated = ReorderCoursesSchema.parse({ courseIds })

  // Verify all courses belong to this chef
  const { data: existingCourses, error: fetchError } = await supabase
    .from('service_courses')
    .select('id, event_id')
    .eq('chef_id', user.tenantId!)
    .in('id', validated.courseIds)

  if (fetchError) {
    console.error('[reorderCourses] Fetch error:', fetchError)
    throw new Error('Failed to verify course ownership')
  }

  if (!existingCourses || existingCourses.length !== validated.courseIds.length) {
    throw new Error('One or more courses not found or do not belong to you')
  }

  // Update each course's course_number based on its index in the array
  const updatePromises = validated.courseIds.map((courseId, index) =>
    supabase
      .from('service_courses')
      .update({ course_number: index + 1 })
      .eq('id', courseId)
      .eq('chef_id', user.tenantId!)
  )

  const results = await Promise.all(updatePromises)

  // Check for errors
  for (const result of results) {
    if (result.error) {
      console.error('[reorderCourses] Update error:', result.error)
      throw new Error('Failed to reorder courses')
    }
  }

  // Revalidate the event page if we can determine the event ID
  const eventId = existingCourses[0]?.event_id
  if (eventId) {
    revalidatePath(`/events/${eventId}`)
  }

  return { success: true }
}

/**
 * Get all service courses for an event, ordered by course_number.
 */
export async function getEventCourses(eventId: string): Promise<ServiceCourse[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const validatedEventId = z.string().uuid().parse(eventId)

  const { data, error } = await supabase
    .from('service_courses')
    .select('*')
    .eq('event_id', validatedEventId)
    .eq('chef_id', user.tenantId!)
    .order('course_number', { ascending: true })

  if (error) {
    console.error('[getEventCourses] Error:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    chefId: row.chef_id,
    courseName: row.course_name,
    courseNumber: row.course_number,
    notes: row.notes,
    createdAt: row.created_at,
  }))
}

/**
 * Update notes on a specific course.
 */
export async function updateCourseNotes(
  courseId: string,
  notes: string
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const validatedCourseId = z.string().uuid().parse(courseId)
  const validatedNotes = z.string().max(1000).parse(notes)

  const { data: course, error: fetchError } = await supabase
    .from('service_courses')
    .select('event_id')
    .eq('id', validatedCourseId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !course) {
    throw new Error('Course not found')
  }

  const { error } = await supabase
    .from('service_courses')
    .update({ notes: validatedNotes || null })
    .eq('id', validatedCourseId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[updateCourseNotes] Error:', error)
    throw new Error('Failed to update course notes')
  }

  if (course.event_id) {
    revalidatePath(`/events/${course.event_id}`)
  }

  return { success: true }
}
