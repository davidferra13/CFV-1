'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PrepVisibilitySettings } from '@/components/events/prep-visibility-settings'
import {
  getChefPrepTimeline,
  initPrepTimeline,
  updatePrepStep,
} from '@/lib/events/prep-timeline-actions'
import {
  PREP_TIMELINE_LABELS,
  PREP_TIMELINE_STEP_KEYS,
  type PrepTimelineStatus,
  type PrepTimelineStepKey,
} from '@/lib/events/prep-timeline-constants'

type PrepTimelineChefProps = {
  eventId: string
}

type TimelineState = Awaited<ReturnType<typeof getChefPrepTimeline>> | null

function getBadgeVariant(status: PrepTimelineStatus) {
  if (status === 'completed') return 'success' as const
  if (status === 'in_progress') return 'warning' as const
  if (status === 'skipped') return 'info' as const
  return 'default' as const
}

export function PrepTimelineChef({ eventId }: PrepTimelineChefProps) {
  const [timeline, setTimeline] = useState<TimelineState>(null)
  const [clientNotes, setClientNotes] = useState<Record<string, string>>({})
  const [chefNotes, setChefNotes] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getChefPrepTimeline(eventId)
        setTimeline(data)
        setClientNotes(
          Object.fromEntries(data.steps.map((step) => [step.step_key, step.client_visible_note ?? '']))
        )
        setChefNotes(Object.fromEntries(data.steps.map((step) => [step.step_key, step.chef_notes ?? ''])))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load prep timeline')
      }
    })
  }, [eventId])

  const stepMap = useMemo(() => {
    const map = new Map<PrepTimelineStepKey, any>()
    for (const step of timeline?.steps ?? []) {
      map.set(step.step_key, step)
    }
    return map
  }, [timeline])

  function handleInit() {
    startTransition(async () => {
      try {
        const data = await initPrepTimeline(eventId)
        setTimeline(data)
        toast.success('Prep timeline initialized')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to initialize prep timeline')
      }
    })
  }

  function handleStatusUpdate(stepKey: PrepTimelineStepKey, status: PrepTimelineStatus) {
    startTransition(async () => {
      try {
        const data = await updatePrepStep(
          eventId,
          stepKey,
          status,
          clientNotes[stepKey],
          chefNotes[stepKey]
        )
        setTimeline(data)
        toast.success(`${PREP_TIMELINE_LABELS[stepKey]} updated`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update prep step')
      }
    })
  }

  if (!timeline) {
    return <p className="text-sm text-stone-400">Loading prep timeline...</p>
  }

  if (!timeline.steps.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-stone-400">
          Track your preparation flow and optionally surface progress to the client.
        </p>
        <Button type="button" onClick={handleInit} loading={isPending}>
          Initialize Timeline
        </Button>
        <PrepVisibilitySettings />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {PREP_TIMELINE_STEP_KEYS.map((stepKey) => {
          const step = stepMap.get(stepKey)
          if (!step) return null

          return (
            <div key={stepKey} className="rounded-xl border border-stone-700 bg-stone-900/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-stone-100">{PREP_TIMELINE_LABELS[stepKey]}</h4>
                  <Badge variant={getBadgeVariant(step.status)}>{step.status.replace('_', ' ')}</Badge>
                </div>
                <div className="text-xs text-stone-500">
                  {timeline.visibility[stepKey] ? 'Visible to client' : 'Hidden from client'}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => handleStatusUpdate(stepKey, 'pending')}>
                  Pending
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => handleStatusUpdate(stepKey, 'in_progress')}>
                  In Progress
                </Button>
                <Button type="button" size="sm" onClick={() => handleStatusUpdate(stepKey, 'completed')}>
                  Complete
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => handleStatusUpdate(stepKey, 'skipped')}>
                  Skip
                </Button>
              </div>

              <Textarea
                value={clientNotes[stepKey] ?? ''}
                onChange={(event) =>
                  setClientNotes((current) => ({ ...current, [stepKey]: event.target.value }))
                }
                rows={2}
                placeholder="Optional client-facing note. Great for sourcing updates or what you want the client to know."
              />
              <Textarea
                value={chefNotes[stepKey] ?? ''}
                onChange={(event) =>
                  setChefNotes((current) => ({ ...current, [stepKey]: event.target.value }))
                }
                rows={2}
                placeholder="Internal note. Only you can see this."
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => handleStatusUpdate(stepKey, step.status)} loading={isPending}>
                Save Notes
              </Button>
            </div>
          )
        })}
      </div>

      <PrepVisibilitySettings />
    </div>
  )
}
