import { z } from 'zod'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME_24H = /^\d{2}:\d{2}(:\d{2})?$/

export const BookingServiceModeSchema = z.enum(['one_off', 'recurring', 'multi_day'])

export const ServiceSessionRequestSchema = z.object({
  service_date: z.string().regex(ISO_DATE),
  meal_slot: z
    .enum(['breakfast', 'lunch', 'dinner', 'late_snack', 'dropoff', 'other'])
    .default('dinner'),
  execution_type: z.enum(['on_site', 'drop_off', 'prep_only', 'hybrid']).default('on_site'),
  start_time: z.string().regex(TIME_24H).optional(),
  end_time: z.string().regex(TIME_24H).optional(),
  guest_count: z.number().int().positive().max(10000).optional(),
  notes: z.string().max(2000).optional(),
})

export const ScheduleRequestSchema = z.object({
  start_date: z.string().regex(ISO_DATE).optional(),
  end_date: z.string().regex(ISO_DATE).optional(),
  sessions: z.array(ServiceSessionRequestSchema).max(200).optional(),
  outline: z.string().max(5000).optional(),
})

export type BookingServiceMode = z.infer<typeof BookingServiceModeSchema>
export type ServiceSessionRequest = z.infer<typeof ServiceSessionRequestSchema>
export type ScheduleRequest = z.infer<typeof ScheduleRequestSchema>

export function summarizeScheduleRequest(schedule?: ScheduleRequest): string | null {
  if (!schedule) return null

  const sessionCount = schedule.sessions?.length ?? 0
  const range =
    schedule.start_date && schedule.end_date
      ? `${schedule.start_date} to ${schedule.end_date}`
      : schedule.start_date
        ? `starting ${schedule.start_date}`
        : schedule.end_date
          ? `through ${schedule.end_date}`
          : null

  if (sessionCount > 0) {
    return `Schedule request: ${sessionCount} service block(s)${
      range ? ` (${range})` : ''
    }.${schedule.outline ? ` ${schedule.outline}` : ''}`
  }

  if (range || schedule.outline) {
    return `Schedule request${range ? ` (${range})` : ''}.${schedule.outline ? ` ${schedule.outline}` : ''}`
  }

  return null
}
