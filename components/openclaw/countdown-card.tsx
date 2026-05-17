'use client'

import { useState, useEffect } from 'react'
import type { CountdownStatus } from '@/lib/openclaw/countdown-types'
import { getCountdownStatus } from '@/lib/openclaw/countdown-actions'

function formatRemaining(ms: number): { days: number; hours: number; minutes: number } {
  const totalMinutes = Math.floor(ms / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  return { days, hours, minutes }
}

export function OpenClawCountdownCard() {
  const [status, setStatus] = useState<CountdownStatus | null>(null)
  const [remaining, setRemaining] = useState<{
    days: number
    hours: number
    minutes: number
  } | null>(null)
  const [progressPct, setProgressPct] = useState(0)
  const [loading, setLoading] = useState(true)

  // Load countdown data from server
  useEffect(() => {
    let cancelled = false
    getCountdownStatus()
      .then((s) => {
        if (cancelled) return
        setStatus(s)
        if (s.available) {
          setRemaining(formatRemaining(s.countdown.remainingMs))
          setProgressPct(s.countdown.progressPct)
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setStatus({ available: false, error: 'Failed to load countdown' })
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Tick every minute to update remaining time client-side
  useEffect(() => {
    if (!status?.available) return

    const { countdownStartedAt, targetAt } = status.countdown
    const startMs = new Date(countdownStartedAt).getTime()
    const targetMs = new Date(targetAt).getTime()
    const totalWindowMs = Math.max(1, targetMs - startMs)

    const interval = setInterval(() => {
      const now = Date.now()
      const newRemaining = Math.max(0, targetMs - now)
      const elapsed = Math.min(Math.max(0, now - startMs), totalWindowMs)
      setRemaining(formatRemaining(newRemaining))
      setProgressPct(Math.round((elapsed / totalWindowMs) * 100))
    }, 60000)

    return () => clearInterval(interval)
  }, [status])

  // Loading state
  if (loading) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 animate-pulse">
        <div className="h-4 w-48 bg-stone-800 rounded mb-3" />
        <div className="h-8 w-32 bg-stone-800 rounded mb-2" />
        <div className="h-3 w-full bg-stone-800 rounded" />
      </div>
    )
  }

  // Error / unavailable
  if (!status?.available) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
        <p className="text-sm text-stone-500">Countdown unavailable</p>
      </div>
    )
  }

  const { countdown } = status
  const windowReached = countdown.remainingMs <= 0

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
      {/* Eyebrow */}
      <p className="text-xs text-stone-500 mb-1 uppercase tracking-wider font-medium">
        Projected Mission Countdown
      </p>

      {/* Title */}
      <h3 className="text-sm font-semibold text-stone-200 mb-3">{countdown.title}</h3>

      {windowReached ? (
        <p className="text-lg font-bold text-green-400 mb-2">Projected window reached</p>
      ) : (
        <>
          {/* Large remaining number */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-stone-100 tabular-nums">
              {remaining?.days ?? 0}
            </span>
            <span className="text-sm text-stone-400">
              {remaining?.days === 1 ? 'day' : 'days'} left
            </span>
          </div>

          {/* Secondary remaining */}
          <p className="text-sm text-stone-500 mb-3 tabular-nums">
            {remaining?.hours ?? 0}h {remaining?.minutes ?? 0}m remaining
          </p>
        </>
      )}

      {/* Progress bar */}
      <div className="mb-2">
        <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
        <p className="text-xs text-stone-500 mt-1 tabular-nums">
          {progressPct}% of {countdown.progressLabel}
        </p>
      </div>

      {/* Footer chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 border border-amber-500/20">
          Projected
        </span>
        <span className="text-xs text-stone-500">{countdown.targetDisplay}</span>
        <span className="text-xs text-stone-600">{countdown.targetTimezone}</span>
      </div>
    </div>
  )
}
