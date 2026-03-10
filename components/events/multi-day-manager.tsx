// Multi-Day Event Manager
// Toggle and manage multi-day events (festivals, wedding weekends)

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  enableMultiDay,
  disableMultiDay,
  updateDaySchedule,
  removeDaySchedule,
  type DaySchedule,
} from '@/lib/events/multi-day-actions'

const SERVICE_STYLE_OPTIONS = [
  { value: '', label: 'Select style...' },
  { value: 'plated', label: 'Plated' },
  { value: 'family_style', label: 'Family Style' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'tasting_menu', label: 'Tasting Menu' },
  { value: 'other', label: 'Other' },
]

export function MultiDayManager({
  eventId,
  eventDate,
  isMultiDay,
  endDate,
  daySchedules,
}: {
  eventId: string
  eventDate: string // ISO date string
  isMultiDay: boolean
  endDate: string | null
  daySchedules: DaySchedule[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [enabled, setEnabled] = useState(isMultiDay)
  const [selectedEndDate, setSelectedEndDate] = useState(endDate ?? '')
  const [schedules, setSchedules] = useState<DaySchedule[]>(daySchedules)
  const [error, setError] = useState<string | null>(null)
  const [editingDay, setEditingDay] = useState<string | null>(null)

  // Start date is the event date (just the date portion)
  const startDateStr = eventDate.substring(0, 10)

  const handleToggle = () => {
    if (enabled) {
      // Disable multi-day
      startTransition(async () => {
        try {
          await disableMultiDay(eventId)
          setEnabled(false)
          setSchedules([])
          setSelectedEndDate('')
          setError(null)
          router.refresh()
        } catch (err) {
          setEnabled(true)
          setError('Failed to disable multi-day mode')
        }
      })
    } else {
      // Just toggle the UI, don't save until end date is set
      setEnabled(true)
    }
  }

  const handleSetEndDate = () => {
    if (!selectedEndDate) {
      setError('Please select an end date')
      return
    }

    if (selectedEndDate <= startDateStr) {
      setError('End date must be after the start date')
      return
    }

    startTransition(async () => {
      try {
        await enableMultiDay(eventId, selectedEndDate)
        setError(null)
        router.refresh()

        // Generate schedules locally for immediate UI
        const start = new Date(startDateStr + 'T00:00:00')
        const end = new Date(selectedEndDate + 'T00:00:00')
        const newSchedules: DaySchedule[] = []
        let dayNum = 1
        const current = new Date(start)
        while (current <= end) {
          newSchedules.push({
            date: current.toISOString().split('T')[0],
            label: `Day ${dayNum}`,
            serve_time: null,
            guest_count: null,
            menu_id: null,
            notes: null,
            service_style: null,
          })
          current.setDate(current.getDate() + 1)
          dayNum++
        }
        setSchedules(newSchedules)
      } catch (err: any) {
        setError(err.message || 'Failed to enable multi-day')
      }
    })
  }

  const handleUpdateDay = (date: string, updates: Partial<Omit<DaySchedule, 'date'>>) => {
    // Optimistic local update
    const previous = [...schedules]
    setSchedules((prev) => prev.map((s) => (s.date === date ? { ...s, ...updates } : s)))

    startTransition(async () => {
      try {
        await updateDaySchedule(eventId, date, updates)
      } catch (err) {
        setSchedules(previous)
        setError('Failed to update day schedule')
      }
    })
  }

  const handleRemoveDay = (date: string) => {
    const previous = [...schedules]
    setSchedules((prev) => prev.filter((s) => s.date !== date))

    startTransition(async () => {
      try {
        await removeDaySchedule(eventId, date)
      } catch (err) {
        setSchedules(previous)
        setError('Failed to remove day')
      }
    })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-300">Multi-Day Event</h3>
          <p className="text-xs text-stone-400">
            For festivals, wedding weekends, or multi-day retreats
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            disabled={isPending}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-stone-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-brand-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {enabled && schedules.length === 0 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-400">
            Start date: <span className="text-stone-200">{formatDate(startDateStr)}</span>
          </p>
          <Input
            label="End Date"
            type="date"
            value={selectedEndDate}
            min={startDateStr}
            onChange={(e) => setSelectedEndDate(e.target.value)}
          />
          <Button onClick={handleSetEndDate} disabled={isPending || !selectedEndDate}>
            {isPending ? 'Setting up...' : 'Set Up Multi-Day'}
          </Button>
        </div>
      )}

      {enabled && schedules.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-400">
            {schedules.length} day{schedules.length !== 1 ? 's' : ''}: {formatDate(startDateStr)} to{' '}
            {formatDate(schedules[schedules.length - 1].date)}
          </p>

          {schedules.map((day) => (
            <div key={day.date} className="border border-stone-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{formatDate(day.date)}</span>
                  {editingDay === day.date ? (
                    <Input
                      value={day.label}
                      onChange={(e) => handleUpdateDay(day.date, { label: e.target.value })}
                      onBlur={() => setEditingDay(null)}
                      className="text-sm"
                      autoFocus
                    />
                  ) : (
                    <button
                      className="text-sm font-medium text-stone-200 hover:text-white"
                      onClick={() => setEditingDay(day.date)}
                    >
                      {day.label}
                    </button>
                  )}
                </div>
                {schedules.length > 1 && (
                  <button
                    onClick={() => handleRemoveDay(day.date)}
                    className="text-xs text-stone-500 hover:text-red-400 transition-colors"
                    disabled={isPending}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  label="Serve Time"
                  type="time"
                  value={day.serve_time ?? ''}
                  onChange={(e) =>
                    handleUpdateDay(day.date, { serve_time: e.target.value || null })
                  }
                />
                <Input
                  label="Guest Count"
                  type="number"
                  min="1"
                  placeholder="Guests"
                  value={day.guest_count?.toString() ?? ''}
                  onChange={(e) =>
                    handleUpdateDay(day.date, {
                      guest_count: parseInt(e.target.value) || null,
                    })
                  }
                />
                <Select
                  label="Service Style"
                  options={SERVICE_STYLE_OPTIONS}
                  value={day.service_style ?? ''}
                  onChange={(e) =>
                    handleUpdateDay(day.date, {
                      service_style: e.target.value || null,
                    })
                  }
                />
              </div>

              <Textarea
                label="Notes"
                placeholder="Notes for this day..."
                value={day.notes ?? ''}
                onChange={(e) => handleUpdateDay(day.date, { notes: e.target.value || null })}
                rows={2}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
