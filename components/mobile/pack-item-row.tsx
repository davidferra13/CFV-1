'use client'

import { useTransition } from 'react'
import { Check } from '@/components/ui/icons'

export function PackItemRow({
  id,
  label,
  checked,
  isEventSpecific,
  onToggle,
}: {
  id: string
  label: string
  checked: boolean
  isEventSpecific?: boolean
  onToggle: (id: string, checked: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(() => {
      onToggle(id, !checked)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all active:scale-[0.98] ${
        checked
          ? 'bg-stone-800/40 opacity-70'
          : 'bg-stone-800/80 hover:bg-stone-700/80'
      }`}
    >
      {/* Large checkbox */}
      <div
        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
          checked
            ? 'bg-green-600 border-green-600'
            : 'border-stone-600 bg-transparent'
        }`}
      >
        {checked && <Check className="h-4 w-4 text-white" weight="bold" />}
      </div>

      {/* Label */}
      <span
        className={`text-base text-left flex-1 ${
          checked ? 'text-stone-500 line-through' : 'text-stone-200'
        }`}
      >
        {label}
      </span>

      {/* Event-specific badge */}
      {isEventSpecific && !checked && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400 font-medium shrink-0">
          Event
        </span>
      )}
    </button>
  )
}
