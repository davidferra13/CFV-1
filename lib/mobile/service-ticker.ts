// Service Day Ticker - Timeline data builder
// Builds a timed service sequence from event menu data.
// Each course gets: fire, plate, serve, clear steps.

export type StepStatus = 'pending' | 'active' | 'completed'

export type StepType = 'prep' | 'fire' | 'plate' | 'serve' | 'clear' | 'milestone'

export interface ServiceStep {
  id: string
  label: string
  type: StepType
  scheduledTime: string | null // ISO time string
  completedAt: string | null
  status: StepStatus
  courseNumber: number | null
  courseName: string | null
  elapsedMs: number | null // time spent on this step (if completed)
}

export interface ServiceTimeline {
  eventId: string
  eventName: string
  clientName: string | null
  guestCount: number
  serveTime: string | null
  steps: ServiceStep[]
  currentStepIndex: number
  totalSteps: number
  completedSteps: number
}

interface CourseInfo {
  id: string
  name: string
  courseNumber: number
  courseName: string | null
}

/**
 * Build service steps from a list of courses.
 * Each course gets 4 steps: fire, plate, serve, clear.
 * Timing is estimated based on serve_time and course order.
 */
export function buildServiceSteps(
  courses: CourseInfo[],
  serveTime: string | null,
  completedStepIds: Set<string> = new Set(),
  stepTimestamps: Map<string, string> = new Map()
): ServiceStep[] {
  const steps: ServiceStep[] = []

  // Sort courses by course number
  const sorted = [...courses].sort((a, b) => a.courseNumber - b.courseNumber)

  // Estimate timing: 15 min per course cycle (fire to clear)
  // Start 30 min before serve time for first course prep
  let baseTime: Date | null = null
  if (serveTime) {
    try {
      const today = new Date()
      const [hours, minutes] = serveTime.split(':').map(Number)
      baseTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes)
      // Start prep 30 min before serve
      baseTime = new Date(baseTime.getTime() - 30 * 60 * 1000)
    } catch {
      // Invalid time format, skip timing
    }
  }

  // Add setup milestone
  const setupId = 'step-setup'
  steps.push({
    id: setupId,
    label: 'STATION SETUP',
    type: 'milestone',
    scheduledTime: baseTime ? new Date(baseTime.getTime()).toISOString() : null,
    completedAt: stepTimestamps.get(setupId) ?? null,
    status: completedStepIds.has(setupId) ? 'completed' : 'pending',
    courseNumber: null,
    courseName: null,
    elapsedMs: null,
  })

  // Build steps for each course
  let minuteOffset = 15 // Start 15 min after setup

  for (const course of sorted) {
    const stepTypes: { type: StepType; label: string; offset: number }[] = [
      { type: 'fire', label: `FIRE: ${course.name}`, offset: 0 },
      { type: 'plate', label: `PLATE: ${course.name}`, offset: 5 },
      { type: 'serve', label: `SERVE: ${course.name}`, offset: 8 },
      { type: 'clear', label: `CLEAR: ${course.name}`, offset: 12 },
    ]

    for (const st of stepTypes) {
      const stepId = `step-${course.id}-${st.type}`
      const scheduledTime = baseTime
        ? new Date(baseTime.getTime() + (minuteOffset + st.offset) * 60 * 1000).toISOString()
        : null

      steps.push({
        id: stepId,
        label: st.label,
        type: st.type,
        scheduledTime,
        completedAt: stepTimestamps.get(stepId) ?? null,
        status: completedStepIds.has(stepId) ? 'completed' : 'pending',
        courseNumber: course.courseNumber,
        courseName: course.courseName,
        elapsedMs: null,
      })
    }

    minuteOffset += 15 // 15 min per course cycle
  }

  // Add final milestone
  const cleanupId = 'step-cleanup'
  steps.push({
    id: cleanupId,
    label: 'SERVICE COMPLETE',
    type: 'milestone',
    scheduledTime: baseTime
      ? new Date(baseTime.getTime() + minuteOffset * 60 * 1000).toISOString()
      : null,
    completedAt: stepTimestamps.get(cleanupId) ?? null,
    status: completedStepIds.has(cleanupId) ? 'completed' : 'pending',
    courseNumber: null,
    courseName: null,
    elapsedMs: null,
  })

  // Compute elapsed times for completed steps
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].completedAt && i > 0) {
      const prevCompleted = steps[i - 1].completedAt
      if (prevCompleted) {
        steps[i].elapsedMs =
          new Date(steps[i].completedAt!).getTime() - new Date(prevCompleted).getTime()
      }
    }
  }

  // Set current active step (first non-completed)
  let foundActive = false
  for (const step of steps) {
    if (step.status !== 'completed' && !foundActive) {
      step.status = 'active'
      foundActive = true
    }
  }

  return steps
}

/**
 * If no courses exist, generate generic service steps.
 */
export function buildGenericSteps(
  serveTime: string | null,
  completedStepIds: Set<string> = new Set(),
  stepTimestamps: Map<string, string> = new Map()
): ServiceStep[] {
  const genericCourses = [
    { label: 'SETUP STATION', type: 'milestone' as StepType },
    { label: 'PREP INGREDIENTS', type: 'prep' as StepType },
    { label: 'FIRE APPETIZERS', type: 'fire' as StepType },
    { label: 'PLATE APPETIZERS', type: 'plate' as StepType },
    { label: 'SERVE APPETIZERS', type: 'serve' as StepType },
    { label: 'FIRE MAIN COURSE', type: 'fire' as StepType },
    { label: 'PLATE MAIN COURSE', type: 'plate' as StepType },
    { label: 'SERVE MAIN COURSE', type: 'serve' as StepType },
    { label: 'FIRE DESSERT', type: 'fire' as StepType },
    { label: 'PLATE DESSERT', type: 'plate' as StepType },
    { label: 'SERVE DESSERT', type: 'serve' as StepType },
    { label: 'SERVICE COMPLETE', type: 'milestone' as StepType },
  ]

  let baseTime: Date | null = null
  if (serveTime) {
    try {
      const today = new Date()
      const [hours, minutes] = serveTime.split(':').map(Number)
      baseTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes)
      baseTime = new Date(baseTime.getTime() - 30 * 60 * 1000)
    } catch {
      // skip
    }
  }

  const steps: ServiceStep[] = genericCourses.map((c, i) => {
    const stepId = `step-generic-${i}`
    return {
      id: stepId,
      label: c.label,
      type: c.type,
      scheduledTime: baseTime
        ? new Date(baseTime.getTime() + i * 10 * 60 * 1000).toISOString()
        : null,
      completedAt: stepTimestamps.get(stepId) ?? null,
      status: completedStepIds.has(stepId) ? ('completed' as StepStatus) : ('pending' as StepStatus),
      courseNumber: null,
      courseName: null,
      elapsedMs: null,
    }
  })

  // Set active
  let foundActive = false
  for (const step of steps) {
    if (step.status !== 'completed' && !foundActive) {
      step.status = 'active'
      foundActive = true
    }
  }

  return steps
}
