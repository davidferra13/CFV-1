'use client'

import { useState, useTransition } from 'react'
import {
  updateBusinessHoursConfig,
  type BusinessHoursConfig,
  type WeekSchedule,
} from '@/lib/communication/business-hours'

type Props = {
  config: BusinessHoursConfig | null
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const

const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { enabled: true, start: '09:00', end: '17:00' },
  tuesday: { enabled: true, start: '09:00', end: '17:00' },
  wednesday: { enabled: true, start: '09:00', end: '17:00' },
  thursday: { enabled: true, start: '09:00', end: '17:00' },
  friday: { enabled: true, start: '09:00', end: '17:00' },
  saturday: { enabled: false, start: '10:00', end: '15:00' },
  sunday: { enabled: false, start: '10:00', end: '15:00' },
}

export function BusinessHoursEditor({ config }: Props) {
  const [timezone, setTimezone] = useState(
    config?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [schedule, setSchedule] = useState<WeekSchedule>(config?.schedule ?? DEFAULT_SCHEDULE)
  const [outsideMessage, setOutsideMessage] = useState(
    config?.outside_hours_message ??
      'Thanks for reaching out! I am currently outside business hours and will respond when I am back. If this is about an event happening today, I will get back to you right away.'
  )
  const [emergencyEnabled, setEmergencyEnabled] = useState(config?.emergency_enabled ?? true)
  const [emergencyHours, setEmergencyHours] = useState(config?.emergency_window_hours ?? 24)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateDay(day: string, field: string, value: any) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day as keyof WeekSchedule], [field]: value },
    }))
  }

  function handleSave() {
    setSaved(false)
    setError(null)
    startTransition(async () => {
      try {
        const result = await updateBusinessHoursConfig({
          timezone,
          schedule,
          outside_hours_message: outsideMessage,
          emergency_enabled: emergencyEnabled,
          emergency_window_hours: emergencyHours,
        })
        if (result.success) {
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
        } else {
          setError(result.error ?? 'Failed to save.')
        }
      } catch {
        setError('An unexpected error occurred.')
      }
    })
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-stone-100 mb-4">Business Hours</h2>
      <p className="text-stone-400 text-sm mb-4">
        Messages received outside your hours get an automatic reply. Day-of-event messages always go
        through.
      </p>

      <div className="mb-4">
        <label className="block text-sm text-stone-300 mb-1">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-stone-100 text-sm"
        >
          {[
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'America/Phoenix',
            'Pacific/Honolulu',
            'Europe/London',
            'Europe/Paris',
          ].map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 mb-4">
        {DAYS.map(({ key, label }) => {
          const day = schedule[key]
          return (
            <div key={key} className="flex items-center gap-3">
              <label className="flex items-center gap-2 w-28 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) => updateDay(key, 'enabled', e.target.checked)}
                  className="rounded bg-stone-800 border-stone-700 text-amber-600"
                />
                <span className={`text-sm ${day.enabled ? 'text-stone-200' : 'text-stone-500'}`}>
                  {label}
                </span>
              </label>
              {day.enabled && (
                <>
                  <input
                    type="time"
                    value={day.start}
                    onChange={(e) => updateDay(key, 'start', e.target.value)}
                    className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm"
                  />
                  <span className="text-stone-500 text-sm">to</span>
                  <input
                    type="time"
                    value={day.end}
                    onChange={(e) => updateDay(key, 'end', e.target.value)}
                    className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm"
                  />
                </>
              )}
              {!day.enabled && <span className="text-stone-500 text-sm">Closed</span>}
            </div>
          )
        })}
      </div>

      <div className="mb-4">
        <label className="block text-sm text-stone-300 mb-1">Outside Hours Auto-Reply</label>
        <textarea
          value={outsideMessage}
          onChange={(e) => setOutsideMessage(e.target.value)}
          rows={3}
          className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-stone-100 text-sm"
        />
      </div>

      <div className="mb-4 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={emergencyEnabled}
            onChange={(e) => setEmergencyEnabled(e.target.checked)}
            className="rounded bg-stone-800 border-stone-700 text-amber-600"
          />
          <span className="text-sm text-stone-300">
            Allow day-of-event messages to bypass business hours
          </span>
        </label>
        {emergencyEnabled && (
          <div className="ml-6">
            <label className="text-xs text-stone-400">
              Emergency window: messages within
              <input
                type="number"
                value={emergencyHours}
                onChange={(e) => setEmergencyHours(parseInt(e.target.value) || 24)}
                min={1}
                max={72}
                className="w-16 mx-1 bg-stone-800 border border-stone-700 rounded px-2 py-0.5 text-stone-100 text-sm text-center"
              />
              hours of an event always go through.
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {pending ? 'Saving...' : 'Save Business Hours'}
        </button>
        {saved && <span className="text-green-400 text-sm">Saved!</span>}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>
    </div>
  )
}
