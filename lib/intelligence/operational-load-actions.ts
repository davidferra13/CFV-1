'use server'

import { requireChef } from '@/lib/auth/get-user'
import {
  calculateDayLoad,
  calculateWeekLoad,
  calculateMonthLoad,
  getLoadForecast,
  buildWeekSummary,
  type DayLoad,
  type WeekLoadSummary,
  type LoadForecast,
} from './operational-load'

// ---- Single Day ------------------------------------------------------------

export async function getDayLoad(date: string): Promise<DayLoad> {
  const user = await requireChef()
  return calculateDayLoad(user.tenantId!, date)
}

// ---- Week ------------------------------------------------------------------

export async function getWeekLoad(weekStart: string): Promise<WeekLoadSummary> {
  const user = await requireChef()
  const days = await calculateWeekLoad(user.tenantId!, weekStart)
  return buildWeekSummary(days)
}

// ---- Month -----------------------------------------------------------------

export async function getMonthLoad(
  month: number,
  year: number
): Promise<DayLoad[]> {
  const user = await requireChef()
  return calculateMonthLoad(user.tenantId!, month, year)
}

// ---- Forecast --------------------------------------------------------------

export async function getLoadForecastAction(
  days: number = 14
): Promise<LoadForecast> {
  const user = await requireChef()
  const clampedDays = Math.min(Math.max(days, 1), 60)
  return getLoadForecast(user.tenantId!, clampedDays)
}

// ---- This Week (convenience for dashboard) ---------------------------------

export async function getThisWeekLoad(): Promise<WeekLoadSummary> {
  const user = await requireChef()
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))

  const weekStart = [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, '0'),
    String(monday.getDate()).padStart(2, '0'),
  ].join('-')

  const days = await calculateWeekLoad(user.tenantId!, weekStart)
  return buildWeekSummary(days)
}
