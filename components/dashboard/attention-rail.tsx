'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, X, Sparkles } from '@/components/ui/icons'
import { snoozeChip, isSnoozed, getSnoozeCount } from '@/lib/dashboard/snooze'
import { REPEAT_SNOOZE_THRESHOLD, getSnoozeEscalation } from '@/lib/remy/snooze-escalation'
import type { AttentionChip } from '@/lib/dashboard/section-types'

type AttentionRailProps = {
  chips: AttentionChip[]
}

type RemyOffer = {
  chipId: string
  message: string
  remyPrompt: string
  actionLabel: string
}

export function AttentionRail({ chips }: AttentionRailProps) {
  const router = useRouter()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [remyOffer, setRemyOffer] = useState<RemyOffer | null>(null)

  useEffect(() => {
    if (!remyOffer) return
    const timer = setTimeout(() => setRemyOffer(null), 8000)
    return () => clearTimeout(timer)
  }, [remyOffer])

  const visibleChips = useMemo(() => {
    return chips
      .filter((c) => !dismissedIds.has(c.id))
      .filter((c) => !isSnoozed(c.id, c.urgencyScore))
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
  }, [chips, dismissedIds])

  const handleDismiss = useCallback((chip: AttentionChip) => {
    snoozeChip(chip.id, chip.urgencyScore)
    setDismissedIds((prev) => new Set([...prev, chip.id]))

    const count = getSnoozeCount(chip.id)
    if (count >= REPEAT_SNOOZE_THRESHOLD) {
      const escalation = getSnoozeEscalation('generic', { snoozeCount: count })
      setRemyOffer({
        chipId: chip.id,
        message: escalation.message,
        remyPrompt: escalation.remyPrompt,
        actionLabel: escalation.actionLabel,
      })
    }
  }, [])

  function handleRemyNavigate() {
    if (!remyOffer) return
    const prompt = encodeURIComponent(remyOffer.remyPrompt)
    router.push(`/remy?prompt=${prompt}`)
    setRemyOffer(null)
  }

  if (visibleChips.length === 0 && !remyOffer) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/30 px-4 py-2.5">
        <Check className="h-4 w-4 text-emerald-500" />
        <span className="text-sm text-stone-400">All clear</span>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
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

      {remyOffer && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2 animate-[dialog-enter_0.2s_cubic-bezier(0.22,1,0.36,1)]">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="text-xs text-stone-400">{remyOffer.message}</span>
          <button
            type="button"
            onClick={handleRemyNavigate}
            className="ml-auto shrink-0 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            {remyOffer.actionLabel}
          </button>
          <button
            type="button"
            onClick={() => setRemyOffer(null)}
            aria-label="Dismiss suggestion"
            className="shrink-0 rounded-full p-0.5 text-stone-600 hover:text-stone-400"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
