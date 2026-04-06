import {
  isWithinBusinessHours,
  type BusinessHoursConfig,
  type DaySchedule,
  type WeekSchedule,
} from '@/lib/communication/business-hours-utils'

export type SupportHoursSummaryLine = {
  dayLabel: string
  hoursLabel: string
}

export type ContactSupportInfo = {
  supportEmail: string
  isConfigured: boolean
  isOpen: boolean | null
  statusLabel: string | null
  currentTimeLabel: string | null
  hoursSummary: SupportHoursSummaryLine[]
}

const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const satisfies Array<keyof WeekSchedule>

const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

function schedulesMatch(left: DaySchedule, right: DaySchedule): boolean {
  return left.enabled === right.enabled && left.start === right.start && left.end === right.end
}

function formatDayRange(startIndex: number, endIndex: number): string {
  const start = DAY_LABELS[DAY_KEYS[startIndex]]
  const end = DAY_LABELS[DAY_KEYS[endIndex]]
  return startIndex === endIndex ? start : `${start} - ${end}`
}

function formatScheduleTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`1970-01-01T${value}:00Z`))
}

function formatHoursLabel(day: DaySchedule): string {
  if (!day.enabled) return 'Closed'
  return `${formatScheduleTime(day.start)} - ${formatScheduleTime(day.end)}`
}

export function summarizeBusinessHours(schedule: WeekSchedule): SupportHoursSummaryLine[] {
  const lines: SupportHoursSummaryLine[] = []

  let index = 0
  while (index < DAY_KEYS.length) {
    const currentKey = DAY_KEYS[index]
    const currentDay = schedule[currentKey]
    let endIndex = index

    while (endIndex + 1 < DAY_KEYS.length) {
      const nextDay = schedule[DAY_KEYS[endIndex + 1]]
      if (!schedulesMatch(currentDay, nextDay)) break
      endIndex += 1
    }

    lines.push({
      dayLabel: formatDayRange(index, endIndex),
      hoursLabel: formatHoursLabel(currentDay),
    })

    index = endIndex + 1
  }

  return lines
}

export function buildContactSupportInfo(params: {
  supportEmail: string
  businessHoursConfig?: BusinessHoursConfig | null
  now?: Date
}): ContactSupportInfo {
  const { supportEmail, businessHoursConfig, now = new Date() } = params

  if (!businessHoursConfig) {
    return {
      supportEmail,
      isConfigured: false,
      isOpen: null,
      statusLabel: null,
      currentTimeLabel: null,
      hoursSummary: [{ dayLabel: 'Monday - Sunday', hoursLabel: 'We respond within 24 hours' }],
    }
  }

  const isOpen = isWithinBusinessHours(businessHoursConfig, now)
  const currentTimeLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: businessHoursConfig.timezone,
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(now)

  return {
    supportEmail,
    isConfigured: true,
    isOpen,
    statusLabel: isOpen ? 'Open now' : 'Closed now',
    currentTimeLabel,
    hoursSummary: summarizeBusinessHours(businessHoursConfig.schedule),
  }
}
