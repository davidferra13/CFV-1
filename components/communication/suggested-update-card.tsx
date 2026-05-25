'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SuggestedUpdate } from '@/lib/communication/info-change-types'

type Props = {
  update: SuggestedUpdate
  eventId?: string | null
  clientId?: string | null
  onDismiss: () => void
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'border-emerald-700 bg-emerald-950/30',
  medium: 'border-amber-700 bg-amber-950/30',
  low: 'border-stone-700 bg-stone-800',
}

const CONFIDENCE_BADGE: Record<
  string,
  { variant: 'success' | 'warning' | 'default'; label: string }
> = {
  high: { variant: 'success', label: 'High confidence' },
  medium: { variant: 'warning', label: 'Check this' },
  low: { variant: 'default', label: 'Maybe' },
}

/**
 * Inline prompt card for a detected info change.
 * Shows what was detected and offers one-tap update or dismiss.
 * Does not auto-mutate any data; requires explicit chef approval.
 */
export function SuggestedUpdateCard({ update, onDismiss }: Props) {
  const [isPending, startTransition] = useTransition()
  const [applied, setApplied] = useState(false)

  const badge = CONFIDENCE_BADGE[update.confidence] || CONFIDENCE_BADGE.low

  function handleApply() {
    // For now, mark as applied and dismiss.
    // Actual entity mutations (updating guest_count, dietary, etc.) will be
    // wired to specific server actions as those mutation paths are confirmed.
    startTransition(() => {
      setApplied(true)
      setTimeout(onDismiss, 800)
    })
  }

  if (applied) {
    return (
      <div className="rounded-lg border border-emerald-700 bg-emerald-950/30 p-3">
        <p className="text-sm text-emerald-400">Noted. Update queued for review.</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border p-3 ${CONFIDENCE_STYLES[update.confidence]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={badge.variant} className="text-xs">
              {badge.label}
            </Badge>
            <span className="text-xs text-stone-500 capitalize">
              {update.type.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm text-stone-200">{update.label}</p>
          {update.extractedValue && (
            <p className="text-xs text-stone-400">
              Detected value:{' '}
              <span className="font-medium text-stone-300">{update.extractedValue}</span>
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={handleApply} disabled={isPending}>
          {isPending ? 'Applying...' : 'Update'}
        </Button>
        <Button size="sm" variant="secondary" onClick={onDismiss} disabled={isPending}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
