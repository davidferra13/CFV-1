'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from '@/components/ui/icons'

const STORAGE_KEY = 'cf:settings-advanced-collapsed'

type SettingsAdvancedDirectoryProps = {
  children: React.ReactNode
}

export function SettingsAdvancedDirectory({ children }: SettingsAdvancedDirectoryProps) {
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
      } catch {}
      return next
    })
  }

  if (!mounted) {
    return (
      <div className="mt-6 rounded-xl border border-stone-800 px-4 py-3">
        <div className="h-4 w-48 bg-stone-800 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-xl border border-stone-800">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-stone-400 hover:text-stone-300 transition-colors"
      >
        <span>Advanced settings directory</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[10000px] opacity-100'
        }`}
      >
        <div className="px-4 pb-6">{children}</div>
      </div>
    </div>
  )
}
