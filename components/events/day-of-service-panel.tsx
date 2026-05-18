'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Clock, Flame, Play, Users, AlertTriangle, Timer } from '@/components/ui/icons'
import {
  SERVICE_STAGES,
  type ServiceStage,
  type ServiceTrackerState,
} from '@/lib/lifecycle/service-tracker-actions'
import type { ServiceTimeline, TimelineEntry } from '@/lib/lifecycle/timeline-generator-actions'

type Props = {
  trackerState: ServiceTrackerState | null
  timeline: ServiceTimeline | null
  eventId: string
}

const STAGE_VISUALS: Record<ServiceStage, { color: string; bgColor: string; borderColor: string }> =
  {
    prep: { color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/40' },
    cooking: {
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/40',
    },
    plating: {
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/40',
    },
    serving: {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/40',
    },
    cleanup: {
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/40',
    },
  }

function formatElapsed(minutes: number | null): string {
  if (minutes === null) return 'Not started'
  if (minutes < 1) return 'Just started'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function StageIndicator({ currentStage }: { currentStage: ServiceStage }) {
  const currentIdx = SERVICE_STAGES.findIndex((s) => s.key === currentStage)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-stone-200">Current Stage</h3>
      </div>
      <div className="flex items-center gap-1.5">
        {SERVICE_STAGES.map((stage, idx) => {
          const isPast = idx < currentIdx
          const isCurrent = idx === currentIdx
          const sv = STAGE_VISUALS[stage.key]

          return (
            <div key={stage.key} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full h-2 rounded-full transition-colors ${
                  isCurrent
                    ? `${sv.bgColor} ring-1 ${sv.borderColor}`
                    : isPast
                      ? 'bg-stone-600'
                      : 'bg-stone-800'
                }`}
              >
                {isCurrent && <div className={`h-full rounded-full ${sv.bgColor} animate-pulse`} />}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isCurrent ? sv.color : isPast ? 'text-stone-400' : 'text-stone-600'
                }`}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TimelineProgress({ timeline }: { timeline: ServiceTimeline }) {
  const { entries, progressPercent, elapsedMinutes, estimatedTotalMinutes } = timeline

  const activeEntry = entries.find((e) => e.active)
  const lastCompleted = [...entries].reverse().find((e) => e.completed)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-stone-400" />
          <h3 className="text-sm font-semibold text-stone-200">Timeline</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span>{progressPercent}% complete</span>
          {elapsedMinutes !== null && (
            <span className="tabular-nums font-medium text-stone-300">
              {formatElapsed(elapsedMinutes)}
              {estimatedTotalMinutes ? ` / ~${formatElapsed(estimatedTotalMinutes)}` : ''}
            </span>
          )}
        </div>
      </div>

      <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500/70 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {activeEntry ? (
        <p className="text-xs text-amber-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse mr-1.5 align-middle" />
          In progress: {activeEntry.label}
        </p>
      ) : lastCompleted ? (
        <p className="text-xs text-stone-400">
          Last completed: {lastCompleted.label}
          {lastCompleted.time ? ` at ${formatTime(lastCompleted.time)}` : ''}
        </p>
      ) : (
        <p className="text-xs text-stone-500">No milestones completed yet</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {entries.map((entry, idx) => (
          <TimelineDot key={idx} entry={entry} />
        ))}
      </div>
    </div>
  )
}

function TimelineDot({ entry }: { entry: TimelineEntry }) {
  if (entry.active) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30"
        title={entry.label}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        {entry.label}
      </span>
    )
  }
  if (entry.completed) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-700/60 text-stone-400"
        title={`${entry.label}${entry.time ? ` at ${formatTime(entry.time)}` : ''}`}
      >
        <Check className="h-2.5 w-2.5 text-emerald-500" />
        {entry.label}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-800/60 text-stone-600"
      title={entry.label}
    >
      {entry.label}
    </span>
  )
}

function GuestTracker({ state }: { state: ServiceTrackerState }) {
  const {
    guestCount,
    guestsAttending,
    guestsDeclined,
    guests,
    activeDietaryRestrictions,
    activeAllergies,
  } = state

  const displayCount = guestCount || guestsAttending || 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-stone-400" />
          <h3 className="text-sm font-semibold text-stone-200">Guests</h3>
        </div>
        <span className="text-sm tabular-nums text-stone-300">{displayCount} expected</span>
      </div>

      {guests.length > 0 && (
        <div className="flex gap-3 text-xs">
          <span className="text-emerald-400">{guestsAttending} attending</span>
          {guestsDeclined > 0 && <span className="text-stone-500">{guestsDeclined} declined</span>}
        </div>
      )}

      {guests.length === 0 && guestCount > 0 && (
        <p className="text-xs text-stone-500">
          {guestCount} guests expected (no individual guest records)
        </p>
      )}

      {guests.length === 0 && guestCount === 0 && (
        <p className="text-xs text-stone-500">No guest information available</p>
      )}

      {(activeDietaryRestrictions.length > 0 || activeAllergies.length > 0) && (
        <div className="space-y-2 pt-2 border-t border-stone-800">
          {activeAllergies.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {activeAllergies.map((allergy) => (
                  <Badge key={allergy} variant="error" className="text-[10px] px-1.5 py-0">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {activeDietaryRestrictions.length > 0 && (
            <div className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {activeDietaryRestrictions.map((restriction) => (
                  <Badge key={restriction} variant="default" className="text-[10px] px-1.5 py-0">
                    {restriction}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KitchenStatus({ state }: { state: ServiceTrackerState }) {
  const readinessItems = [
    { label: 'Grocery list', ready: state.groceryListReady },
    { label: 'Prep list', ready: state.prepListReady },
    { label: 'Execution sheet', ready: state.executionSheetReady },
    { label: 'Car packed', ready: state.carPacked },
  ]

  const allReady = readinessItems.every((item) => item.ready)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-stone-400" />
          <h3 className="text-sm font-semibold text-stone-200">Kitchen Status</h3>
        </div>
        {allReady ? (
          <Badge variant="success" className="text-[10px]">
            All ready
          </Badge>
        ) : (
          <Badge variant="warning" className="text-[10px]">
            In progress
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {readinessItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                item.ready ? 'bg-emerald-900/60 text-emerald-400' : 'bg-stone-800 text-stone-500'
              }`}
            >
              {item.ready ? '✓' : '•'}
            </span>
            <span className={`text-xs ${item.ready ? 'text-stone-300' : 'text-stone-500'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {state.serviceCompletedAt && (
        <div className="pt-2 border-t border-stone-800">
          <div className="flex items-center gap-2">
            <span
              className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                state.resetComplete
                  ? 'bg-emerald-900/60 text-emerald-400'
                  : 'bg-amber-900/60 text-amber-400'
              }`}
            >
              {state.resetComplete ? '✓' : '•'}
            </span>
            <span className="text-xs text-stone-300">
              {state.resetComplete
                ? `Reset complete${state.resetCompletedAt ? ` at ${formatTime(state.resetCompletedAt)}` : ''}`
                : 'Reset pending'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function ServiceElapsed({
  state,
  elapsedMinutes,
}: {
  state: ServiceTrackerState
  elapsedMinutes: number | null
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!state.serviceStartedAt || state.serviceCompletedAt) return
    const interval = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [state.serviceStartedAt, state.serviceCompletedAt])

  const liveElapsed = useMemo(() => {
    if (!state.serviceStartedAt) return null
    const startMs = new Date(state.serviceStartedAt).getTime()
    if (!Number.isFinite(startMs)) return null
    const endMs = state.serviceCompletedAt ? new Date(state.serviceCompletedAt).getTime() : now
    return Math.round((endMs - startMs) / 60000)
  }, [state.serviceStartedAt, state.serviceCompletedAt, now])

  const displayElapsed = liveElapsed ?? elapsedMinutes

  return (
    <div className="flex items-center gap-2">
      {state.serviceStartedAt && !state.serviceCompletedAt && (
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      )}
      <span className="text-xs text-stone-500">
        {state.serviceCompletedAt
          ? 'Service completed'
          : state.serviceStartedAt
            ? 'Service active'
            : 'Pre-service'}
      </span>
      {displayElapsed !== null && (
        <span className="text-xs tabular-nums font-medium text-stone-300 ml-auto">
          {formatElapsed(displayElapsed)}
        </span>
      )}
      {state.serviceStartedAt && (
        <span className="text-xs text-stone-500 ml-1">
          (started {formatTime(state.serviceStartedAt)})
        </span>
      )}
    </div>
  )
}

/**
 * Day-Of Service Panel: the primary view for the "active" lifecycle stage.
 * Shows current execution stage, timeline progress, kitchen readiness, and guest tracking.
 * Renders only meaningful data; empty sections show appropriate pending states.
 */
export function DayOfServicePanel({ trackerState, timeline, eventId }: Props) {
  if (!trackerState && !timeline) {
    return (
      <Card className="p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-stone-100">Service Day</h2>
        <p className="mt-2 text-sm text-stone-400">
          Service data will appear here when the event is in progress.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-4 sm:p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <h2 className="text-lg font-semibold text-stone-100">Service Day</h2>
        {trackerState && (
          <ServiceElapsed state={trackerState} elapsedMinutes={timeline?.elapsedMinutes ?? null} />
        )}
      </div>

      {trackerState && <StageIndicator currentStage={trackerState.currentStage} />}

      {timeline && timeline.entries.length > 0 && (
        <div className="pt-3 border-t border-stone-800">
          <TimelineProgress timeline={timeline} />
        </div>
      )}

      {trackerState && (
        <div className="pt-3 border-t border-stone-800">
          <KitchenStatus state={trackerState} />
        </div>
      )}

      {trackerState && (
        <div className="pt-3 border-t border-stone-800">
          <GuestTracker state={trackerState} />
        </div>
      )}
    </Card>
  )
}
