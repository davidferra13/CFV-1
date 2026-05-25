'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Check, X } from '@/components/ui/icons'
import { snoozeChip, isSnoozed } from '@/lib/dashboard/snooze'
import type { AttentionChip } from '@/lib/dashboard/section-types'

type AttentionRailProps = {
  chips: AttentionChip[]
}

export function AttentionRail({ chips }: AttentionRailProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const visibleChips = useMemo(() => {
    return chips
      .filter((c) => !dismissedIds.has(c.id))
      .filter((c) => !isSnoozed(c.id, c.urgencyScore))
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
  }, [chips, dismissedIds])

  function handleDismiss(chip: AttentionChip) {
    snoozeChip(chip.id, chip.urgencyScore)
    setDismissedIds((prev) => new Set([...prev, chip.id]))
  }

  if (visibleChips.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/30 px-4 py-2.5">
        <Check className="h-4 w-4 text-emerald-500" />
        <span className="text-sm text-stone-400">All clear</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-stone-700">
      {visibleChips.map((chip) => (
        <div
          key={chip.id}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-stone-700 bg-stone-900/60 pl-3 pr-1.5 py-1.5 text-sm transition-colors hover:border-stone-600"
        >
          <Link
            href={chip.action.href ?? '#'}
            className="flex items-center gap-1.5 text-stone-200 hover:text-white"
          >
            <span className="truncate max-w-[200px]">{chip.label}</span>
            {chip.age && (
              <span className="shrink-0 rounded bg-stone-800 px-1.5 py-0.5 text-[10px] font-medium text-stone-400 tabular-nums">
                {chip.age}
              </span>
            )}
          </Link>
          {chip.dismissable && (
            <button
              type="button"
              onClick={() => handleDismiss(chip)}
              aria-label={`Dismiss ${chip.label}`}
              className="ml-0.5 rounded-full p-1 text-stone-500 hover:bg-stone-800 hover:text-stone-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
