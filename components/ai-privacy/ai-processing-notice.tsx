'use client'

import { Shield } from '@/components/ui/icons'
import { NOTICE_COMPACT, NOTICE_FULL, NO_TRAINING, DATA_STORAGE } from '@/lib/ai/privacy-narrative'

/**
 * Shared disclosure component for AI processing.
 * Use this anywhere the app needs to explain how AI features work.
 * Centralized so the disclosure stays consistent and does not drift.
 *
 * All text comes from lib/ai/privacy-narrative.ts (single source of truth).
 */
export function AiProcessingNotice({
  variant = 'compact',
  className = '',
}: {
  variant?: 'compact' | 'full'
  className?: string
}) {
  if (variant === 'compact') {
    return (
      <p className={`text-xs text-stone-500 flex items-center gap-1 ${className}`}>
        <Shield className="h-3 w-3 shrink-0" />
        {NOTICE_COMPACT}
      </p>
    )
  }

  return (
    <div
      className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 space-y-2 ${className}`}
    >
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-brand-500 shrink-0" />
        <p className="text-sm font-medium text-stone-200">How AI processing works</p>
      </div>
      <div className="text-xs text-stone-400 space-y-1.5 leading-relaxed">
        <p>{NOTICE_FULL}</p>
        <p>
          {NO_TRAINING} {DATA_STORAGE}
        </p>
      </div>
    </div>
  )
}
