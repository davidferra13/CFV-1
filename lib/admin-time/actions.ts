// Admin Time Tracking - Server Actions
// Logs administrative time (emails, calls, planning, etc.) with optional event linkage.
// Extends the event's effective hourly rate calculation to include all true overhead.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'

// ============================================
// SCHEMAS
// ============================================

const LogAdminTimeSchema = z.object({
  category: z.enum([
    'email',
    'calls',
    'planning',
    'bookkeeping',
    'marketing',
    'sourcing',
    'travel_admin',
    'other',
  ]),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minutes: z.number().int().positive('Minutes must be positive'),
  notes: z.string().optional(),
  event_id: z.string().uuid().nullable().optional(),
})

export type LogAdminTimeInput = z.infer<typeof LogAdminTimeSchema>

// NOTE: ADMIN_TIME_CATEGORIES has been moved to './constants' - import from there instead.

// ============================================
// ACTIONS
// ============================================

export async function logAdminTime(input: LogAdminTimeInput) {
  const user = await requireChef()
  const validated = LogAdminTimeSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('admin_time_logs')
    .insert({
      chef_id: user.tenantId!,
      ...validated,
    })
    .select()
    .single()

  if (error) {
    console.error('[logAdminTime] Error:', error)
    throw new Error('Failed to log time')
  }

  revalidatePath('/insights/time-analysis')
  if (validated.event_id) revalidatePath(`/events/${validated.event_id}`)
  return data
}

export async function deleteAdminTimeLog(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  await db.from('admin_time_logs').delete().eq('id', id).eq('chef_id', user.tenantId!)

  revalidatePath('/insights/time-analysis')
}

/**
 * Get admin time logs for a date range.
 * Returns logs with category breakdown and total minutes.
 */
export async function getAdminTimeForPeriod(startDate: string, endDate: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('admin_time_logs')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .gte('log_date', startDate)
    .lte('log_date', endDate)
    .order('log_date', { ascending: false })

  if (error) throw new Error('Failed to load admin time logs')

  const logs = data ?? []
  const totalMinutes = logs.reduce((sum: number, l: any) => sum + l.minutes, 0)

  // Aggregate by category
  const byCategory: Record<string, number> = {}
  for (const log of logs) {
    byCategory[log.category] = (byCategory[log.category] ?? 0) + log.minutes
  }

  return { logs, totalMinutes, byCategory }
}

/**
 * Get admin time this week (Mon–Sun).
 */
export async function getAdminTimeThisWeek() {
  const today = new Date()
  const start = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const end = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return getAdminTimeForPeriod(start, end)
}

/**
 * Get all admin time linked to a specific event (for event-level total time).
 */
export async function getAdminTimeForEvent(eventId: string): Promise<number> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('admin_time_logs')
    .select('minutes')
    .eq('chef_id', user.tenantId!)
    .eq('event_id', eventId)

  return (data ?? []).reduce((sum: number, l: any) => sum + l.minutes, 0)
}

/**
 * Monthly admin time summary for insights page.
 */
export async function getMonthlyAdminTimeSummary(year: number, month: number) {
  const date = new Date(year, month - 1, 1)
  const start = format(startOfMonth(date), 'yyyy-MM-dd')
  const end = format(endOfMonth(date), 'yyyy-MM-dd')
  return getAdminTimeForPeriod(start, end)
}
