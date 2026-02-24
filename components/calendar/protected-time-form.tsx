'use client'

// ProtectedTimeForm — Create a personal rest or protected-time block
// Adds a block to the chef's calendar that signals unavailability.
// Used from the calendar page or settings to block off personal time.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createProtectedBlock } from '@/lib/scheduling/protected-time-actions'
import type { ProtectedBlockType } from '@/lib/scheduling/protected-time-actions'

interface Props {
  onClose: () => void
}

export function ProtectedTimeForm({ onClose }: Props) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [blockType, setBlockType] = useState<ProtectedBlockType>('protected_personal')
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

    setError(null)

    startTransition(async () => {
      try {
        await createProtectedBlock({
          title: title.trim(),
          start_date: startDate,
          end_date: endDate || startDate,
          block_type: blockType,
        })
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
          onChange={(e) => setBlockType(e.target.value as ProtectedBlockType)}
          className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-surface"
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
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Saving...' : 'Block Time'}
        </Button>
      </div>
    </div>
  )
}
