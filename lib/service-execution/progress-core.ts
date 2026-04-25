export type CourseStatus = 'queued' | 'firing' | 'served' | 'skipped'

export type CourseProgress = {
  id: string
  event_id: string
  tenant_id: string
  menu_dish_id: string | null
  course_name: string
  course_order: number
  status: CourseStatus
  planned_time: string | null
  fired_at: string | null
  served_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type EventCourseDish = {
  id: string
  course_name: string | null
  course_number: number | null
  sort_order?: number | null
}

type CourseProgressRow = Omit<
  CourseProgress,
  'created_at' | 'updated_at' | 'fired_at' | 'served_at'
> & {
  created_at: string | Date
  updated_at: string | Date
  fired_at: string | Date | null
  served_at: string | Date | null
}

function normalizeTimestamp(value: string | Date | null | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

function sortCourseDishes(left: EventCourseDish, right: EventCourseDish): number {
  const leftCourse = left.course_number ?? Number.POSITIVE_INFINITY
  const rightCourse = right.course_number ?? Number.POSITIVE_INFINITY
  if (leftCourse !== rightCourse) return leftCourse - rightCourse

  const leftSort = left.sort_order ?? Number.POSITIVE_INFINITY
  const rightSort = right.sort_order ?? Number.POSITIVE_INFINITY
  return leftSort - rightSort
}

export function toCourseProgress(row: unknown): CourseProgress {
  const progress = row as CourseProgressRow

  return {
    id: progress.id,
    event_id: progress.event_id,
    tenant_id: progress.tenant_id,
    menu_dish_id: progress.menu_dish_id,
    course_name: progress.course_name,
    course_order: progress.course_order,
    status: progress.status,
    planned_time: progress.planned_time,
    fired_at: normalizeTimestamp(progress.fired_at),
    served_at: normalizeTimestamp(progress.served_at),
    notes: progress.notes,
    created_at: normalizeTimestamp(progress.created_at) ?? '',
    updated_at: normalizeTimestamp(progress.updated_at) ?? '',
  }
}

export function buildCourseProgressInsertRows(params: {
  eventId: string
  tenantId: string
  dishes: EventCourseDish[]
}): Array<{
  event_id: string
  tenant_id: string
  menu_dish_id: string
  course_name: string
  course_order: number
  status: 'queued'
}> {
  const coursesByNumber = new Map<number, EventCourseDish>()

  for (const dish of [...params.dishes].sort(sortCourseDishes)) {
    const courseNumber = dish.course_number
    if (courseNumber == null || courseNumber === 0 || coursesByNumber.has(courseNumber)) continue
    coursesByNumber.set(courseNumber, dish)
  }

  return [...coursesByNumber.entries()].map(([courseNumber, dish]) => ({
    event_id: params.eventId,
    tenant_id: params.tenantId,
    menu_dish_id: dish.id,
    course_name: dish.course_name?.trim() || `Course ${courseNumber}`,
    course_order: courseNumber,
    status: 'queued',
  }))
}

export function buildCourseStatusUpdate(params: {
  current: Pick<CourseProgress, 'fired_at' | 'served_at'>
  newStatus: 'firing' | 'served' | 'skipped'
  nowIso: string
}): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    status: params.newStatus,
    updated_at: params.nowIso,
  }

  if (params.newStatus === 'firing') {
    updateData.fired_at = params.current.fired_at ?? params.nowIso
  }

  if (params.newStatus === 'served') {
    updateData.served_at = params.current.served_at ?? params.nowIso
  }

  return updateData
}
