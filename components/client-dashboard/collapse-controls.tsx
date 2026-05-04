'use client'

import { createContext, useContext } from 'react'
import { ChevronsDownUp, ChevronsUpDown } from '@/components/ui/icons'
import { useCollapsedWidgets } from '@/lib/hooks/use-collapsed-widgets'
import { CLIENT_DASHBOARD_WIDGET_IDS } from '@/lib/client-dashboard/types'
import { Button } from '@/components/ui/button'

interface CollapseContextValue {
  collapsedSet: Set<string>
  toggleCollapsed: (widgetId: string) => void
  collapseAll: (allIds: string[]) => void
  expandAll: () => void
}

const CollapseContext = createContext<CollapseContextValue | null>(null)

export function useClientDashboardCollapseContext() {
  const ctx = useContext(CollapseContext)
  if (!ctx) {
    throw new Error(
      'useClientDashboardCollapseContext must be used within ClientDashboardCollapseProvider'
    )
  }
  return ctx
}

export function ClientDashboardCollapseProvider({ children }: { children: React.ReactNode }) {
  const collapse = useCollapsedWidgets('cf:client-dashboard-collapsed')
  return <CollapseContext.Provider value={collapse}>{children}</CollapseContext.Provider>
}

export function ClientDashboardCollapseControls() {
  const { collapsedSet, collapseAll, expandAll } = useClientDashboardCollapseContext()
  const allCollapsed =
    CLIENT_DASHBOARD_WIDGET_IDS.filter((id) => collapsedSet.has(id)).length ===
    CLIENT_DASHBOARD_WIDGET_IDS.length

  return allCollapsed ? (
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
      onClick={() => collapseAll([...CLIENT_DASHBOARD_WIDGET_IDS])}
      className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-200"
    >
      <ChevronsDownUp className="h-4 w-4" />
      Collapse All
    </Button>
  )
}
