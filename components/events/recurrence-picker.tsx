// Recurrence Picker
// UI for configuring recurring event patterns (weekly, biweekly, monthly).
'use client'

import { useState, useEffect, useTransition } from 'react'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { previewRecurrence } from '@/lib/booking/recurring-actions'
import type { RecurrenceRule } from '@/lib/booking/recurrence-engine'

type RecurrencePickerProps = {
  startDate: string
  endDate: string
  onChange: (rule: RecurrenceRule | null) => void
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function RecurrencePicker({ startDate, endDate, onChange }: RecurrencePickerProps) {
  const [enabled, setEnabled] = useState(false)
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [mealSlot, setMealSlot] = useState<RecurrenceRule['meal_slot']>('dinner')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [preview, setPreview] = useState<{ count: number; description: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Build rule from current state
  const currentRule: RecurrenceRule | null = enabled
    ? {
        frequency,
        ...(frequency !== 'monthly'
          ? { days_of_week: daysOfWeek.length > 0 ? daysOfWeek : undefined }
          : {}),
        ...(frequency === 'monthly' ? { day_of_month: dayOfMonth } : {}),
        meal_slot: mealSlot,
        ...(startTime ? { start_time: startTime } : {}),
        ...(endTime ? { end_time: endTime } : {}),
      }
    : null

  // Propagate changes
  useEffect(() => {
    onChange(currentRule)
  }, [enabled, frequency, daysOfWeek, dayOfMonth, mealSlot, startTime, endTime]) // eslint-disable-line react-hooks/exhaustive-deps

  // Preview count when rule or dates change
  useEffect(() => {
    if (!enabled || !startDate || !endDate || !currentRule) {
      setPreview(null)
      return
    }

    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          const result = await previewRecurrence(currentRule, startDate, endDate)
          setPreview({ count: result.count, description: result.description })
        } catch {
          setPreview(null)
        }
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [enabled, startDate, endDate, frequency, daysOfWeek, dayOfMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => setEnabled(true)}
        className="text-sm text-brand-400 hover:text-brand-300 underline"
      >
        + Make this recurring
      </button>
    )
  }

  return (
    <Card className="p-4 space-y-4 border-brand-700 bg-stone-900/50">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-stone-100">Recurrence Pattern</h4>
        <button
          type="button"
          onClick={() => {
            setEnabled(false)
            onChange(null)
          }}
          className="text-xs text-stone-400 hover:text-stone-200"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as typeof frequency)}
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'biweekly', label: 'Every other week' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
        <Select
          label="Meal slot"
          value={mealSlot}
          onChange={(e) => setMealSlot(e.target.value as RecurrenceRule['meal_slot'])}
          options={[
            { value: 'breakfast', label: 'Breakfast' },
            { value: 'lunch', label: 'Lunch' },
            { value: 'dinner', label: 'Dinner' },
            { value: 'late_snack', label: 'Late Snack' },
            { value: 'dropoff', label: 'Drop-off' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </div>

      {frequency !== 'monthly' && (
        <div>
          <label className="text-xs text-stone-400 block mb-1.5">Days of the week</label>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  daysOfWeek.includes(idx)
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {frequency === 'monthly' && (
        <Input
          label="Day of month"
          type="number"
          min={1}
          max={31}
          value={dayOfMonth}
          onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Start time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <Input
          label="End time"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>

      {preview && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={preview.count > 0 ? 'info' : 'warning'}>
            {isPending ? '...' : `${preview.count} events`}
          </Badge>
          <span className="text-stone-400">{preview.description}</span>
        </div>
      )}

      {!startDate || !endDate ? (
        <p className="text-xs text-stone-500">
          Set start and end dates above to see how many events will be created.
        </p>
      ) : null}
    </Card>
  )
}
