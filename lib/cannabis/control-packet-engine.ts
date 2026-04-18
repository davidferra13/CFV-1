export type ControlPacketLayoutType = 'linear' | 'grid_2x5' | 'grid_3x4' | 'custom'

export type ControlPacketParticipationStatus =
  | 'participate'
  | 'not_consume'
  | 'undecided'
  | 'no_response'

export interface ControlPacketGuestInput {
  guestId: string
  fullName: string
  participationStatus: ControlPacketParticipationStatus
  rsvpStatus: string
  preferredDoseNote?: string | null
  createdAt?: string | null
}

export interface ControlPacketSeatBlueprint {
  seatId: string
  seatIndex: number
  row: number | null
  column: number | null
}

export interface ControlPacketSeatSnapshot extends ControlPacketSeatBlueprint {
  guestId: string | null
  guestName: string | null
  participationStatus: ControlPacketParticipationStatus
  courseTracking: Array<{
    courseNumber: number
    doseApplied: boolean
    skipped: boolean
    optedOutDuringService: boolean
  }>
}

export interface ControlPacketReconciliationGuestRow {
  guestId?: string | null
  guestName: string
  totalMgPlanned?: number | null
  totalMgServed?: number | null
  breakdownPerCourseMg?: number[]
  perCourse?: Array<{
    courseNumber: number
    mgServed?: number | null
    doseApplied?: boolean
    skipped?: boolean
    optedOutDuringService?: boolean
  }>
  notes?: string | null
}

const LINEAR_PREFIX = 'S'
const MAX_SEAT_COUNT = 300

function safePositiveInt(value: number | null | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  const rounded = Math.floor(Number(value))
  return rounded > 0 ? rounded : fallback
}

export function normalizeCourseCount(value: number | null | undefined): number {
  return safePositiveInt(value, 1)
}

function linearSeatIds(count: number): ControlPacketSeatBlueprint[] {
  return Array.from({ length: count }, (_, index) => ({
    seatId: `${LINEAR_PREFIX}${index + 1}`,
    seatIndex: index,
    row: null,
    column: null,
  }))
}

function gridSeatIds(rows: number, columns: number, count: number): ControlPacketSeatBlueprint[] {
  const seatCount = Math.max(count, rows * columns)
  return Array.from({ length: seatCount }, (_, index) => {
    const row = Math.floor(index / columns) + 1
    const column = (index % columns) + 1
    return {
      seatId: `R${row}C${column}`,
      seatIndex: index,
      row,
      column,
    }
  })
}

export function generateSeatBlueprint(
  layoutType: ControlPacketLayoutType,
  seatCountTarget: number,
  customSeatIds: string[] = []
): ControlPacketSeatBlueprint[] {
  const safeSeatCount = Math.min(safePositiveInt(seatCountTarget, 1), MAX_SEAT_COUNT)

  if (layoutType === 'grid_2x5') return gridSeatIds(2, 5, safeSeatCount)
  if (layoutType === 'grid_3x4') return gridSeatIds(3, 4, safeSeatCount)

  if (layoutType === 'custom') {
    const sanitized = customSeatIds
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 300)

    if (sanitized.length === 0) return linearSeatIds(safeSeatCount)

    const withFallback = [...sanitized]
    while (withFallback.length < safeSeatCount) {
      withFallback.push(`${LINEAR_PREFIX}${withFallback.length + 1}`)
    }

    return withFallback.map((seatId, index) => ({
      seatId,
      seatIndex: index,
      row: null,
      column: null,
    }))
  }

  return linearSeatIds(safeSeatCount)
}

export function assignGuestsToSeats(
  guests: ControlPacketGuestInput[],
  seats: ControlPacketSeatBlueprint[],
  courseCount: number
): ControlPacketSeatSnapshot[] {
  const safeCourses = normalizeCourseCount(courseCount)
  const sortedGuests = [...guests].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0
    if (aTime !== bTime) return aTime - bTime
    return a.fullName.localeCompare(b.fullName)
  })

  return seats.map((seat, index) => {
    const guest = sortedGuests[index] ?? null

    return {
      ...seat,
      guestId: guest?.guestId ?? null,
      guestName: guest?.fullName ?? null,
      participationStatus: guest?.participationStatus ?? 'no_response',
      courseTracking: Array.from({ length: safeCourses }, (_, courseIndex) => ({
        courseNumber: courseIndex + 1,
        doseApplied: false,
        skipped: false,
        optedOutDuringService: false,
      })),
    }
  })
}

function toNumberOrNull(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.round(parsed * 1000) / 1000
}

export function sumMg(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => {
    const parsed = toNumberOrNull(value)
    return total + (parsed ?? 0)
  }, 0)
}

export interface ControlPacketMismatchSummary {
  missingEntries: string[]
  plannedVsServedMismatch: string[]
  courseMismatch: string[]
  invalidPerCourseSum: string[]
  missingGuestName: number
  totalGuestRows: number
}

export function evaluateReconciliation(
  snapshotGuestNames: string[],
  guestRows: ControlPacketReconciliationGuestRow[],
  courseCount: number
): ControlPacketMismatchSummary {
  const safeCourses = normalizeCourseCount(courseCount)
  const normalizedGuestNames = snapshotGuestNames
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => name.toLowerCase())

  const rowNameSet = new Set(
    guestRows.map((row) => row.guestName.trim().toLowerCase()).filter(Boolean)
  )

  const missingEntries = normalizedGuestNames
    .filter((name) => !rowNameSet.has(name))
    .map((name) => name)

  const plannedVsServedMismatch: string[] = []
  const courseMismatch: string[] = []
  const invalidPerCourseSum: string[] = []
  let missingGuestName = 0

  for (const row of guestRows) {
    const guestName = row.guestName.trim()
    if (!guestName) {
      missingGuestName += 1
      continue
    }

    const planned = toNumberOrNull(row.totalMgPlanned)
    const served = toNumberOrNull(row.totalMgServed)

    if (planned !== null && served !== null && Math.abs(planned - served) > 0.001) {
      plannedVsServedMismatch.push(guestName)
    }

    const breakdown = (row.breakdownPerCourseMg ?? []).map((value) => toNumberOrNull(value) ?? 0)
    const perCourse = row.perCourse ?? []

    if (
      (breakdown.length > 0 && breakdown.length !== safeCourses) ||
      perCourse.length > safeCourses
    ) {
      courseMismatch.push(guestName)
    }

    if (breakdown.length > 0 && served !== null) {
      const breakdownSum = sumMg(breakdown)
      if (Math.abs(breakdownSum - served) > 0.001) {
        invalidPerCourseSum.push(guestName)
      }
    }
  }

  return {
    missingEntries,
    plannedVsServedMismatch,
    courseMismatch,
    invalidPerCourseSum,
    missingGuestName,
    totalGuestRows: guestRows.length,
  }
}

export function summarizeParticipationStatuses(guests: ControlPacketGuestInput[]) {
  return guests.reduce(
    (acc, guest) => {
      acc.total += 1
      if (guest.participationStatus === 'participate') acc.participating += 1
      if (guest.participationStatus === 'not_consume') acc.notConsuming += 1
      if (guest.participationStatus === 'undecided') acc.undecided += 1
      if (guest.participationStatus === 'no_response') acc.noResponse += 1
      return acc
    },
    {
      total: 0,
      participating: 0,
      notConsuming: 0,
      undecided: 0,
      noResponse: 0,
    }
  )
}
