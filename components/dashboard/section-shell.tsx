'use client'

import { ChevronDown } from '@/components/ui/icons'
import type { SectionMode } from '@/lib/dashboard/section-types'
import { useSectionCollapseContext } from '@/components/dashboard/section-collapse-controls'

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
  const collapseCtx = useSectionCollapseContext()
  const isCollapsed = collapseCtx?.collapsedSet.has(sectionId) ?? false

  const summaryText =
    mode === 'whisper'
      ? (whisperText ?? `${label}: all clear`)
      : mode === 'compact'
        ? compactSummary
        : null

  return (
    <div data-section-id={sectionId} data-section-mode={isCollapsed ? 'collapsed' : mode}>
      {/* Header bar: always visible */}
      <button
        type="button"
        onClick={() => collapseCtx?.toggleCollapsed(sectionId)}
        className="group flex w-full items-center gap-3 py-2 px-1 text-left transition-colors rounded-md hover:bg-stone-800/30"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-stone-500 group-hover:text-stone-300 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
        />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 group-hover:text-stone-300 transition-colors">
          {label}
        </span>
        {badge != null && badge > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-brand-950 border border-brand-800/50 px-1.5 py-0.5 text-[10px] font-bold text-brand-400 tabular-nums">
            {badge}
          </span>
        )}
        {isCollapsed && summaryText && (
          <span className="ml-auto text-xs text-stone-600 truncate max-w-[50%]">{summaryText}</span>
        )}
      </button>

      {/* Animated content area */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: isCollapsed ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden">
          <div className="pt-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
