'use client'

import { useEffect, useState, useTransition } from 'react'
import { getActiveSeasonalPeriod } from '@/lib/scheduling/seasonal-availability-actions'

type Props = {
  className?: string
}

export default function LocationBadge({ className }: Props) {
  const [location, setLocation] = useState<string | null>(null)
  const [periodName, setPeriodName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const period = await getActiveSeasonalPeriod()
        if (!cancelled) {
          setLocation(period?.location ?? null)
          setPeriodName(period?.period_name ?? null)
        }
      } catch {
        // Non-blocking: if it fails, just show "Home base"
      } finally {
        if (!cancelled) setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ${className ?? ''}`}
      >
        ...
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        location ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      } ${className ?? ''}`}
      title={periodName ? `${periodName} - ${location}` : 'No active seasonal period'}
    >
      <svg
        className="h-3 w-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      {location ?? 'Home base'}
    </span>
  )
}
