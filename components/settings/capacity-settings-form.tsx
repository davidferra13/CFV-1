'use client'

// CapacitySettingsForm - Workload Limits & Off-Hours Protection
// Lets the chef set hard caps on weekly/monthly event volume and
// configure which hours/days they don't want to receive booking inquiries.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateCapacitySettings, updateOffHoursSettings } from '@/lib/scheduling/capacity-actions'

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
]

interface Props {
  settings: {
    max_events_per_week: number | null
    max_events_per_month: number | null
    max_consecutive_working_days: number | null
    min_rest_days_per_week: number | null
    max_hours_per_week: number | null
    off_hours_start: string | null
    off_hours_end: string | null
    off_days: string[] | null
  }
}

export function CapacitySettingsForm({ settings }: Props) {
  // ── Workload limit state ──────────────────────────────────────────────────
  const [maxWeek, setMaxWeek] = useState(
    settings.max_events_per_week != null ? String(settings.max_events_per_week) : ''
  )
  const [maxMonth, setMaxMonth] = useState(
    settings.max_events_per_month != null ? String(settings.max_events_per_month) : ''
  )
  const [maxConsecutive, setMaxConsecutive] = useState(
    settings.max_consecutive_working_days != null
      ? String(settings.max_consecutive_working_days)
      : ''
  )
  const [minRest, setMinRest] = useState(
    settings.min_rest_days_per_week != null ? String(settings.min_rest_days_per_week) : ''
  )
  const [maxHours, setMaxHours] = useState(
    settings.max_hours_per_week != null ? String(settings.max_hours_per_week) : ''
  )
  const [limitsSaved, setLimitsSaved] = useState(false)

  // ── Off-hours state ───────────────────────────────────────────────────────
  const [offStart, setOffStart] = useState(settings.off_hours_start ?? '')
  const [offEnd, setOffEnd] = useState(settings.off_hours_end ?? '')
  const [offDays, setOffDays] = useState<string[]>(settings.off_days ?? [])
  const [offHoursSaved, setOffHoursSaved] = useState(false)

  const [isPendingLimits, startLimitsTransition] = useTransition()
  const [isPendingOffHours, startOffHoursTransition] = useTransition()

  function parseNullableInt(val: string): number | null {
    const n = parseInt(val, 10)
    return isNaN(n) || val.trim() === '' ? null : n
  }

  function handleSaveLimits() {
    startLimitsTransition(async () => {
      try {
        await updateCapacitySettings({
          max_events_per_week: parseNullableInt(maxWeek),
          max_events_per_month: parseNullableInt(maxMonth),
          max_consecutive_working_days: parseNullableInt(maxConsecutive),
          min_rest_days_per_week: parseNullableInt(minRest),
          max_hours_per_week: parseNullableInt(maxHours),
        })
        setLimitsSaved(true)
        setTimeout(() => setLimitsSaved(false), 2500)
      } catch {
        // keep form open
      }
    })
  }

  function handleSaveOffHours() {
    startOffHoursTransition(async () => {
      try {
        await updateOffHoursSettings({
          off_hours_start: offStart.trim() || null,
          off_hours_end: offEnd.trim() || null,
          off_days: offDays.length > 0 ? offDays : null,
        })
        setOffHoursSaved(true)
        setTimeout(() => setOffHoursSaved(false), 2500)
      } catch {
        // keep form open
      }
    })
  }

  function toggleDay(day: string) {
    setOffDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  return (
    <div className="space-y-6">
      {/* ── Workload Limits ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workload Limits</CardTitle>
          <p className="text-sm text-stone-500">
            Set caps on how many events you take on. Leave blank for no limit.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Max events per week
              </label>
              <input
                type="number"
                value={maxWeek}
                onChange={(e) => setMaxWeek(e.target.value)}
                placeholder="No limit"
                min="1"
                max="30"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Max events per month
              </label>
              <input
                type="number"
                value={maxMonth}
                onChange={(e) => setMaxMonth(e.target.value)}
                placeholder="No limit"
                min="1"
                max="60"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Max consecutive working days
              </label>
              <input
                type="number"
                value={maxConsecutive}
                onChange={(e) => setMaxConsecutive(e.target.value)}
                placeholder="No limit"
                min="1"
                max="14"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Min rest days per week
              </label>
              <input
                type="number"
                value={minRest}
                onChange={(e) => setMinRest(e.target.value)}
                placeholder="No minimum"
                min="0"
                max="7"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Max hours per week (total working time)
              </label>
              <input
                type="number"
                value={maxHours}
                onChange={(e) => setMaxHours(e.target.value)}
                placeholder="No limit"
                min="1"
                max="80"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={handleSaveLimits} disabled={isPendingLimits}>
            {limitsSaved ? 'Saved' : isPendingLimits ? 'Saving...' : 'Save Workload Limits'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Off-Hours Protection ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Off-Hours Protection</CardTitle>
          <p className="text-sm text-stone-500">
            Notification suppression window. Emergency alerts always get through.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Quiet start (e.g. 22:00)
              </label>
              <input
                type="time"
                value={offStart}
                onChange={(e) => setOffStart(e.target.value)}
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Quiet end (e.g. 08:00)
              </label>
              <input
                type="time"
                value={offEnd}
                onChange={(e) => setOffEnd(e.target.value)}
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-2">
              Off days (no notifications)
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    offDays.includes(day.value)
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-stone-900 border-stone-600 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-stone-400">
            Emergency notifications (payment overdue, event tomorrow) always bypass these settings.
          </p>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveOffHours}
            disabled={isPendingOffHours}
          >
            {offHoursSaved ? 'Saved' : isPendingOffHours ? 'Saving...' : 'Save Off-Hours Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
