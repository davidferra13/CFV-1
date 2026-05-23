'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown } from '@/components/ui/icons'
import { actionBarItems } from './nav-config'
import type { NavGroup } from './nav-config'
import {
  CHEF_ALL_FEATURES_COLLAPSED_STORAGE_KEY,
  DEFAULT_CHEF_ALL_FEATURES_COLLAPSED,
} from '@/lib/chef/shell-state'

type AllFeaturesCollapseProps = {
  children: React.ReactNode
  /** When true, All Features is hidden entirely (Focus Mode) */
  hidden?: boolean
  /** The nav groups to check for active-page auto-expand */
  groups?: NavGroup[]
  /** Active search filter; auto-expands when non-empty */
  navFilter?: string
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
  navFilter = '',
}: AllFeaturesCollapseProps) {
  const pathname = usePathname()

  const [collapsed, setCollapsed] = useState(DEFAULT_CHEF_ALL_FEATURES_COLLAPSED)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHEF_ALL_FEATURES_COLLAPSED_STORAGE_KEY)
      if (stored !== null) setCollapsed(stored === 'true')
    } catch {
      setCollapsed(DEFAULT_CHEF_ALL_FEATURES_COLLAPSED)
    }
  }, [])

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
        localStorage.setItem(CHEF_ALL_FEATURES_COLLAPSED_STORAGE_KEY, String(next))
      } catch (err) {
        console.warn('[AllFeaturesCollapse] localStorage write failed:', err)
      }
      return next
    })
  }, [])

  // When the user is actively filtering, force-expand regardless of collapsed state
  const isSearching = navFilter.trim().length > 0
  const isOpen = isSearching || !collapsed

  if (hidden) return null

  return (
    <div>
      {/* Visual separator between Action Bar and All Features */}
      <div className="mx-3 my-2 border-t border-stone-700/50" />

      {/* All Features header */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500 hover:text-stone-400 transition-colors"
      >
        <span>All Features</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${!isOpen ? '-rotate-90' : 'rotate-0'}`}
        />
      </button>

      {/* Collapsible content */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
