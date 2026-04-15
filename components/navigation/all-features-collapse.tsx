'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown } from '@/components/ui/icons'
import { actionBarItems } from './nav-config'
import type { NavGroup } from './nav-config'

const STORAGE_KEY = 'chef-all-features-collapsed'

type AllFeaturesCollapseProps = {
  children: React.ReactNode
  /** When true, All Features is hidden entirely (Focus Mode) */
  hidden?: boolean
  /** The nav groups to check for active-page auto-expand */
  groups?: NavGroup[]
}

/** Check if current pathname lives inside one of the navGroups but NOT in the Action Bar */
function isDeepLinkInAllFeatures(pathname: string, groups: NavGroup[]): boolean {
  const actionBarHrefs = new Set(actionBarItems.map((i) => i.href))
  if (actionBarHrefs.has(pathname)) return false

  for (const group of groups) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) return true
      if (item.children) {
        for (const child of item.children) {
          if (pathname === child.href || pathname.startsWith(child.href + '/')) return true
        }
      }
    }
  }
  return false
}

export function AllFeaturesCollapse({
  children,
  hidden = false,
  groups = [],
}: AllFeaturesCollapseProps) {
  const pathname = usePathname()

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      // Default to collapsed on first load; auto-expand overrides this when active route is inside
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  })

  // Auto-expand when the active page is inside All Features but not in the Action Bar
  useEffect(() => {
    if (groups.length > 0 && isDeepLinkInAllFeatures(pathname, groups)) {
      setCollapsed(false)
    }
  }, [pathname, groups])

  // Persist collapse state
  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch (err) {
        console.warn('[AllFeaturesCollapse] localStorage write failed:', err)
      }
      return next
    })
  }, [])

  if (hidden) return null

  return (
    <div>
      {/* Visual separator between Action Bar and All Features */}
      <div className="mx-3 my-2 border-t border-stone-700/50" />

      {/* All Features header */}
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500 hover:text-stone-400 transition-colors"
      >
        <span>Browse Everything</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
        />
      </button>

      {/* Collapsible content */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
