'use client'

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  LIVE_TRACKER_STATUS_KEYS,
  LIVE_TRACKER_STATUS_LABELS,
  type LiveTrackerStatusKey,
} from '@/lib/events/live-tracker-constants'
import {
  getClientLiveStatuses,
} from '@/lib/events/live-tracker-actions'

type LiveTrackerClientProps = {
  eventId: string
  initialState?: TrackerState
}

type TrackerState = Awaited<ReturnType<typeof getClientLiveStatuses>> | null

function formatTimestamp(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function LiveTrackerClient({ eventId, initialState = null }: LiveTrackerClientProps) {
  const [state, setState] = useState<TrackerState>(initialState)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await getClientLiveStatuses(eventId)
        if (!cancelled) {
          setState(data)
        }
      } catch {
        if (!cancelled) {
          setState(null)
        }
      }
    }

    startTransition(() => {
      void load()
    })

    const interval = window.setInterval(load, 30000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [eventId])

  if (!state) {
    return null
  }

  const visibleKeys = LIVE_TRACKER_STATUS_KEYS.filter((key) => state.visibility[key])
  if (!visibleKeys.length) {
    return null
  }

  const statusMap = new Map(state.statuses.map((status) => [status.status_key, status]))
  const currentKey = state.statuses.length ? state.statuses[state.statuses.length - 1].status_key : null
  const currentIndex = currentKey ? visibleKeys.indexOf(currentKey) : -1

  if (!state.statuses.length) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-4">
        <p className="text-sm text-stone-300">Your chef will update you when they&apos;re on the way.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {visibleKeys.map((statusKey, index) => {
        const row = statusMap.get(statusKey)
        const isCurrent = currentKey === statusKey
        const isPast = !!row && index < currentIndex
        const isFuture = !row && (currentIndex === -1 || index > currentIndex)

        return (
          <div key={statusKey} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full border',
                  isCurrent
                    ? 'border-amber-700 bg-amber-950'
                    : isPast || row
                      ? 'border-emerald-700 bg-emerald-950'
                      : 'border-stone-700 bg-stone-900',
                ].join(' ')}
              >
                <span
                  className={[
                    'h-3 w-3 rounded-full',
                    isCurrent
                      ? 'animate-pulse bg-amber-400'
                      : isPast || row
                        ? 'bg-emerald-400'
                        : 'bg-stone-500',
                  ].join(' ')}
                />
              </div>
              {index < visibleKeys.length - 1 && <div className="mt-2 h-full min-h-8 w-px bg-stone-800" />}
            </div>

            <div className="flex-1 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-medium text-stone-100">{LIVE_TRACKER_STATUS_LABELS[statusKey]}</h4>
                {isCurrent && <Badge variant="warning">Current</Badge>}
                {row && !isCurrent && <Badge variant="success">Done</Badge>}
                {isFuture && <Badge variant="default">Next</Badge>}
              </div>
              {row && <p className="mt-1 text-xs text-stone-400">{formatTimestamp(row.timestamp)}</p>}
              {row?.chef_note && <p className="mt-2 text-sm text-stone-300">{row.chef_note}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
