'use client'

import { ChevronDown, ChevronRight } from '@/components/ui/icons'
import { useCollapseContext } from '@/components/dashboard/dashboard-collapse-controls'

interface CollapsibleWidgetProps {
  widgetId: string
  title: string
  children: React.ReactNode
}

/**
 * Wraps a dashboard widget section with a collapsible title bar.
 * Reads collapsed state from DashboardCollapseProvider context.
 */
export function CollapsibleWidget({ widgetId, title, children }: CollapsibleWidgetProps) {
  const { collapsedSet, toggleCollapsed } = useCollapseContext()
  const collapsed = collapsedSet.has(widgetId)

  return (
    <div data-widget-id={widgetId}>
      {/* Title bar — always visible */}
      <button
        type="button"
        onClick={() => toggleCollapsed(widgetId)}
        className={`flex w-full items-center justify-between py-1.5 text-left transition-colors hover:opacity-80 ${
          collapsed ? '' : 'border-b border-stone-800 mb-2'
        }`}
      >
        <span className="text-sm font-semibold text-stone-300">{title}</span>
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-stone-400 transition-transform" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone-400 transition-transform" />
        )}
      </button>

      {/* Collapsible content with CSS grid transition */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: collapsed ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
