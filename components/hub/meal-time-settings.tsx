'use client'

import { useState, useEffect, useTransition } from 'react'
import type { DefaultMealTimes, MealType } from '@/lib/hub/types'
import { getDefaultMealTimes, updateDefaultMealTimes } from '@/lib/hub/meal-board-actions'

interface MealTimeSettingsProps {
  groupId: string
  profileToken: string
  onClose: () => void
  onSaved?: (times: DefaultMealTimes) => void
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}
const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

const DEFAULT_TIMES: DefaultMealTimes = {
  breakfast: '08:00',
  lunch: '12:30',
  dinner: '19:00',
  snack: null,
}

export function MealTimeSettings({
  groupId,
  profileToken,
  onClose,
  onSaved,
}: MealTimeSettingsProps) {
  const [times, setTimes] = useState<DefaultMealTimes>(DEFAULT_TIMES)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDefaultMealTimes(groupId)
      .then((t) => {
        if (t) setTimes(t)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId])

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await updateDefaultMealTimes({
          groupId,
          profileToken,
          times,
        })
        if (!result.success) {
          setError(result.error ?? 'Failed to save')
        } else {
          onSaved?.(times)
          onClose()
        }
      } catch {
        setError('Failed to save meal times')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-2xl border border-stone-700 bg-stone-900 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-stone-200">Default Meal Times</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
          >
            ✕
          </button>
        </div>

        <p className="mb-3 text-[10px] text-stone-500">
          Set default serving times for each meal. These show on the board and in the prep brief.
          Individual meals can override these times.
        </p>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-600 border-t-stone-300" />
          </div>
        ) : (
          <div className="space-y-3">
            {MEAL_ORDER.map((meal) => (
              <div key={meal} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm">{MEAL_EMOJI[meal]}</span>
                <span className="w-20 text-xs text-stone-300">{MEAL_LABELS[meal]}</span>
                <input
                  type="time"
                  value={times[meal] ?? ''}
                  onChange={(e) =>
                    setTimes((prev) => ({
                      ...prev,
                      [meal]: e.target.value || null,
                    }))
                  }
                  className="flex-1 rounded bg-stone-800 px-2 py-1.5 text-xs text-stone-100 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)] [color-scheme:dark]"
                />
                {times[meal] && (
                  <button
                    type="button"
                    onClick={() => setTimes((prev) => ({ ...prev, [meal]: null }))}
                    className="text-[10px] text-stone-600 hover:text-stone-400"
                    title="Clear time"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-[10px] text-red-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-[var(--hub-primary,#e88f47)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Times'}
          </button>
        </div>
      </div>
    </div>
  )
}
