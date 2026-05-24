'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from '@/components/ui/icons'

type DashboardSectionProps = {
  id: string
  title: string
  children: React.ReactNode
  /** Start collapsed (default: false, expanded) */
  defaultCollapsed?: boolean
  /** Badge count shown next to title */
  badge?: number
  /** Optional subtitle text */
  subtitle?: string
}

const STORAGE_PREFIX = 'cf:dash-section-'

export function DashboardSection({
  id,
  title,
  children,
  defaultCollapsed = false,
  badge,
  subtitle,
}: DashboardSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [hasBeenExpanded, setHasBeenExpanded] = useState(!defaultCollapsed)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${id}`)
      if (stored !== null) {
        setCollapsed(stored === 'true')
        if (stored === 'false') {
          setHasBeenExpanded(true)
        }
      } else if (!defaultCollapsed) {
        setHasBeenExpanded(true)
      }
    } catch {
      // ignore
    }
    setMounted(true)
  }, [id])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      if (!next) {
        setHasBeenExpanded(true)
      }
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${id}`, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  if (!mounted) {
    return (
      <section className="dashboard-section-group space-y-4">
        <div className="h-5 w-36 bg-stone-800 rounded animate-pulse" />
        <div className="h-32 bg-stone-900/30 rounded-xl animate-pulse" />
      </section>
    )
  }

  return (
    <section className="dashboard-section-group">
      <button
        type="button"
        onClick={toggle}
        className="group flex w-full items-center gap-3 mb-4 text-left"
      >
        <div className="section-label flex-1 mb-0 pb-0 border-l-0 cursor-pointer group-hover:text-stone-300 transition-colors">
          <span>{title}</span>
          {badge != null && badge > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-brand-950 border border-brand-800/50 px-2 py-0.5 text-[10px] font-bold text-brand-400 tabular-nums">
              {badge}
            </span>
          )}
          {subtitle && (
            <span className="text-[10px] font-normal normal-case tracking-normal text-stone-500 ml-1">
              {subtitle}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-stone-500 transition-transform duration-200 shrink-0 ${
            collapsed ? '-rotate-90' : 'rotate-0'
          }`}
        />
      </button>

      <div
        className={`transition-all duration-300 ease-in-out ${
          collapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[5000px] opacity-100'
        }`}
      >
        {hasBeenExpanded ? children : null}
      </div>
    </section>
  )
}
