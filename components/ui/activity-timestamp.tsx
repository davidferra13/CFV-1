import React from 'react'

import { formatExactTimestamp, formatRelativeTime } from '@/lib/time/format-relative-time'

type ActivityTimestampProps = {
  at: string | Date | null | undefined
  label?: string
  className?: string
  fallback?: string
}

function parseTimestamp(input: string | Date | null | undefined): Date | null {
  if (!input) return null
  const date = input instanceof Date ? input : new Date(input)
  return Number.isNaN(date.getTime()) ? null : date
}

export function ActivityTimestamp({ at, label, className, fallback }: ActivityTimestampProps) {
  const date = parseTimestamp(at)

  if (!date) {
    return fallback ?? null
  }

  const relativeText = formatRelativeTime(date)
  const displayText = label ? `${label} ${relativeText}` : relativeText

  return (
    <time
      dateTime={date.toISOString()}
      title={formatExactTimestamp(date)}
      className={className ?? 'text-xs text-stone-400 shrink-0 mt-0.5'}
      suppressHydrationWarning
    >
      {displayText}
    </time>
  )
}
