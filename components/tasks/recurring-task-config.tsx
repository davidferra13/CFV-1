'use client'

// Recurring Task Configuration Widget
// Allows selecting frequency (none, daily, weekly, monthly) with day pickers.
// Returns a JSON object matching the recurring_rule schema.

import { useState, useEffect } from 'react'
import type { RecurringRule } from '@/lib/tasks/actions'

const DAY_LABELS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

type Props = {
  value: RecurringRule | null | undefined
  onChange: (rule: RecurringRule | null) => void
}

export function RecurringTaskConfig({ value, onChange }: Props) {
  const [frequency, setFrequency] = useState<string>(value?.frequency ?? 'none')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(value?.days_of_week ?? [])
  const [dayOfMonth, setDayOfMonth] = useState<number>(value?.day_of_month ?? 1)
  const [endDate, setEndDate] = useState<string>(value?.end_date ?? '')

  // Sync external value changes
  useEffect(() => {
    if (value) {
      setFrequency(value.frequency ?? 'none')
      setDaysOfWeek(value.days_of_week ?? [])
      setDayOfMonth(value.day_of_month ?? 1)
      setEndDate(value.end_date ?? '')
    } else {
      setFrequency('none')
      setDaysOfWeek([])
      setDayOfMonth(1)
      setEndDate('')
    }
  }, [value])

  function emitChange(freq: string, days: number[], dom: number, end: string) {
    if (freq === 'none') {
      onChange(null)
      return
    }

    const rule: NonNullable<RecurringRule> = {
      frequency: freq as 'daily' | 'weekly' | 'monthly',
    }

    if (freq === 'weekly' && days.length > 0) {
      rule.days_of_week = days
    }

    if (freq === 'monthly') {
      rule.day_of_month = dom
    }

    if (end) {
      rule.end_date = end
    }

    onChange(rule)
  }

  function handleFrequencyChange(newFreq: string) {
    setFrequency(newFreq)
    emitChange(newFreq, daysOfWeek, dayOfMonth, endDate)
  }

  function toggleDayOfWeek(day: number) {
    const updated = daysOfWeek.includes(day)
      ? daysOfWeek.filter((d) => d !== day)
      : [...daysOfWeek, day].sort()
    setDaysOfWeek(updated)
    emitChange(frequency, updated, dayOfMonth, endDate)
  }

  function handleDayOfMonthChange(dom: number) {
    setDayOfMonth(dom)
    emitChange(frequency, daysOfWeek, dom, endDate)
  }

  function handleEndDateChange(end: string) {
    setEndDate(end)
    emitChange(frequency, daysOfWeek, dayOfMonth, end)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1.5">Repeat</label>
        <select
          value={frequency}
          onChange={(e) => handleFrequencyChange(e.target.value)}
          className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {/* Weekly: day-of-week checkboxes */}
      {frequency === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1.5">Repeat on days</label>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((day) => {
              const selected = daysOfWeek.includes(day.value)
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDayOfWeek(day.value)}
                  className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Monthly: day-of-month picker */}
      {frequency === 'monthly' && (
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1.5">Day of month</label>
          <select
            value={dayOfMonth}
            onChange={(e) => handleDayOfMonthChange(parseInt(e.target.value, 10))}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* End date (optional, for all frequencies) */}
      {frequency !== 'none' && (
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1.5">
            End date (optional)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      )}
    </div>
  )
}
