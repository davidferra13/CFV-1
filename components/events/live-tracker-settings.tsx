'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  getLiveTrackerVisibility,
  updateLiveTrackerVisibility,
} from '@/lib/events/live-tracker-actions'
import {
  LIVE_TRACKER_STATUS_KEYS,
  LIVE_TRACKER_STATUS_LABELS,
  type LiveTrackerStatusKey,
} from '@/lib/events/live-tracker-constants'

type VisibilityState = Record<LiveTrackerStatusKey, boolean>

const BASIC_STATUS_KEYS: LiveTrackerStatusKey[] = ['en_route', 'arrived', 'complete']

export function LiveTrackerSettings() {
  const [visibility, setVisibility] = useState<VisibilityState | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const next = await getLiveTrackerVisibility()
        setVisibility(next)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load live tracker settings')
      }
    })
  }, [])

  function applyPreset(mode: 'all' | 'basic' | 'none') {
    const next = LIVE_TRACKER_STATUS_KEYS.reduce(
      (acc, key) => {
        acc[key] = mode === 'all' ? true : mode === 'basic' ? BASIC_STATUS_KEYS.includes(key) : false
        return acc
      },
      {} as VisibilityState
    )
    setVisibility(next)
  }

  function handleSave() {
    if (!visibility) return
    startTransition(async () => {
      try {
        await updateLiveTrackerVisibility(visibility)
        toast.success('Live tracker visibility updated')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to save live tracker settings')
      }
    })
  }

  if (!visibility) {
    return <p className="text-sm text-stone-400">Loading live tracker settings...</p>
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-stone-100">Live Tracker Visibility</h4>
        <p className="mt-1 text-sm text-stone-400">
          Choose which real-time event updates your clients receive. Basic updates keep them
          informed without overexposing your kitchen flow.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset('all')}>
          Show All
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyPreset('basic')}>
          Basic Only
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyPreset('none')}>
          Hide All
        </Button>
      </div>

      <div className="space-y-3">
        {LIVE_TRACKER_STATUS_KEYS.map((statusKey) => (
          <label key={statusKey} className="flex items-center justify-between gap-4">
            <span className="text-sm text-stone-300">{LIVE_TRACKER_STATUS_LABELS[statusKey]}</span>
            <Switch
              checked={visibility[statusKey]}
              onCheckedChange={(checked) =>
                setVisibility((current) =>
                  current ? { ...current, [statusKey]: checked } : current
                )
              }
            />
          </label>
        ))}
      </div>

      <Button type="button" onClick={handleSave} loading={isPending}>
        Save Visibility
      </Button>
    </div>
  )
}
