'use client'

// Completion detail popover: lists all checks with status indicators.
// Shown when clicking a CompletionRing or CompletionBadge.
// Uses a floating panel anchored to the trigger element.

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { CompletionResult, CompletionRequirement } from '@/lib/completion/types'
import { CompletionRing } from './completion-ring'

function RequirementRow({ req }: { req: CompletionRequirement }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            req.met
              ? 'bg-emerald-400'
              : req.blocking
                ? 'bg-red-400'
                : 'bg-stone-500'
          }`}
        />
        <span
          className={`text-xs truncate ${
            req.met ? 'text-stone-500 line-through' : 'text-stone-300'
          }`}
        >
          {req.label}
        </span>
        {req.blocking && !req.met && (
          <span className="text-[10px] text-red-400 font-medium shrink-0">BLOCKING</span>
        )}
      </div>
      {!req.met && req.actionUrl && (
        <Link
          href={req.actionUrl}
          className="text-[10px] text-brand-400 hover:text-brand-300 shrink-0"
        >
          {req.actionLabel || 'Fix'}
        </Link>
      )}
    </div>
  )
}

interface CompletionDetailPopoverProps {
  result: CompletionResult
  children: React.ReactNode
}

export function CompletionDetailPopover({ result, children }: CompletionDetailPopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const missing = result.missingRequirements
    .sort((a, b) => {
      if (a.blocking !== b.blocking) return a.blocking ? -1 : 1
      return b.weight - a.weight
    })
  const completed = result.requirements.filter((r) => r.met)

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="cursor-pointer"
        aria-label={`${result.score}% complete, click for details`}
      >
        {children}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-2 w-72 rounded-lg border border-stone-700/50 bg-stone-800 shadow-xl p-4 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <CompletionRing score={result.score} size="sm" />
            <div>
              <p className="text-sm font-medium text-stone-200">
                {result.score}% complete
              </p>
              <p className="text-[10px] text-stone-500">
                {result.requirements.filter((r) => r.met).length} of{' '}
                {result.requirements.length} checks passed
              </p>
            </div>
          </div>

          {/* Missing items */}
          {missing.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Missing
              </p>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {missing.map((req) => (
                  <RequirementRow key={req.key} req={req} />
                ))}
              </div>
            </div>
          )}

          {/* Completed items (collapsed by default) */}
          {completed.length > 0 && (
            <div className="pt-2 border-t border-stone-700/50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Completed ({completed.length})
              </p>
              <div className="space-y-0.5 max-h-28 overflow-y-auto">
                {completed.map((req) => (
                  <RequirementRow key={req.key} req={req} />
                ))}
              </div>
            </div>
          )}

          {/* Next action */}
          {result.nextAction && (
            <div className="mt-3 pt-2 border-t border-stone-700/50">
              <Link
                href={result.nextAction.url}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors w-full justify-center"
              >
                Next: {result.nextAction.label}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
