'use client'

// ProtectedTimeForm - Create a personal rest or protected-time block
// Adds a block to the chef's calendar that signals unavailability.
// Used from the calendar page or settings to block off personal time.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createProtectedTime } from '@/lib/scheduling/protected-time-actions'

interface Props {
  onClose: () => void
}

function formatDateOnly(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function listDatesInRange(startDate: string, endDate: string) {
  const dates: string[] = []
  const current = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)

  while (current <= end) {
    dates.push(formatDateOnly(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function ProtectedTimeForm({ onClose }: Props) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [blockType, setBlockType] = useState<string>('protected_personal')
  const [error, setError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!title.trim()) {
      setError('Please enter a title.')
      return
    }
    if (!startDate) {
      setError('Please select a start date.')
      return
    }
    if (endDate && endDate < startDate) {
      setError('End date must be on or after start date.')
      return
    }

    const protectedDates = listDatesInRange(startDate, endDate || startDate)
    if (protectedDates.length > 31) {
      setError('Protected time can cover up to 31 days at once.')
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const reason = blockType === 'rest' ? `Rest day: ${title.trim()}` : title.trim()
        for (const blockDate of protectedDates) {
          await createProtectedTime({
            block_date: blockDate,
            block_type: 'full_day',
            reason,
            is_recurring: false,
          })
        }
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Family weekend, Recovery day"
          className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              if (!endDate || e.target.value > endDate) {
                setEndDate(e.target.value)
              }
            }}
            className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">End date</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Block type</label>
        <select
          value={blockType}
          onChange={(e) => setBlockType(e.target.value)}
          className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-stone-900"
        >
          <option value="protected_personal">Protected Personal Time</option>
          <option value="rest">Rest Day</option>
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600 rounded-lg bg-red-950 border border-red-100 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} loading={isPending}>
          {isPending ? 'Saving...' : 'Block Time'}
        </Button>
      </div>
    </div>
  )
}
