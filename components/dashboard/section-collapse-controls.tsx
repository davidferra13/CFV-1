'use client'

import { createContext, useContext } from 'react'
import { ChevronsDownUp, ChevronsUpDown } from '@/components/ui/icons'
import { useCollapsedWidgets } from '@/lib/hooks/use-collapsed-widgets'
import { SECTION_IDS } from '@/lib/dashboard/section-types'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'cf:dashboard-sections-collapsed'

interface SectionCollapseContextValue {
  collapsedSet: Set<string>
  toggleCollapsed: (sectionId: string) => void
  collapseAll: (allIds: string[]) => void
  expandAll: () => void
}

const SectionCollapseContext = createContext<SectionCollapseContextValue | null>(null)

export function useSectionCollapseContext() {
  return useContext(SectionCollapseContext)
}

export function DashboardSectionCollapseProvider({ children }: { children: React.ReactNode }) {
  const collapse = useCollapsedWidgets(STORAGE_KEY)
  return (
    <SectionCollapseContext.Provider value={collapse}>{children}</SectionCollapseContext.Provider>
  )
}

export function SectionCollapseControls() {
  const ctx = useSectionCollapseContext()
  if (!ctx) return null

  const { collapsedSet, collapseAll, expandAll } = ctx
  const allCollapsed = collapsedSet.size >= SECTION_IDS.length

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
      onClick={() => collapseAll([...SECTION_IDS])}
      className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-200"
    >
      <ChevronsDownUp className="h-4 w-4" />
      Collapse All
    </Button>
  )
}
