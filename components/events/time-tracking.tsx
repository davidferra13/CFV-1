'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import {
  EVENT_TIME_ACTIVITY_TYPES,
  EVENT_TIME_ACTIVITY_CONFIG,
  type EventTimeActivityType,
  formatMinutesAsDuration,
  safeDurationMinutes,
} from '@/lib/events/time-tracking'

type TimeData = {
  time_shopping_minutes: number | null
  time_prep_minutes: number | null
  time_travel_minutes: number | null
  time_service_minutes: number | null
  time_reset_minutes: number | null
  shopping_started_at: string | null
  shopping_completed_at: string | null
  prep_started_at: string | null
  prep_completed_at: string | null
  travel_started_at: string | null
  travel_completed_at: string | null
  service_started_at: string | null
  service_completed_at: string | null
  reset_started_at: string | null
  reset_completed_at: string | null
}

type TimeTotals = Pick<
  TimeData,
  | 'time_shopping_minutes'
  | 'time_prep_minutes'
  | 'time_travel_minutes'
  | 'time_service_minutes'
  | 'time_reset_minutes'
>

type ActivityRow = {
  id: EventTimeActivityType
  label: string
  minutes: number
  startedAt: string | null
  completedAt: string | null
  isActive: boolean
}

const ACTIVITY_MINUTE_FIELDS: Record<EventTimeActivityType, keyof TimeTotals> = {
  shopping: 'time_shopping_minutes',
  prep: 'time_prep_minutes',
  packing: 'time_reset_minutes',
  driving: 'time_travel_minutes',
  execution: 'time_service_minutes',
}

function toNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

export function TimeTracking({
  eventId,
  initialData,
  onSave,
  onStart,
  onStop,
}: {
  eventId: string
  initialData: TimeData
  onSave: (eventId: string, data: TimeTotals) => Promise<{ success: boolean }>
  onStart: (eventId: string, activity: EventTimeActivityType) => Promise<{ success: boolean }>
  onStop: (eventId: string, activity: EventTimeActivityType) => Promise<{ success: boolean }>
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyActivity, setBusyActivity] = useState<EventTimeActivityType | null>(null)
  const [busyAction, setBusyAction] = useState<'start' | 'stop' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [shopping, setShopping] = useState(initialData.time_shopping_minutes?.toString() ?? '')
  const [prep, setPrep] = useState(initialData.time_prep_minutes?.toString() ?? '')
  const [packing, setPacking] = useState(initialData.time_reset_minutes?.toString() ?? '')
  const [driving, setDriving] = useState(initialData.time_travel_minutes?.toString() ?? '')
  const [execution, setExecution] = useState(initialData.time_service_minutes?.toString() ?? '')

  // Live elapsed display — ticks every 30s while any timer is running.
  // Derived directly from initialData so the effect doesn't depend on activityRows.
  const [liveNow, setLiveNow] = useState(() => Date.now())
  const hasActiveTimer =
    (initialData.shopping_started_at !== null && initialData.shopping_completed_at === null) ||
    (initialData.prep_started_at !== null && initialData.prep_completed_at === null) ||
    (initialData.reset_started_at !== null && initialData.reset_completed_at === null) ||
    (initialData.travel_started_at !== null && initialData.travel_completed_at === null) ||
    (initialData.service_started_at !== null && initialData.service_completed_at === null)
  useEffect(() => {
    if (!hasActiveTimer) return
    const id = setInterval(() => setLiveNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [hasActiveTimer])

  useEffect(() => {
    setShopping(initialData.time_shopping_minutes?.toString() ?? '')
    setPrep(initialData.time_prep_minutes?.toString() ?? '')
    setPacking(initialData.time_reset_minutes?.toString() ?? '')
    setDriving(initialData.time_travel_minutes?.toString() ?? '')
    setExecution(initialData.time_service_minutes?.toString() ?? '')
  }, [
    initialData.time_shopping_minutes,
    initialData.time_prep_minutes,
    initialData.time_reset_minutes,
    initialData.time_travel_minutes,
    initialData.time_service_minutes,
  ])

  const activityRows = useMemo<ActivityRow[]>(() => {
    return EVENT_TIME_ACTIVITY_TYPES.map((activity) => {
      const config = EVENT_TIME_ACTIVITY_CONFIG[activity]
      const minutesField = ACTIVITY_MINUTE_FIELDS[activity]
      const startedAt = initialData[config.startedAtColumn]
      const completedAt = initialData[config.completedAtColumn]

      return {
        id: activity,
        label: config.label,
        minutes: initialData[minutesField] ?? 0,
        startedAt,
        completedAt,
        isActive: Boolean(startedAt && !completedAt),
      }
    })
  }, [initialData])

  const activeActivity = activityRows.find((row) => row.isActive)?.id ?? null
  const hasAnyData =
    activityRows.some((row) => row.minutes > 0) ||
    activityRows.some((row) => row.startedAt !== null)

  const editorTotalMinutes =
    (Number.parseInt(shopping, 10) || 0) +
    (Number.parseInt(prep, 10) || 0) +
    (Number.parseInt(packing, 10) || 0) +
    (Number.parseInt(driving, 10) || 0) +
    (Number.parseInt(execution, 10) || 0)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(eventId, {
        time_shopping_minutes: toNumber(shopping),
        time_prep_minutes: toNumber(prep),
        time_travel_minutes: toNumber(driving),
        time_service_minutes: toNumber(execution),
        time_reset_minutes: toNumber(packing),
      })
      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save time entries')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActivity(activity: EventTimeActivityType, mode: 'start' | 'stop') {
    setBusyActivity(activity)
    setBusyAction(mode)
    setError(null)

    try {
      if (mode === 'start') {
        await onStart(eventId, activity)
      } else {
        await onStop(eventId, activity)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} timer`)
    } finally {
      setBusyActivity(null)
      setBusyAction(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Chef Hours Tracking</CardTitle>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditing((prev) => !prev)}
            disabled={saving}
          >
            {editing ? 'Close Edit' : hasAnyData ? 'Adjust Totals' : 'Set Totals'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="error" title="Could not update tracking">
            {error}
          </Alert>
        )}

        <div className="rounded-lg border border-stone-700 divide-y">
          {activityRows.map((row) => {
            const isBusy = busyActivity === row.id
            const startDisabled =
              Boolean(activeActivity && activeActivity !== row.id) ||
              Boolean(busyActivity) ||
              saving
            const stopDisabled = Boolean(busyActivity) || saving

            return (
              <div key={row.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium text-stone-100">{row.label}</p>
                  <p className="text-xs text-stone-400">
                    Logged: {formatMinutesAsDuration(row.minutes)}
                    {row.isActive && row.startedAt
                      ? ` • Running: ${formatMinutesAsDuration(safeDurationMinutes(row.startedAt, new Date(liveNow).toISOString()))}`
                      : ''}
                  </p>
                </div>
                {row.isActive ? (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={stopDisabled}
                    onClick={() => handleToggleActivity(row.id, 'stop')}
                  >
                    {isBusy && busyAction === 'stop' ? 'Stopping...' : 'Stop'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={startDisabled}
                    onClick={() => handleToggleActivity(row.id, 'start')}
                  >
                    {isBusy && busyAction === 'start' ? 'Starting...' : 'Start'}
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {activeActivity && (
          <p className="text-xs text-stone-500">
            One active timer at a time to keep logging simple. Gentle reminders are capped to avoid
            spam.
          </p>
        )}

        <p className="text-sm font-medium text-stone-300">
          Total Logged:{' '}
          {formatMinutesAsDuration(activityRows.reduce((sum, row) => sum + row.minutes, 0))}
        </p>

        {editing && (
          <div className="space-y-3 rounded-lg border border-stone-700 p-3">
            <p className="text-sm font-medium text-stone-200">
              Manual correction (if you forgot to start/stop)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-400">Shopping (min)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={shopping}
                  onChange={(e) => setShopping(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400">Prep (min)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={prep}
                  onChange={(e) => setPrep(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400">Packing (min)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={packing}
                  onChange={(e) => setPacking(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400">Driving (min)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={driving}
                  onChange={(e) => setDriving(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400">Execution (min)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={execution}
                  onChange={(e) => setExecution(e.target.value)}
                />
              </div>
            </div>
            {editorTotalMinutes > 0 && (
              <p className="text-sm text-stone-400">
                Manual total: {formatMinutesAsDuration(editorTotalMinutes)}
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving || Boolean(busyActivity)}>
                {saving ? 'Saving...' : 'Save Totals'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
