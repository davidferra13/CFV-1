// Burnout Capacity & Boundary Types
// Complements saturation-types.ts. Saturation = how busy. This = boundaries + burnout risk.

/**
 * Chef-defined capacity boundaries to prevent overwork.
 */
export type CapacityBoundaries = {
  id: string
  tenantId: string
  maxEventsPerWeek: number
  maxGuestsPerEvent: number
  minRestDays: number
  maxConsecutiveDays: number
  createdAt: string
  updatedAt: string
}

/**
 * Input for setting/updating capacity boundaries.
 */
export type CapacityBoundariesInput = {
  maxEventsPerWeek?: number
  maxGuestsPerEvent?: number
  minRestDays?: number
  maxConsecutiveDays?: number
}

/**
 * A date the chef has blocked off for rest or personal time.
 */
export type BlockedDate = {
  id: string
  tenantId: string
  blockedDate: string
  reason: string | null
  createdAt: string
}

/**
 * Individual factor contributing to burnout risk.
 */
export type BurnoutFactor = {
  name: string
  score: number // 0-100
  description: string
}

/**
 * Overall burnout risk assessment for a date range.
 */
export type BurnoutRiskAssessment = {
  overallScore: number // 0-100
  level: 'low' | 'moderate' | 'high' | 'critical'
  factors: BurnoutFactor[]
  dateRange: { start: string; end: string }
  recommendations: string[]
}
