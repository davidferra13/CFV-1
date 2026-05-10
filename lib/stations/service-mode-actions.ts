// Station Service Mode - Real-time service state for live events
// Pulls KDS course data, station assignments, and 86'd items into a unified view.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type StationServiceStatus = 'idle' | 'ready' | 'firing' | 'plating' | 'done'

export type StationServiceState = {
  stationId: string
  stationName: string
  status: StationServiceStatus
  currentCourse: string | null
  courseNumber: number | null
  eightySixedItems: Array<{ id: string; name: string; stationName: string }>
  assignedDishes: Array<{ id: string; name: string; courseNumber: number }>
  activeEventId: string | null
  activeEventName: string | null
}

export type ServiceModeData = {
  isServiceActive: boolean
  activeEvent: { id: string; occasion: string; guestCount: number; serveTime: string | null } | null
  stations: StationServiceState[]
  currentCourseNumber: number
  totalCourses: number
  courseName: string | null
}

/**
 * Get active service state across all stations.
 * Checks if any event is in_progress, then pulls KDS course data and station assignments.
 */
export async function getServiceModeData(): Promise<ServiceModeData> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Find active event (in_progress). Events use tenant_id.
  const { data: activeEvents } = await db
    .from('events')
    .select('id, occasion, guest_count, serve_time')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'in_progress')
    .order('event_date', { ascending: false })
    .limit(1)

  const activeEvent = activeEvents?.[0] ?? null

  if (!activeEvent) {
    return {
      isServiceActive: false,
      activeEvent: null,
      stations: [],
      currentCourseNumber: 0,
      totalCourses: 0,
      courseName: null,
    }
  }

  // Fetch stations, courses, assignments, and 86'd items in parallel
  const [stationsResult, coursesResult, assignmentsResult, eightySixResult] = await Promise.all([
    db
      .from('stations')
      .select('id, name, display_order')
      .eq('chef_id', user.tenantId!)
      .order('display_order'),
    db
      .from('service_courses')
      .select('*')
      .eq('event_id', activeEvent.id)
      .eq('chef_id', user.tenantId!)
      .order('course_number'),
    db
      .from('event_station_dishes')
      .select('id, station_id, dish_id, dishes(id, name, course_name, course_number)')
      .eq('event_id', activeEvent.id)
      .eq('chef_id', user.tenantId!),
    db
      .from('clipboard_entries')
      .select('id, station_id, stations(name), station_components(name)')
      .eq('chef_id', user.tenantId!)
      .eq('is_86d', true),
  ])

  const stations = stationsResult.data ?? []
  const courses = coursesResult.data ?? []
  const assignments = assignmentsResult.data ?? []
  const eightySixed = eightySixResult.data ?? []

  // Determine current course (first non-served, non-86'd course)
  const currentCourse = courses.find(
    (c: any) => c.status !== 'served' && c.status !== 'eighty_sixed'
  )
  const currentCourseNumber = currentCourse?.course_number ?? 0
  const totalCourses = courses.length

  // Map station service states
  const stationStates: StationServiceState[] = stations.map((station: any) => {
    // Get dishes assigned to this station
    const stationDishes = assignments
      .filter((a: any) => a.station_id === station.id)
      .map((a: any) => ({
        id: a.dish_id,
        name: a.dishes?.name ?? a.dishes?.course_name ?? 'Untitled dish',
        courseNumber: a.dishes?.course_number ?? 0,
      }))

    // Get 86'd items for this station
    const station86 = eightySixed
      .filter((e: any) => e.station_id === station.id)
      .map((e: any) => ({
        id: e.id,
        name: e.station_components?.name ?? 'Unknown',
        stationName: station.name,
      }))

    // Determine station status based on current course and dish assignments
    let status: StationServiceStatus = 'idle'
    if (currentCourse && stationDishes.length > 0) {
      const hasCurrentCourseDishes = stationDishes.some(
        (d: any) => d.courseNumber === currentCourse.course_number
      )
      if (hasCurrentCourseDishes) {
        if (currentCourse.status === 'fired') status = 'firing'
        else if (currentCourse.status === 'plated') status = 'plating'
        else status = 'ready'
      }
      // If station has dishes for NEXT course only, mark as ready
      const hasNextCourseDishes = stationDishes.some(
        (d: any) => d.courseNumber === currentCourse.course_number + 1
      )
      if (!hasCurrentCourseDishes && hasNextCourseDishes) status = 'ready'
      // If all station dishes are in served courses
      const allServed = stationDishes.every((d: any) => {
        const course = courses.find((c: any) => c.course_number === d.courseNumber)
        return course?.status === 'served'
      })
      if (allServed) status = 'done'
    }

    return {
      stationId: station.id,
      stationName: station.name,
      status,
      currentCourse: currentCourse?.course_name ?? null,
      courseNumber: currentCourseNumber,
      eightySixedItems: station86,
      assignedDishes: stationDishes,
      activeEventId: activeEvent.id,
      activeEventName: activeEvent.occasion,
    }
  })

  return {
    isServiceActive: true,
    activeEvent: {
      id: activeEvent.id,
      occasion: activeEvent.occasion,
      guestCount: activeEvent.guest_count,
      serveTime: activeEvent.serve_time,
    },
    stations: stationStates,
    currentCourseNumber,
    totalCourses,
    courseName: currentCourse?.course_name ?? null,
  }
}

/**
 * Broadcast an 86'd item to all stations (creates ops log entry).
 */
export async function broadcastEightySix(input: {
  itemName: string
  stationId: string
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    await db.from('ops_log').insert({
      chef_id: user.tenantId!,
      action_type: 'eighty_six',
      station_id: input.stationId,
      details: { itemName: input.itemName, reason: input.reason ?? null, broadcast: true },
    })

    revalidatePath('/stations')
    return { success: true }
  } catch (error) {
    console.error('[broadcastEightySix] Error:', error)
    return { success: false, error: 'Failed to broadcast 86' }
  }
}
