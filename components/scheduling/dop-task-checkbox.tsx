'use client'

// DOPTaskCheckbox — Interactive checkbox for manually completing DOP tasks.
// Used inside DOPView for tasks that can't be auto-detected from system state.
// Calls toggleDOPTaskCompletion server action with optimistic UI update.

import { useState, useTransition } from 'react'
import { toggleDOPTaskCompletion } from '@/lib/scheduling/dop-completions'

type Props = {
  eventId: string
  taskKey: string
  initialChecked: boolean
}

export function DOPTaskCheckbox({ eventId, taskKey, initialChecked }: Props) {
  const [checked, setChecked] = useState(initialChecked)
  const [, startTransition] = useTransition()

  const handleToggle = () => {
    const next = !checked
    setChecked(next) // optimistic
    startTransition(async () => {
      try {
        const result = await toggleDOPTaskCompletion(eventId, taskKey)
        setChecked(result.completed)
      } catch {
        setChecked(!next) // rollback on error
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={checked ? 'Unmark task as done' : 'Mark task as done'}
      className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center text-xs transition-colors cursor-pointer ${
        checked
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : 'bg-stone-900 border-stone-600 text-transparent hover:border-emerald-400'
      }`}
    >
      ✓
    </button>
  )
}
