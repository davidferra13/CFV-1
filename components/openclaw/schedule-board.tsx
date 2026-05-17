'use client'

import { useState, useEffect } from 'react'
import type {
  JobScheduleStatus,
  MissionScheduleRow,
  JobScheduleState,
} from '@/lib/openclaw/countdown-types'
import { getJobSchedule } from '@/lib/openclaw/countdown-actions'

const STATE_STYLES: Record<JobScheduleState, { bg: string; text: string; label: string }> = {
  running: { bg: 'bg-green-500/10 border-green-500/20', text: 'text-green-400', label: 'Running' },
  next: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'Next' },
  idle: { bg: 'bg-stone-700/30 border-stone-700/40', text: 'text-stone-400', label: 'Idle' },
  sleeping: {
    bg: 'bg-stone-800/30 border-stone-800/40',
    text: 'text-stone-600',
    label: 'Sleeping',
  },
  attention: {
    bg: 'bg-red-500/10 border-red-500/20',
    text: 'text-red-400',
    label: 'Needs Attention',
  },
}

function formatNextRun(row: MissionScheduleRow): string {
  if (!row.nextRun) return 'unknown'
  if (row.minutesUntil === null) return 'unknown'

  if (row.minutesUntil < 1) return 'now'
  if (row.minutesUntil < 60) return `${row.minutesUntil}m`
  if (row.minutesUntil < 1440) {
    const h = Math.floor(row.minutesUntil / 60)
    const m = row.minutesUntil % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.floor(row.minutesUntil / 1440)
  const h = Math.floor((row.minutesUntil % 1440) / 60)
  return h > 0 ? `${d}d ${h}h` : `${d}d`
}

export function ScheduleBoard() {
  const [schedule, setSchedule] = useState<JobScheduleStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getJobSchedule()
      .then((s) => {
        if (cancelled) return
        setSchedule(s)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setSchedule({ available: false, error: 'Failed to load schedule' })
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 animate-pulse">
        <div className="h-4 w-40 bg-stone-800 rounded mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-stone-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!schedule?.available) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
        <p className="text-sm text-stone-500">
          {schedule && !schedule.available ? schedule.error : 'Schedule unavailable'}
        </p>
      </div>
    )
  }

  const { rows } = schedule

  // Sort: attention first, then running, next, idle, sleeping
  const stateOrder: Record<JobScheduleState, number> = {
    attention: 0,
    running: 1,
    next: 2,
    idle: 3,
    sleeping: 4,
  }
  const sorted = [...rows].sort((a, b) => {
    const orderDiff = stateOrder[a.state] - stateOrder[b.state]
    if (orderDiff !== 0) return orderDiff
    return (a.minutesUntil ?? Infinity) - (b.minutesUntil ?? Infinity)
  })

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-stone-500 uppercase tracking-wider font-medium">
          Mission Schedule
        </h3>
        <span className="text-xs text-stone-600 tabular-nums">
          {rows.length} job{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {sorted.map((row) => {
          const style = STATE_STYLES[row.state]
          return (
            <div
              key={row.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${style.bg}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${style.text} ${style.bg}`}
                >
                  {style.label}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-stone-200 truncate">{row.name}</p>
                  <p className="text-xs text-stone-600">{row.cadenceLabel}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-sm text-stone-400 tabular-nums">{formatNextRun(row)}</p>
              </div>
            </div>
          )
        })}

        {rows.length === 0 && (
          <p className="text-sm text-stone-500 py-4 text-center">No scheduled jobs</p>
        )}
      </div>
    </div>
  )
}
