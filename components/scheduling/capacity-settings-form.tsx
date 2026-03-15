'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  getCapacityPlanningSettings,
  updateCapacityPlanningSettings,
  type CapacityPlanningSettings,
} from '@/lib/scheduling/capacity-planning-actions'
import { toast } from 'sonner'

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function CapacitySettingsForm() {
  const [settings, setSettings] = useState<CapacityPlanningSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [maxPerDay, setMaxPerDay] = useState(2)
  const [maxPerWeek, setMaxPerWeek] = useState(8)
  const [prepHours, setPrepHours] = useState(4)
  const [travelMinutes, setTravelMinutes] = useState(60)
  const [shoppingHours, setShoppingHours] = useState(2)
  const [cleanupHours, setCleanupHours] = useState(1.5)
  const [bufferMinutes, setBufferMinutes] = useState(120)
  const [blockedDays, setBlockedDays] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getCapacityPlanningSettings()
        if (cancelled) return
        setSettings(data)
        setMaxPerDay(data.max_events_per_day)
        setMaxPerWeek(data.max_events_per_week)
        setPrepHours(data.default_prep_hours)
        setTravelMinutes(data.default_travel_minutes)
        setShoppingHours(data.default_shopping_hours)
        setCleanupHours(data.default_cleanup_hours)
        setBufferMinutes(data.buffer_between_events_minutes)
        setBlockedDays(data.blocked_days)
      } catch (err) {
        if (!cancelled) setError('Failed to load capacity settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  function toggleDay(day: string) {
    setBlockedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  function handleSave() {
    const previous = settings
    startTransition(async () => {
      try {
        await updateCapacityPlanningSettings({
          max_events_per_day: maxPerDay,
          max_events_per_week: maxPerWeek,
          default_prep_hours: prepHours,
          default_travel_minutes: travelMinutes,
          default_shopping_hours: shoppingHours,
          default_cleanup_hours: cleanupHours,
          buffer_between_events_minutes: bufferMinutes,
          blocked_days: blockedDays,
        })
        toast.success('Capacity settings saved')
      } catch (err) {
        // Rollback
        if (previous) {
          setMaxPerDay(previous.max_events_per_day)
          setMaxPerWeek(previous.max_events_per_week)
          setPrepHours(previous.default_prep_hours)
          setTravelMinutes(previous.default_travel_minutes)
          setShoppingHours(previous.default_shopping_hours)
          setCleanupHours(previous.default_cleanup_hours)
          setBufferMinutes(previous.buffer_between_events_minutes)
          setBlockedDays(previous.blocked_days)
        }
        toast.error('Failed to save capacity settings')
      }
    })
  }

  // Compute total time per event for the summary
  const totalPerEvent =
    shoppingHours + prepHours + travelMinutes / 60 + 1.5 + cleanupHours + bufferMinutes / 60

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-stone-200" />
        <div className="h-32 rounded bg-stone-200" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-900">Capacity Planning</h3>
        <p className="text-sm text-stone-500">
          Set your limits and default time blocks. These help prevent overbooking by accounting for
          prep, travel, shopping, and cleanup.
        </p>
      </div>

      {/* Event Limits */}
      <div className="rounded-lg border border-stone-200 p-4 space-y-4">
        <h4 className="font-medium text-stone-800">Event Limits</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Max events per day
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxPerDay}
              onChange={(e) => setMaxPerDay(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Max events per week
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxPerWeek}
              onChange={(e) => setMaxPerWeek(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Time Blocks */}
      <div className="rounded-lg border border-stone-200 p-4 space-y-4">
        <h4 className="font-medium text-stone-800">Default Time Blocks</h4>
        <p className="text-xs text-stone-500">
          How much time each activity typically takes. Used to calculate whether events overlap.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Prep time (hours)
            </label>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={prepHours}
              onChange={(e) => setPrepHours(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Travel time (minutes)
            </label>
            <input
              type="number"
              min={0}
              max={480}
              step={15}
              value={travelMinutes}
              onChange={(e) => setTravelMinutes(parseInt(e.target.value) || 0)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Shopping time (hours)
            </label>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={shoppingHours}
              onChange={(e) => setShoppingHours(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Cleanup time (hours)
            </label>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={cleanupHours}
              onChange={(e) => setCleanupHours(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Buffer between events (minutes)
          </label>
          <input
            type="number"
            min={0}
            max={480}
            step={15}
            value={bufferMinutes}
            onChange={(e) => setBufferMinutes(parseInt(e.target.value) || 0)}
            className="w-full max-w-xs rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <p className="mt-1 text-xs text-stone-400">
            Rest time after cleanup before your next event can start.
          </p>
        </div>

        {/* Summary */}
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Total time per event:</span> {totalPerEvent.toFixed(1)}{' '}
            hours (shopping + prep + travel + ~1.5h service + cleanup + buffer)
          </p>
        </div>
      </div>

      {/* Blocked Days */}
      <div className="rounded-lg border border-stone-200 p-4 space-y-3">
        <h4 className="font-medium text-stone-800">Blocked Days</h4>
        <p className="text-xs text-stone-500">
          Days you don't take events. These show as blocked on your capacity calendar.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map((day) => {
            const isBlocked = blockedDays.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isBlocked
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200'
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Capacity Settings'}
        </Button>
      </div>
    </div>
  )
}
