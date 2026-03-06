'use client'

import { createContext, useContext } from 'react'
import { ChevronsDownUp, ChevronsUpDown } from '@/components/ui/icons'
import { useCollapsedWidgets } from '@/hooks/use-collapsed-widgets'
import { DASHBOARD_WIDGET_IDS } from '@/lib/scheduling/types'
import { Button } from '@/components/ui/button'

// ============================================
// Context — shared collapse state for all dashboard widgets
// ============================================

interface CollapseContextValue {
  collapsedSet: Set<string>
  toggleCollapsed: (widgetId: string) => void
  collapseAll: (allIds: string[]) => void
  expandAll: () => void
}

const CollapseContext = createContext<CollapseContextValue | null>(null)

export function useCollapseContext() {
  const ctx = useContext(CollapseContext)
  if (!ctx) {
    throw new Error('useCollapseContext must be used within a DashboardCollapseProvider')
  }
  return ctx
}

// ============================================
// Provider — wraps the dashboard widget area
// ============================================

export function DashboardCollapseProvider({ children }: { children: React.ReactNode }) {
  const collapse = useCollapsedWidgets()

  return <CollapseContext.Provider value={collapse}>{children}</CollapseContext.Provider>
}

// ============================================
// Controls — Collapse All / Expand All buttons
// ============================================

export function DashboardCollapseControls() {
  const { collapsedSet, collapseAll, expandAll } = useCollapseContext()

  const allCollapsed = collapsedSet.size >= DASHBOARD_WIDGET_IDS.length

  return (
    <>
      {allCollapsed ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => expandAll()}
          className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-200"
        >
          <ChevronsUpDown className="h-4 w-4" />
          Expand All
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => collapseAll([...DASHBOARD_WIDGET_IDS])}
          className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-200"
        >
          <ChevronsDownUp className="h-4 w-4" />
          Collapse All
        </Button>
      )}
    </>
  )
}
