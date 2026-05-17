// Saturation Tracking - Type Definitions
// Types for daily/weekly/monthly capacity saturation, warnings, and trends.

/**
 * Saturation data for a single day.
 */
export type SaturationDay = {
  date: string
  dayName: string
  eventCount: number
  maxEvents: number
  /** 0-100, clamped */
  saturationPercent: number
  status: 'available' | 'light' | 'moderate' | 'busy' | 'at_capacity' | 'overbooked' | 'blocked'
  isBlocked: boolean
}

/**
 * Saturation data for a full week (Mon-Sun).
 */
export type SaturationWeek = {
  weekStart: string
  weekEnd: string
  days: SaturationDay[]
  totalEvents: number
  maxWeeklyEvents: number
  weekSaturationPercent: number
  status: 'low' | 'moderate' | 'high' | 'critical'
}

/**
 * Saturation data for a full month.
 */
export type SaturationMonth = {
  year: number
  month: number
  days: SaturationDay[]
  totalEvents: number
  availableDays: number
  monthSaturationPercent: number
  status: 'low' | 'moderate' | 'high' | 'critical'
}

/**
 * Chef's configured capacity limits.
 */
export type CapacityConfig = {
  id: string
  tenantId: string
  maxEventsPerDay: number
  maxEventsPerWeek: number
  prepDaysBefore: number
  restDaysAfter: number
  blackoutDays: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Input for creating or updating capacity config.
 */
export type CapacityConfigInput = {
  maxEventsPerDay?: number
  maxEventsPerWeek?: number
  prepDaysBefore?: number
  restDaysAfter?: number
  blackoutDays?: string[]
}

/**
 * A warning about capacity issues in a date range.
 */
export type SaturationWarning = {
  date: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  eventCount: number
  maxEvents: number
}

/**
 * Historical saturation trend for a single month.
 */
export type SaturationTrendPoint = {
  year: number
  month: number
  label: string
  totalEvents: number
  availableDays: number
  saturationPercent: number
  status: 'low' | 'moderate' | 'high' | 'critical'
}

/**
 * Historical utilization trends over multiple months.
 */
export type SaturationTrends = {
  points: SaturationTrendPoint[]
  averageSaturation: number
  peakMonth: SaturationTrendPoint | null
  lowestMonth: SaturationTrendPoint | null
}
