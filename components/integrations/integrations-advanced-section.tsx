'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from '@/components/ui/icons'

const STORAGE_KEY = 'cf:integrations-advanced-collapsed'

type IntegrationsAdvancedSectionProps = {
  children: React.ReactNode
}

export function IntegrationsAdvancedSection({ children }: IntegrationsAdvancedSectionProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      setCollapsed(stored === null ? true : stored === 'true')
    } catch {
      // ignore
    }
    setMounted(true)
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch (err) {
        console.warn('[IntegrationsAdvanced] localStorage write failed:', err)
      }
      return next
    })
  }

  if (!mounted) {
    return (
      <div className="rounded-xl border border-stone-800 px-4 py-3">
        <div className="h-4 w-64 bg-stone-800 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-800">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-stone-400 hover:text-stone-300 transition-colors"
      >
        <div>
          <span>Advanced provider directory</span>
          <span className="ml-2 text-xs text-stone-600">
            Use this when a provider does not have a guided setup lane
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        }`}
      >
        <div className="px-4 pb-6 space-y-6 border-t border-stone-800 pt-4">{children}</div>
      </div>
    </div>
  )
}
