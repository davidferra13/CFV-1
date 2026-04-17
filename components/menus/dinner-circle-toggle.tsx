'use client'

// D3: Toggle to control whether a menu is visible to dinner circle members.
// Only shown when menu is linked to an event.

import { useState, useTransition } from 'react'
import { updateMenu } from '@/lib/menus/actions'

interface Props {
  menuId: string
  initial: boolean
  locked: boolean
}

export function DinnerCircleToggle({ menuId, initial, locked }: Props) {
  const [visible, setVisible] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const toggle = () => {
    if (locked) return
    const next = !visible
    const previous = visible
    setVisible(next)
    setError(null)
    startTransition(async () => {
      try {
        await updateMenu(menuId, { visible_to_dinner_circle: next })
      } catch {
        setVisible(previous)
        setError('Failed to update')
      }
    })
  }

  return (
    <div className="mt-2 pt-2 border-t border-stone-800">
      <button
        type="button"
        onClick={toggle}
        disabled={locked || isPending}
        className="flex items-center gap-2 w-full text-left group disabled:opacity-50"
      >
        <span
          className={`w-7 h-4 rounded-full relative transition-colors ${
            visible ? 'bg-emerald-500' : 'bg-stone-600'
          }`}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
              visible ? 'translate-x-3.5' : 'translate-x-0.5'
            }`}
          />
        </span>
        <span className="text-xs text-stone-400 group-hover:text-stone-300">
          Dinner circle visibility
        </span>
        {isPending && <span className="text-xxs text-stone-500">Saving...</span>}
      </button>
      {error && <p className="text-xxs text-red-400 mt-1">{error}</p>}
      {locked && <p className="text-xxs text-stone-600 mt-0.5">Menu is locked</p>}
    </div>
  )
}
