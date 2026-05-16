'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Pin } from '@/components/ui/icons'
import type { PinnedSurface } from '@/lib/surfaces/analytics/usage-tracking'

const COLLAPSED_KEY = 'cf:pinned-surfaces-collapsed'

export function PinnedSurfacesSection({ pinnedSurfaces }: { pinnedSurfaces: PinnedSurface[] }) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY)
      if (stored === 'true') setCollapsed(true)
    } catch {}
    setMounted(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next))
      } catch {}
      return next
    })
  }

  if (!mounted) return null
  if (pinnedSurfaces.length === 0) return null

  return (
    <div>
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        className="group flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-stone-300 hover:bg-stone-800"
      >
        <Pin className="w-4 h-4 text-stone-500" />
        <span className="flex-1 text-left">Pinned</span>
        {collapsed ? (
          <ChevronUp className="w-4 h-4 text-stone-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[420px] opacity-100'
        }`}
      >
        <div className="space-y-0.5">
          {pinnedSurfaces.map((surface) => (
            <button
              key={surface.id}
              type="button"
              onClick={() => router.push(surface.routePath)}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm font-medium text-stone-400 hover:bg-stone-800 hover:text-stone-100 transition-colors text-left"
            >
              <span className="flex-1 truncate">{surface.label || surface.routePath}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
