'use server'

import { requireChef } from '@/lib/auth/get-user'
import {
  generateRevenueForecast,
  getBookingVelocity,
  getSeasonalPattern,
  getRevenueHealth,
  type RevenueForecastResult,
  type BookingVelocity,
  type SeasonalPatternMonth,
  type RevenueHealth,
} from './revenue-forecast'

export type {
  RevenueForecastResult,
  MonthlyForecast,
  BookingVelocity,
  BookingVelocityMonth,
  SeasonalPatternMonth,
  RevenueHealth,
} from './revenue-forecast'

/**
 * Get the full revenue forecast for the authenticated chef.
 * Projects revenue for the next N months using confirmed bookings,
 * weighted pipeline, and historical seasonal patterns.
 */
export async function getRevenueForecastAction(
  months: number = 6
): Promise<RevenueForecastResult> {
  const user = await requireChef()
  return generateRevenueForecast(user.tenantId!, months)
}

/**
 * Get booking velocity (events booked per month) for the last 12 months.
 */
export async function getBookingVelocityAction(): Promise<BookingVelocity> {
  const user = await requireChef()
  return getBookingVelocity(user.tenantId!)
}

/**
 * Get seasonal booking pattern (which months are historically busiest).
 */
export async function getSeasonalPatternAction(): Promise<SeasonalPatternMonth[]> {
  const user = await requireChef()
  return getSeasonalPattern(user.tenantId!)
}

/**
 * Get current month revenue health (actual vs target, pace indicator).
 */
export async function getRevenueHealthAction(): Promise<RevenueHealth> {
  const user = await requireChef()
  return getRevenueHealth(user.tenantId!)
}
