'use client'

import { useEffect, useMemo, useState } from 'react'

type Props = {
  eventDate: string
  serveTime?: string | null
  status: string
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function parseEventDateTime(eventDate: string, serveTime?: string | null): Date | null {
  const datePart = eventDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!datePart) return null

  const trimmedTime = serveTime?.trim()
  if (!trimmedTime) {
    const dateOnly = new Date(`${datePart}T00:00:00`)
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly
  }

  const normalizedTime = trimmedTime
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()

  const meridiemMatch = normalizedTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/)
  if (meridiemMatch) {
    let hour = Number(meridiemMatch[1])
    const minute = Number(meridiemMatch[2] ?? '0')

    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null
    if (meridiemMatch[3] === 'PM' && hour !== 12) hour += 12
    if (meridiemMatch[3] === 'AM' && hour === 12) hour = 0

    const parsed = new Date(
      `${datePart}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
    )
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const twentyFourHourMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})$/)
  if (twentyFourHourMatch) {
    const hour = Number(twentyFourHourMatch[1])
    const minute = Number(twentyFourHourMatch[2])
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

    const parsed = new Date(
      `${datePart}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
    )
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const fallback = new Date(`${datePart}T${trimmedTime}`)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

function getCountdownParts(diffMs: number) {
  const days = Math.floor(diffMs / DAY_MS)
  const hours = Math.floor((diffMs % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((diffMs % HOUR_MS) / (60 * 1000))

  if (days >= 1) {
    return {
      value: `${days}d ${hours}h`,
      detail: `${days} day${days === 1 ? '' : 's'} until service`,
    }
  }

  if (hours >= 1) {
    return {
      value: `${hours}h ${minutes}m`,
      detail: 'Service is today',
    }
  }

  return {
    value: `${Math.max(minutes, 0)}m`,
    detail: 'Final service window',
  }
}

export function ChefEventCountdown({ eventDate, serveTime, status }: Props) {
  if (status === 'completed' || status === 'cancelled') return null

  const target = useMemo(() => parseEventDateTime(eventDate, serveTime), [eventDate, serveTime])
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  if (!target) return null

  const diffMs = target.getTime() - now.getTime()

  if (status === 'in_progress' || diffMs <= 0) {
    return (
      <div
        className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm"
        aria-live="polite"
      >
        <p className="font-semibold text-emerald-100">
          {status === 'in_progress' ? 'Event in progress' : 'Service time reached'}
        </p>
        <p className="text-xs text-emerald-200/80">
          {target.toLocaleDateString()} {serveTime ? `at ${serveTime}` : ''}
        </p>
      </div>
    )
  }

  const countdown = getCountdownParts(diffMs)

  return (
    <div
      className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm"
      aria-live="polite"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-amber-300">Countdown</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-amber-100">
        {countdown.value}
      </p>
      <p className="text-xs text-amber-200/80">{countdown.detail}</p>
    </div>
  )
}
