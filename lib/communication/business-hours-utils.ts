// Pure utility functions for business hours logic.
// No 'use server', no auth, no React dependencies.
// Safe to import from tests and server actions alike.

export type DaySchedule = {
  enabled: boolean
  start: string // 'HH:mm'
  end: string // 'HH:mm'
}

export type WeekSchedule = {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export type BusinessHoursConfig = {
  id: string
  chef_id: string
  timezone: string
  schedule: WeekSchedule
  outside_hours_message: string
  emergency_enabled: boolean
  emergency_window_hours: number
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Check if the current time falls within business hours for the given config.
 * Uses the chef's configured timezone.
 */
export function isWithinBusinessHours(config: BusinessHoursConfig, now?: Date): boolean {
  const currentTime = now ?? new Date()

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(currentTime)
  const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase()
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)

  if (!weekday) return false

  const dayConfig = config.schedule[weekday as keyof WeekSchedule]
  if (!dayConfig?.enabled) return false

  const currentMinutes = hour * 60 + minute
  const startMinutes = parseTimeToMinutes(dayConfig.start)
  const endMinutes = parseTimeToMinutes(dayConfig.end)

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Check if an event is happening within the emergency window.
 * If so, messages should bypass business hours restrictions.
 */
export function isEmergencyContext(config: BusinessHoursConfig, eventDate: string | null): boolean {
  if (!config.emergency_enabled || !eventDate) return false

  const eventTime = new Date(eventDate).getTime()
  const now = Date.now()
  const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60)

  return hoursUntilEvent <= config.emergency_window_hours && hoursUntilEvent >= 0
}

/**
 * Get the next time business hours start (for scheduling held notifications).
 */
export function getNextBusinessHoursStart(config: BusinessHoursConfig): Date {
  const now = new Date()
  const maxDaysAhead = 8

  for (let offset = 0; offset < maxDaysAhead; offset++) {
    const checkDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000)

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: config.timezone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const parts = formatter.formatToParts(checkDate)
    const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase()

    if (!weekday) continue

    const dayConfig = config.schedule[weekday as keyof WeekSchedule]
    if (!dayConfig?.enabled) continue

    const startMinutes = parseTimeToMinutes(dayConfig.start)

    if (offset === 0) {
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
      const currentMinutes = hour * 60 + minute

      if (currentMinutes < startMinutes) {
        const result = new Date(checkDate)
        result.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
        return result
      }
      continue
    }

    const result = new Date(checkDate)
    result.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
    return result
  }

  // Fallback: 24 hours from now
  return new Date(now.getTime() + 24 * 60 * 60 * 1000)
}
