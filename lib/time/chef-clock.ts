const DEFAULT_CHEF_TIMEZONE = 'America/New_York'

export type ChefClockTimezoneSource = 'event' | 'chef' | 'browser' | 'fallback'

export interface ChefClockInput {
  now?: Date | string
  eventTimezone?: string | null
  chefTimezone?: string | null
  browserTimezone?: string | null
  locale?: string
}

export interface ChefClock {
  utcNow: string
  timezone: string
  timezoneSource: ChefClockTimezoneSource
  localDate: string
  localTime: string
  weekday: string
  dateLabel: string
  timeLabel: string
  dateTimeLabel: string
  hour: number
  timeOfDay: 'late_night' | 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening'
  note: string
}

interface ResolvedTimezone {
  timezone: string
  source: ChefClockTimezoneSource
}

function normalizeTimezone(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).format(new Date())
    return trimmed
  } catch {
    return null
  }
}

export function resolveChefClockTimezone(input: ChefClockInput = {}): ResolvedTimezone {
  const eventTimezone = normalizeTimezone(input.eventTimezone)
  if (eventTimezone) return { timezone: eventTimezone, source: 'event' }

  const chefTimezone = normalizeTimezone(input.chefTimezone)
  if (chefTimezone) return { timezone: chefTimezone, source: 'chef' }

  const browserTimezone = normalizeTimezone(input.browserTimezone)
  if (browserTimezone) return { timezone: browserTimezone, source: 'browser' }

  return { timezone: DEFAULT_CHEF_TIMEZONE, source: 'fallback' }
}

function getPartMap(
  date: Date,
  timezone: string,
  locale: string
): Record<Intl.DateTimeFormatPartTypes, string> {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  })

  return formatter.formatToParts(date).reduce(
    (parts, part) => {
      if (part.type !== 'literal') {
        parts[part.type] = part.value
      }
      return parts
    },
    {} as Record<Intl.DateTimeFormatPartTypes, string>
  )
}

function getTimeOfDay(hour: number): ChefClock['timeOfDay'] {
  if (hour >= 22 || hour < 5) return 'late_night'
  if (hour < 8) return 'early_morning'
  if (hour < 12) return 'morning'
  if (hour < 14) return 'midday'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function getTimeOfDayNote(timeOfDay: ChefClock['timeOfDay']): string {
  switch (timeOfDay) {
    case 'late_night':
      return 'late night - the chef is working late. Be concise, they may be tired.'
    case 'early_morning':
      return 'early morning - the chef is starting their day. Good time for a brief daily overview.'
    case 'midday':
      return 'lunch break - keep responses efficient.'
    default:
      return ''
  }
}

function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function dateKeyFromParts(parts: {
  year: number | string
  month: number | string
  day: number | string
}): string {
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-')
}

export function getChefClock(input: ChefClockInput = {}): ChefClock {
  const locale = input.locale ?? 'en-US'
  const rawNow = input.now ? new Date(input.now) : new Date()
  const now = Number.isNaN(rawNow.getTime()) ? new Date() : rawNow
  const { timezone, source } = resolveChefClockTimezone(input)
  const parts = getPartMap(now, timezone, locale)
  const hour = Number(parts.hour)
  const timeOfDay = getTimeOfDay(hour)

  return {
    utcNow: now.toISOString(),
    timezone,
    timezoneSource: source,
    localDate: dateKeyFromParts({
      year: parts.year,
      month: parts.month,
      day: parts.day,
    }),
    localTime: `${parts.hour}:${parts.minute}:${parts.second}`,
    weekday: parts.weekday,
    dateLabel: new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(now),
    timeLabel: new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(now),
    dateTimeLabel: new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(now),
    hour,
    timeOfDay,
    note: getTimeOfDayNote(timeOfDay),
  }
}

export function dateKeyForChefClock(
  value: string | Date | null | undefined,
  clock: ChefClock
): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    const dateOnly = parseDateOnly(value)
    if (dateOnly) return dateKeyFromParts(dateOnly)
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const parts = getPartMap(date, clock.timezone, 'en-US')
  return dateKeyFromParts({
    year: parts.year,
    month: parts.month,
    day: parts.day,
  })
}

export function isSameChefDate(value: string | Date | null | undefined, clock: ChefClock): boolean {
  return dateKeyForChefClock(value, clock) === clock.localDate
}

export function daysUntilChefDate(
  value: string | Date | null | undefined,
  clock: ChefClock
): number | null {
  const key = dateKeyForChefClock(value, clock)
  if (!key) return null
  const current = parseDateOnly(clock.localDate)
  const target = parseDateOnly(key)
  if (!current || !target) return null

  const currentUtc = Date.UTC(current.year, current.month - 1, current.day)
  const targetUtc = Date.UTC(target.year, target.month - 1, target.day)
  return Math.ceil((targetUtc - currentUtc) / (1000 * 60 * 60 * 24))
}
