'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { SNOOZE_OPTIONS, type SnoozeDuration } from '@/hooks/use-queue-snooze'

interface SnoozePopoverProps {
  onSnooze: (duration: SnoozeDuration) => void
}

/**
 * Small popover with snooze duration options.
 * Triggered by a clock icon button on queue item rows.
 */
export function SnoozePopover({ onSnooze }: SnoozePopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        className="p-1 rounded hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
        aria-label="Snooze this item"
        title="Snooze"
      >
        <Clock className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-stone-900 border border-stone-700 rounded-lg shadow-xl z-50 py-1">
          <div className="px-3 py-1.5 text-xs font-bold text-stone-500 uppercase tracking-wide">
            Snooze for
          </div>
          {SNOOZE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSnooze(option.value)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-stone-100 transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
