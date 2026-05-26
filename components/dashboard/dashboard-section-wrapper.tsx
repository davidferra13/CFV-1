'use client'

import {
  DashboardSectionCollapseProvider,
  SectionCollapseControls,
} from '@/components/dashboard/section-collapse-controls'

export function DashboardSectionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DashboardSectionCollapseProvider>
      <div className="flex items-center justify-between px-1 mb-4">
        <span className="text-[10px] uppercase tracking-widest text-stone-600">Sections</span>
        <SectionCollapseControls />
      </div>
      {children}
    </DashboardSectionCollapseProvider>
  )
}
