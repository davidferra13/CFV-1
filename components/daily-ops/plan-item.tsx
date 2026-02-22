'use client'

// PlanItem — Single actionable item in the daily plan.
// Supports: checkbox complete, one-tap approve (drafts), deep link, dismiss.

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, X, ChevronDown, ChevronUp, ExternalLink, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { completeDailyPlanItem, dismissDailyPlanItem } from '@/lib/daily-ops/actions'
import type { PlanItem as PlanItemType } from '@/lib/daily-ops/types'

type Props = {
  item: PlanItemType
  onUpdate?: () => void
}

export function PlanItem({ item, onUpdate }: Props) {
  const [completed, setCompleted] = useState(item.completed)
  const [dismissed, setDismissed] = useState(item.dismissed)
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()

  if (dismissed) return null

  function handleComplete() {
    startTransition(async () => {
      const result = await completeDailyPlanItem(item.id)
      if (result.success) {
        setCompleted(true)
        onUpdate?.()
      }
    })
  }

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissDailyPlanItem(item.id)
      if (result.success) {
        setDismissed(true)
        onUpdate?.()
      }
    })
  }

  return (
    <div
      className={`group flex items-start gap-3 rounded-lg border px-4 py-3 transition-all ${
        completed
          ? 'border-green-200 bg-green-50/50 opacity-60'
          : 'border-stone-200 bg-white hover:border-brand-200 hover:shadow-sm'
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={handleComplete}
        disabled={pending || completed}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
          completed
            ? 'border-green-400 bg-green-400 text-white'
            : 'border-stone-300 hover:border-brand-400 hover:bg-brand-50'
        }`}
        aria-label={completed ? 'Completed' : 'Mark complete'}
      >
        {completed && <Check className="h-3 w-3" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`text-sm font-medium ${completed ? 'text-stone-400 line-through' : 'text-stone-900'}`}
          >
            {item.title}
          </p>
          {item.timeEstimateMinutes > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-400 shrink-0">
              <Clock className="h-2.5 w-2.5" />
              {item.timeEstimateMinutes}m
            </span>
          )}
        </div>
        <p className="text-xs text-stone-500 mt-0.5 truncate">{item.description}</p>

        {/* Draft preview (when expanded) */}
        {item.draft && expanded && (
          <div className="mt-3 rounded-md bg-stone-50 border border-stone-200 p-3">
            <p className="text-xs font-medium text-stone-600 mb-1">
              Draft for {item.draft.recipientName}:
            </p>
            <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
              {item.draft.previewText}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {item.draft && !completed && (
          <>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="rounded p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              aria-label={expanded ? 'Collapse' : 'Preview draft'}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleComplete}
              disabled={pending}
              className="text-xs px-2 py-1 h-auto"
            >
              Approve
            </Button>
          </>
        )}
        {!completed && (
          <Link
            href={item.href}
            className="rounded p-1 text-stone-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            aria-label="Open"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
        {!completed && (
          <button
            type="button"
            onClick={handleDismiss}
            disabled={pending}
            className="rounded p-1 text-stone-300 hover:text-stone-500 hover:bg-stone-100 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
