'use client'

import { useTransition } from 'react'
import type { GroceryRunItem } from '@/lib/mobile/grocery-run'

interface GroceryItemRowProps {
  item: GroceryRunItem
  onToggle: (ingredientId: string, checked: boolean) => void
}

export function GroceryItemRow({ item, onToggle }: GroceryItemRowProps) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(() => {
      onToggle(item.ingredientId, !item.checked)
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-3 w-full min-h-[52px] px-4 py-3 text-left transition-colors active:bg-stone-700 ${
        item.checked ? 'bg-stone-800/50' : 'bg-stone-900'
      } ${isPending ? 'opacity-60' : ''}`}
    >
      {/* Checkbox */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors ${
          item.checked
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-stone-500 bg-transparent'
        }`}
      >
        {item.checked && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Item details */}
      <div className="flex-1 min-w-0">
        <div
          className={`text-base font-medium transition-all ${
            item.checked ? 'line-through text-stone-500' : 'text-stone-100'
          }`}
        >
          {item.name}
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
          <span>{item.quantity}</span>
          {item.recipes.length > 0 && (
            <>
              <span className="text-stone-600">|</span>
              <span className="truncate">{item.recipes.join(', ')}</span>
            </>
          )}
        </div>
      </div>

      {/* Pending indicator */}
      {isPending && (
        <div className="flex-shrink-0 w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      )}
    </button>
  )
}
