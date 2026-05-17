// Day-Of Timeline Estimation Logic
// Calculates prep, fire, plate, travel, setup, and cleanup times
// All defaults are chef-adjustable via the timeline UI

import type { CourseEstimate } from './timeline-generator-types'

// ── Default Timing Constants ─────────────────────────────────────────────────

const DEFAULTS = {
  // Per-course defaults (minutes)
  SIMPLE_PREP: 15,
  COMPLEX_PREP: 35,
  FIRE_TIME: 12,
  PLATE_TIME: 8,

  // Scaling: extra minutes per 10 guests above 10
  GUEST_SCALING_THRESHOLD: 10,
  GUEST_SCALING_MINUTES: 10,

  // Variant parallel prep per variant track
  VARIANT_EXTRA_MINUTES: 10,

  // Between courses (service pacing)
  BETWEEN_COURSES_MINUTES: 15,

  // Setup and cleanup
  SETUP_MINUTES: 30,
  CLEANUP_MINUTES: 30,

  // Travel buffer
  TRAFFIC_BUFFER_MINUTES: 15, // for drives over 60 min
  ARRIVAL_BUFFER_MINUTES: 10, // parking, unload assessment
  TRAFFIC_BUFFER_THRESHOLD: 60, // minutes of drive before adding buffer
} as const

export { DEFAULTS as TIMELINE_DEFAULTS }

// ── Course Estimation ────────────────────────────────────────────────────────

type CourseInput = {
  courseNumber: number
  courseName: string
  componentCount: number
  isComplex: boolean // sous vide, multi-technique, etc.
  variantCount: number // dietary variants (vegan, GF, etc.)
}

/**
 * Estimate timing for a single course based on complexity and variants.
 */
export function estimateCourseTiming(course: CourseInput, guestCount: number): CourseEstimate {
  // Base prep time
  const basePrepMinutes = course.isComplex ? DEFAULTS.COMPLEX_PREP : DEFAULTS.SIMPLE_PREP

  // Scale for large parties
  const extraGuests = Math.max(0, guestCount - DEFAULTS.GUEST_SCALING_THRESHOLD)
  const scalingFactor = Math.ceil(extraGuests / 10)
  const guestScaling = scalingFactor * DEFAULTS.GUEST_SCALING_MINUTES

  // Component count scaling (beyond 3 components adds time)
  const componentScaling = Math.max(0, course.componentCount - 3) * 5

  const prepMinutes = basePrepMinutes + guestScaling + componentScaling

  // Fire and plate scale slightly with guest count
  const fireMinutes = DEFAULTS.FIRE_TIME + Math.floor(scalingFactor * 3)
  const plateMinutes = DEFAULTS.PLATE_TIME + Math.floor(scalingFactor * 2)

  // Variant parallel prep
  const variantExtraMinutes = course.variantCount * DEFAULTS.VARIANT_EXTRA_MINUTES

  return {
    courseNumber: course.courseNumber,
    courseName: course.courseName,
    prepMinutes,
    fireMinutes,
    plateMinutes,
    variantCount: course.variantCount,
    variantExtraMinutes,
  }
}

// ── Travel Estimation ────────────────────────────────────────────────────────

/**
 * Calculate total travel time including buffers.
 * Returns total minutes from departure to ready-for-setup.
 */
export function estimateTravelTime(driveMinutes: number): {
  totalMinutes: number
  departureBuffer: number
  arrivalBuffer: number
} {
  const trafficBuffer =
    driveMinutes >= DEFAULTS.TRAFFIC_BUFFER_THRESHOLD ? DEFAULTS.TRAFFIC_BUFFER_MINUTES : 0

  return {
    totalMinutes: driveMinutes + trafficBuffer + DEFAULTS.ARRIVAL_BUFFER_MINUTES,
    departureBuffer: trafficBuffer,
    arrivalBuffer: DEFAULTS.ARRIVAL_BUFFER_MINUTES,
  }
}

// ── Full Day Estimation ──────────────────────────────────────────────────────

type DayEstimationInput = {
  courses: CourseInput[]
  guestCount: number
  travelMinutes?: number
  setupMinutes?: number
  cleanupMinutes?: number
}

type DayEstimation = {
  courseEstimates: CourseEstimate[]
  totalPrepMinutes: number
  totalServiceMinutes: number
  setupMinutes: number
  cleanupMinutes: number
  travelMinutes: number
  travelWithBuffers: number
  totalDayMinutes: number
  departureOffsetMinutes: number // minutes before service time to depart
}

/**
 * Estimate the full day from departure to cleanup completion.
 * All times are relative to service time (first course served).
 */
export function estimateFullDay(input: DayEstimationInput): DayEstimation {
  const courseEstimates = input.courses.map((c) => estimateCourseTiming(c, input.guestCount))

  // Total prep = sum of all course preps + variant extras
  const totalPrepMinutes = courseEstimates.reduce(
    (sum, c) => sum + c.prepMinutes + c.variantExtraMinutes,
    0
  )

  // Total service = fire + plate per course + between-course gaps
  const totalServiceMinutes = courseEstimates.reduce((sum, c, i) => {
    const courseService = c.fireMinutes + c.plateMinutes
    const gap = i < courseEstimates.length - 1 ? DEFAULTS.BETWEEN_COURSES_MINUTES : 0
    return sum + courseService + gap
  }, 0)

  const setupMinutes = input.setupMinutes ?? DEFAULTS.SETUP_MINUTES
  const cleanupMinutes = input.cleanupMinutes ?? DEFAULTS.CLEANUP_MINUTES

  const rawTravelMinutes = input.travelMinutes ?? 0
  const travel = estimateTravelTime(rawTravelMinutes)

  // How many minutes before service time to depart:
  // travel + setup + all prep + fire/plate for first course
  const firstCourse = courseEstimates[0]
  const firstCourseFirePlate = firstCourse ? firstCourse.fireMinutes + firstCourse.plateMinutes : 0

  const departureOffsetMinutes =
    travel.totalMinutes + setupMinutes + totalPrepMinutes + firstCourseFirePlate

  const totalDayMinutes =
    travel.totalMinutes +
    setupMinutes +
    totalPrepMinutes +
    totalServiceMinutes +
    cleanupMinutes +
    travel.totalMinutes // return trip

  return {
    courseEstimates,
    totalPrepMinutes,
    totalServiceMinutes,
    setupMinutes,
    cleanupMinutes,
    travelMinutes: rawTravelMinutes,
    travelWithBuffers: travel.totalMinutes,
    totalDayMinutes,
    departureOffsetMinutes,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Subtract minutes from a Date, returning a new Date.
 */
export function subtractMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() - minutes * 60_000)
}

/**
 * Add minutes to a Date, returning a new Date.
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}
