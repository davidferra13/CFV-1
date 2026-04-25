const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

function parseTimestamp(input: string | Date): Date | null {
  const date = input instanceof Date ? input : new Date(input)
  return Number.isNaN(date.getTime()) ? null : date
}

function localDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)
}

function formatAbsoluteDate(date: Date, now: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  }

  if (date.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric'
  }

  return date.toLocaleDateString('en-US', options)
}

export function formatRelativeTime(input: string | Date, now: Date = new Date()): string {
  const date = parseTimestamp(input)
  if (!date || Number.isNaN(now.getTime())) return ''

  const diffMs = now.getTime() - date.getTime()
  if (diffMs < MINUTE_MS) return 'now'

  const diffMinutes = Math.floor(diffMs / MINUTE_MS)
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMs / HOUR_MS)
  if (diffHours < 24) return `${diffHours}h ago`

  const localDayDiff = localDayNumber(now) - localDayNumber(date)

  if (localDayDiff === 1) return 'yesterday'
  if (localDayDiff > 1 && localDayDiff < 7) return `${localDayDiff}d ago`

  return formatAbsoluteDate(date, now)
}

export function formatExactTimestamp(input: string | Date): string {
  const date = parseTimestamp(input)
  if (!date) return ''

  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${datePart} at ${timePart}`
}
