'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LiveTrackerSettings } from '@/components/events/live-tracker-settings'
import {
  clearLiveStatuses,
  getChefLiveStatuses,
  setEventLiveStatus,
} from '@/lib/events/live-tracker-actions'
import {
  LIVE_TRACKER_STATUS_KEYS,
  LIVE_TRACKER_STATUS_LABELS,
  type LiveTrackerStatusKey,
} from '@/lib/events/live-tracker-constants'

type LiveTrackerChefProps = {
  eventId: string
}

type TrackerState = Awaited<ReturnType<typeof getChefLiveStatuses>> | null

export function LiveTrackerChef({ eventId }: LiveTrackerChefProps) {
  const [state, setState] = useState<TrackerState>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getChefLiveStatuses(eventId)
        setState(data)
        setNotes(Object.fromEntries(data.statuses.map((status) => [status.status_key, status.chef_note ?? ''])))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load live tracker')
      }
    })
  }, [eventId])

  function handleStatus(statusKey: LiveTrackerStatusKey) {
    startTransition(async () => {
      try {
        const data = await setEventLiveStatus(eventId, statusKey, notes[statusKey] ?? '')
        setState(data)
        toast.success(LIVE_TRACKER_STATUS_LABELS[statusKey])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update live tracker')
      }
    })
  }

  function handleReset() {
    startTransition(async () => {
      try {
        await clearLiveStatuses(eventId)
        const data = await getChefLiveStatuses(eventId)
        setState(data)
        toast.success('Live tracker reset')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to reset live tracker')
      }
    })
  }

  if (!state) {
    return <p className="text-sm text-stone-400">Loading live tracker...</p>
  }

  const completedKeys = new Set(state.statuses.map((status) => status.status_key))
  const currentKey = state.statuses.length ? state.statuses[state.statuses.length - 1].status_key : null

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        {LIVE_TRACKER_STATUS_KEYS.map((statusKey) => {
          const isCompleted = completedKeys.has(statusKey)
          const isCurrent = currentKey === statusKey

          return (
            <div key={statusKey} className="rounded-xl border border-stone-700 bg-stone-900/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-stone-100">{LIVE_TRACKER_STATUS_LABELS[statusKey]}</p>
                  {isCurrent && <Badge variant="warning">Current</Badge>}
                  {isCompleted && !isCurrent && <Badge variant="success">Sent</Badge>}
                </div>
                <div className="text-xs text-stone-500">
                  {state.visibility[statusKey] ? 'Visible to client' : 'Hidden from client'}
                </div>
              </div>

              <Input
                value={notes[statusKey] ?? ''}
                onChange={(event) => setNotes((current) => ({ ...current, [statusKey]: event.target.value }))}
                placeholder="Optional note for the client. Example: ETA 15 minutes or sourcing update."
              />

              <Button
                type="button"
                size="sm"
                variant={isCurrent ? 'secondary' : 'primary'}
                onClick={() => handleStatus(statusKey)}
                loading={isPending}
              >
                Mark as {LIVE_TRACKER_STATUS_LABELS[statusKey]}
              </Button>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={handleReset} loading={isPending}>
          Reset All
        </Button>
      </div>

      <LiveTrackerSettings />
    </div>
  )
}
