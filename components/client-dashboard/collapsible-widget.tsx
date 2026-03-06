'use client'

import { ChevronDown, ChevronRight } from '@/components/ui/icons'
import { useClientDashboardCollapseContext } from '@/components/client-dashboard/collapse-controls'

export function ClientCollapsibleWidget({
  widgetId,
  title,
  children,
}: {
  widgetId: string
  title: string
  children: React.ReactNode
}) {
  const { collapsedSet, toggleCollapsed } = useClientDashboardCollapseContext()
  const collapsed = collapsedSet.has(widgetId)

  return (
    <section data-widget-id={widgetId}>
      <button
        type="button"
        onClick={() => toggleCollapsed(widgetId)}
        className={`mb-2 flex w-full items-center justify-between border-b border-stone-800 py-1.5 text-left transition-colors hover:opacity-80 ${
          collapsed ? 'mb-0' : ''
        }`}
      >
        <span className="text-sm font-semibold text-stone-300">{title}</span>
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-stone-400 transition-transform" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone-400 transition-transform" />
        )}
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: collapsed ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  )
}
