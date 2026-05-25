'use client'

import { useState } from 'react'
import { ChevronDown } from '@/components/ui/icons'
import type { SectionMode } from '@/lib/dashboard/section-types'

type SectionShellProps = {
  sectionId: string
  mode: SectionMode
  label: string
  whisperText?: string | null
  compactSummary?: string | null
  badge?: number
  children: React.ReactNode
}

export function SectionShell({
  sectionId,
  mode,
  label,
  whisperText,
  compactSummary,
  badge,
  children,
}: SectionShellProps) {
  const [forceExpanded, setForceExpanded] = useState(false)

  const effectiveMode = forceExpanded ? 'expanded' : mode

  if (effectiveMode === 'whisper' && !forceExpanded) {
    return (
      <div
        data-section-id={sectionId}
        data-section-mode="whisper"
        className="flex items-center gap-2 py-1.5 px-1 text-sm text-stone-500"
      >
        <button
          type="button"
          onClick={() => setForceExpanded(true)}
          className="flex items-center gap-2 hover:text-stone-400 transition-colors w-full text-left"
        >
          <span>{whisperText ?? `${label}: all clear`}</span>
          <ChevronDown className="h-3 w-3 shrink-0 -rotate-90" />
        </button>
      </div>
    )
  }

  if (effectiveMode === 'compact' && !forceExpanded) {
    return (
      <div
        data-section-id={sectionId}
        data-section-mode="compact"
        className="rounded-lg border border-stone-800 bg-stone-900/30 px-4 py-3"
      >
        <button
          type="button"
          onClick={() => setForceExpanded(true)}
          role="button"
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-400">
              {label}
            </span>
            {badge != null && badge > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-brand-950 border border-brand-800/50 px-1.5 py-0.5 text-[10px] font-bold text-brand-400 tabular-nums">
                {badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-300">{compactSummary}</span>
            <ChevronDown className="h-3.5 w-3.5 text-stone-500 -rotate-90" />
          </div>
        </button>
      </div>
    )
  }

  return (
    <div data-section-id={sectionId} data-section-mode="expanded">
      {forceExpanded && (
        <button
          type="button"
          onClick={() => setForceExpanded(false)}
          className="mb-2 text-xs text-stone-500 hover:text-stone-400"
        >
          Collapse
        </button>
      )}
      {children}
    </div>
  )
}
