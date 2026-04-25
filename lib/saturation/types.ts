/**
 * One dimension of saturation (e.g. time, events, guests).
 */
export type SaturationDimension = {
  label: string
  current: number
  max: number
  percent: number // 0-100, clamped
}

/**
 * Complete saturation snapshot for a time period.
 */
export type SaturationSnapshot = {
  /** Weighted overall saturation 0-100 */
  overall: number
  /** Individual dimensions */
  dimensions: {
    /** Days with events / available (non-blocked) days */
    time: SaturationDimension
    /** Total events / max allowed events in period */
    events: SaturationDimension
    /** Total guests across events / comfortable guest ceiling */
    guests: SaturationDimension
  }
  /** What period this covers */
  period: 'week' | 'month'
  /** Human label like "Apr 21 - Apr 27" */
  periodLabel: string
  /** Derived from overall % */
  status: 'low' | 'moderate' | 'high' | 'critical'
  /** Human-readable warnings */
  warnings: string[]
}
