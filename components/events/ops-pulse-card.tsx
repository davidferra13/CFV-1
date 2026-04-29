'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

type PrepDay = {
  label: string
  itemCount: number
  totalMinutes: number
  isPast: boolean
  isToday: boolean
}

type Props = {
  eventDate?: string | null
  serveTime?: string | null
  status: string
  completionScore?: number | null
  prepDays?: PrepDay[]
  groceryDeadline?: string | null
  untimedCount?: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toTitle(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function badgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'cancelled') return 'error'
  if (status === 'completed' || status === 'confirmed' || status === 'in_progress') return 'success'
  if (status === 'paid' || status === 'accepted') return 'warning'
  if (status === 'proposed') return 'info'
  return 'default'
}

function dateFromString(value?: string | null) {
  if (!value) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2]) - 1
    const day = Number(match[3])
    const date = new Date(year, month, day)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value?: string | null) {
  const date = dateFromString(value)
  if (!date) return null
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`
}

function formatServeTime(value?: string | null) {
  if (!value) return null

  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return value

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return value

  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${suffix}`
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (remainder === 0) return `${hours} hr`
  return `${hours} hr ${remainder} min`
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return value === 1 ? singular : pluralLabel
}

function metricValue(value: string, unavailable = false) {
  return (
    <p
      className={
        unavailable
          ? 'text-sm font-semibold text-stone-500'
          : 'text-sm font-semibold text-stone-100'
      }
    >
      {value}
    </p>
  )
}

export function OpsPulseCard({
  eventDate,
  serveTime,
  status,
  completionScore,
  prepDays,
  groceryDeadline,
  untimedCount,
}: Props) {
  const eventDateLabel = formatDate(eventDate)
  const serveTimeLabel = formatServeTime(serveTime)
  const groceryDeadlineLabel = formatDate(groceryDeadline)
  const hasCompletionScore = typeof completionScore === 'number' && Number.isFinite(completionScore)
  const displayScore = hasCompletionScore
    ? Math.max(0, Math.min(100, Math.round(completionScore)))
    : null
  const hasPrepDays = Array.isArray(prepDays)
  const prepDayCount = hasPrepDays ? prepDays.length : 0
  const prepItemCount = hasPrepDays
    ? prepDays.reduce((sum, day) => sum + Math.max(0, day.itemCount), 0)
    : 0
  const prepMinutes = hasPrepDays
    ? prepDays.reduce((sum, day) => sum + Math.max(0, day.totalMinutes), 0)
    : 0
  const todayItemCount = hasPrepDays
    ? prepDays
        .filter((day) => day.isToday)
        .reduce((sum, day) => sum + Math.max(0, day.itemCount), 0)
    : 0
  const pastPrepDayCount = hasPrepDays ? prepDays.filter((day) => day.isPast).length : 0
  const nextPrepDay = hasPrepDays ? prepDays.find((day) => !day.isPast && day.itemCount > 0) : null
  const untimedLabel =
    typeof untimedCount === 'number' && Number.isFinite(untimedCount)
      ? `${Math.max(0, untimedCount)}`
      : 'Unavailable'

  return (
    <Card className="p-4" data-cf-surface="chef:ops-pulse-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Ops pulse</p>
          <p className="mt-1 text-sm text-stone-400">Current operational facts for this event.</p>
        </div>
        <Badge variant={badgeVariant(status)}>{toTitle(status || 'unknown')}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Event timing</p>
          {eventDateLabel ? metricValue(eventDateLabel) : metricValue('Unavailable', true)}
          <p className="mt-1 text-xs text-stone-500">
            {serveTimeLabel ? `Serve time ${serveTimeLabel}` : 'Serve time unavailable'}
          </p>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Completion</p>
          {displayScore === null
            ? metricValue('Unavailable', true)
            : metricValue(`${displayScore}%`)}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${displayScore ?? 0}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Prep plan</p>
          {hasPrepDays
            ? metricValue(`${prepDayCount} ${plural(prepDayCount, 'prep day')}`)
            : metricValue('Unavailable', true)}
          <p className="mt-1 text-xs text-stone-500">
            {hasPrepDays
              ? `${prepItemCount} ${plural(prepItemCount, 'item')} timed, ${formatMinutes(prepMinutes)}`
              : 'Prep timeline unavailable'}
          </p>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Grocery deadline
          </p>
          {groceryDeadline === undefined
            ? metricValue('Unavailable', true)
            : groceryDeadlineLabel
              ? metricValue(groceryDeadlineLabel)
              : metricValue('Not scheduled', true)}
          <p className="mt-1 text-xs text-stone-500">
            {nextPrepDay ? `Next prep: ${nextPrepDay.label}` : 'Next prep unavailable'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-800 pt-3 text-xs text-stone-400">
        <span className="rounded-full bg-stone-900 px-3 py-1">
          Today:{' '}
          {hasPrepDays ? `${todayItemCount} ${plural(todayItemCount, 'item')}` : 'Unavailable'}
        </span>
        <span className="rounded-full bg-stone-900 px-3 py-1">
          Past prep days: {hasPrepDays ? pastPrepDayCount : 'Unavailable'}
        </span>
        <span className="rounded-full bg-stone-900 px-3 py-1">Untimed: {untimedLabel}</span>
      </div>
    </Card>
  )
}
