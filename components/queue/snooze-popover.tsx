'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock, Sparkles } from '@/components/ui/icons'
import { SNOOZE_OPTIONS, type SnoozeDuration } from '@/lib/hooks/use-queue-snooze'
import { REPEAT_SNOOZE_THRESHOLD, getSnoozeEscalation } from '@/lib/remy/snooze-escalation'

interface SnoozePopoverProps {
  onSnooze: (duration: SnoozeDuration) => void
  snoozeCount?: number
  onRemyEscalation?: () => void
  itemType?: 'inquiry' | 'payment' | 'follow-up' | 'thread' | 'reminder' | 'generic'
}

export function SnoozePopover({
  onSnooze,
  snoozeCount,
  onRemyEscalation,
  itemType = 'generic',
}: SnoozePopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const showRemyOption = snoozeCount != null && snoozeCount >= REPEAT_SNOOZE_THRESHOLD

  const escalation = showRemyOption ? getSnoozeEscalation(itemType, { snoozeCount }) : null

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
        <div
          className="absolute right-0 top-full mt-1 w-44 border border-white/[0.08] rounded-lg shadow-2xl z-float py-1 animate-[dialog-enter_0.15s_cubic-bezier(0.22,1,0.36,1)]"
          style={{
            background: 'rgba(28, 25, 23, 0.9)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
            backdropFilter: 'blur(16px) saturate(1.2)',
          }}
        >
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
              className="w-full text-left px-3 py-2 text-sm text-stone-300 hover:bg-white/[0.07] hover:text-stone-100 transition-all duration-150"
            >
              {option.label}
            </button>
          ))}

          {showRemyOption && escalation && (
            <>
              <div className="mx-2 my-1 border-t border-white/[0.06]" />
              <div className="px-3 pt-1 pb-0.5 text-[11px] text-amber-500/70">
                {escalation.message}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemyEscalation?.()
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-all duration-150 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                {escalation.actionLabel}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
