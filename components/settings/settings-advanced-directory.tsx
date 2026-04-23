'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from '@/components/ui/icons'

type SettingsAdvancedDirectoryProps = {
  children: React.ReactNode
  id?: string
  title?: string
  description?: string
  sectionCount?: number
}

export function SettingsAdvancedDirectory({
  children,
  id,
  title = 'Full settings directory',
  description = 'Every settings area, grouped by business function.',
  sectionCount,
}: SettingsAdvancedDirectoryProps) {
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    const revealFromHash = () => {
      if (window.location.hash) {
        setCollapsed(false)
      }
    }

    revealFromHash()
    window.addEventListener('hashchange', revealFromHash)
    return () => window.removeEventListener('hashchange', revealFromHash)
  }, [])

  return (
    <div
      id={id}
      className="mt-8 scroll-mt-24 overflow-hidden rounded-[24px] border border-stone-700/80 bg-[var(--glass-subtle-bg)] shadow-[var(--shadow-card)]"
    >
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-expanded={!collapsed}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/20 dark:hover:bg-white/5"
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-stone-100">{title}</span>
            {sectionCount ? (
              <span className="inline-flex items-center rounded-full border border-stone-600/80 bg-stone-900/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-300">
                {sectionCount} sections
              </span>
            ) : null}
          </div>
          <p className="max-w-2xl text-sm text-stone-400">{description}</p>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-300">
            {collapsed ? 'Show all' : 'Hide'}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-stone-300 transition-transform duration-200 ${
              collapsed ? '-rotate-90' : 'rotate-0'
            }`}
          />
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[10000px] opacity-100'
        }`}
      >
        <div className="border-t border-stone-700/70 px-5 pb-7 pt-5">{children}</div>
      </div>
    </div>
  )
}
