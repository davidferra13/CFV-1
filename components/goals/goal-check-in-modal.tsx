'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import type { ChefGoal } from '@/lib/goals/types'
import { formatGoalValue, formatGoalUnit } from '@/lib/goals/engine'
import { logGoalCheckIn } from '@/lib/goals/check-in-actions'
import { trackAction } from '@/lib/ai/remy-activity-tracker'

interface GoalCheckInModalProps {
  goal: ChefGoal
  currentValue: number
  onClose: () => void
}

export function GoalCheckInModal({ goal, currentValue, onClose }: GoalCheckInModalProps) {
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const unit = formatGoalUnit(goal.goalType)
  const parsedValue = parseInt(value || '0', 10)
  const canSave = parsedValue >= 1 && !isPending

  function handleSave() {
    if (!canSave) return
    setError(null)
    startTransition(async () => {
      try {
        await logGoalCheckIn({
          goalId: goal.id,
          loggedValue: parsedValue,
          notes: notes.trim() || null,
        })
        trackAction(
          'Logged goal progress',
          `+${parsedValue} ${unit}${parsedValue === 1 ? '' : 's'} — ${goal.label}`
        )
        onClose()
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md mx-auto bg-stone-900 rounded-t-2xl sm:rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Log Progress</h2>
            <p className="text-sm text-stone-500 mt-0.5 truncate max-w-[260px]">{goal.label}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-300 hover:text-stone-300 hover:bg-stone-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current progress context */}
        <div className="rounded-lg bg-stone-800 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">Current total</span>
            <span className="font-medium text-stone-100">
              {formatGoalValue(currentValue, goal.goalType)}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-stone-500">Target</span>
            <span className="font-medium text-stone-100">
              {formatGoalValue(goal.targetValue, goal.goalType)}
            </span>
          </div>
        </div>

        {/* Value input */}
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            How many {unit}
            {parsedValue === 1 ? '' : 's'} to add?
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="1"
            autoFocus
            className="w-full rounded-md border border-stone-600 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <p className="text-xs text-stone-300 mt-1">
            This adds to your running total for this period.
          </p>
        </div>

        {/* Optional notes */}
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Notes <span className="text-stone-300 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Cooked Thai for the first time"
            className="w-full rounded-md border border-stone-600 px-3 py-2 text-sm text-stone-100 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 rounded-md bg-red-950 border border-red-200 px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-stone-600 px-4 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending
              ? 'Saving…'
              : `Log +${parsedValue || 0} ${unit}${parsedValue === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
