'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  getPrepTimelineVisibility,
  updatePrepTimelineVisibility,
} from '@/lib/events/prep-timeline-actions'
import {
  PREP_TIMELINE_LABELS,
  PREP_TIMELINE_STEP_KEYS,
  type PrepTimelineStepKey,
} from '@/lib/events/prep-timeline-constants'

type VisibilityState = Record<PrepTimelineStepKey, boolean>

export function PrepVisibilitySettings() {
  const [visibility, setVisibility] = useState<VisibilityState | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const next = await getPrepTimelineVisibility()
        setVisibility(next)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load prep visibility')
      }
    })
  }, [])

  function setAll(value: boolean) {
    if (!visibility) return
    const next = PREP_TIMELINE_STEP_KEYS.reduce(
      (acc, key) => {
        acc[key] = value
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
        await updatePrepTimelineVisibility(visibility)
        toast.success('Prep visibility updated')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to save prep visibility')
      }
    })
  }

  if (!visibility) {
    return <p className="text-sm text-stone-400">Loading visibility controls...</p>
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-stone-100">Client Visibility</h4>
        <p className="mt-1 text-sm text-stone-400">
          Control which preparation steps your clients can see. This keeps clients informed without
          forcing you to expose every part of your workflow.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setAll(true)}>
          Show All
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAll(false)}>
          Hide All
        </Button>
      </div>

      <div className="space-y-3">
        {PREP_TIMELINE_STEP_KEYS.map((stepKey) => (
          <label key={stepKey} className="flex items-center justify-between gap-4">
            <span className="text-sm text-stone-300">{PREP_TIMELINE_LABELS[stepKey]}</span>
            <Switch
              checked={visibility[stepKey]}
              onCheckedChange={(checked) =>
                setVisibility((current) => (current ? { ...current, [stepKey]: checked } : current))
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
