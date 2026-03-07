'use client'

import { ChevronDown, ChevronRight } from '@/components/ui/icons'
import { useCollapseContext } from '@/components/dashboard/dashboard-collapse-controls'

interface CollapsibleWidgetProps {
  widgetId: string
  title: string
  children: React.ReactNode
  /** Extra classes on the outer wrapper (e.g. grid col-span from parent) */
  className?: string
}

/**
 * Dashboard widget tile. Rounded card with a collapsible title bar.
 * Reads collapsed state from DashboardCollapseProvider context.
 */
export function CollapsibleWidget({
  widgetId,
  title,
  children,
  className,
}: CollapsibleWidgetProps) {
  const { collapsedSet, toggleCollapsed } = useCollapseContext()
  const collapsed = collapsedSet.has(widgetId)

  return (
    <div
      data-widget-id={widgetId}
      className={`rounded-xl border border-stone-700/60 bg-stone-900/50 overflow-hidden ${className ?? ''}`}
    >
      {/* Title bar */}
      <button
        type="button"
        onClick={() => toggleCollapsed(widgetId)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-stone-800/50"
      >
        <span className="text-sm font-semibold text-stone-200">{title}</span>
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-stone-500 transition-transform" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone-500 transition-transform" />
        )}
      </button>

      {/* Collapsible content */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: collapsed ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
