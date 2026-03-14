'use client'

import { ChevronDown, ChevronRight } from '@/components/ui/icons'
import { useCollapseContext } from '@/components/dashboard/dashboard-collapse-controls'
import { getWidgetIcon, getWidgetCategoryStyle } from '@/lib/scheduling/types'

interface CollapsibleWidgetProps {
  widgetId: string
  title: string
  children: React.ReactNode
  /** Extra classes on the outer wrapper */
  className?: string
}

/**
 * Dashboard widget tile. Modern card with colored accent, icon, and collapsible body.
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
  const icon = getWidgetIcon(widgetId)
  const catStyle = getWidgetCategoryStyle(widgetId)

  return (
    <div
      data-widget-id={widgetId}
      className={`rounded-2xl overflow-hidden transition-all duration-200 ${className ?? ''}`}
      style={{
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `4px solid ${catStyle.border}`,
        background: collapsed ? catStyle.bg : catStyle.bgExpanded,
        boxShadow: collapsed ? 'none' : `0 0 20px ${catStyle.border}10, 0 1px 3px rgba(0,0,0,0.2)`,
      }}
    >
      {/* Title bar */}
      <button
        type="button"
        onClick={() => toggleCollapsed(widgetId)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:brightness-125 group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg leading-none shrink-0 drop-shadow-sm">{icon}</span>
          <span className="text-sm font-semibold text-stone-100 truncate">{title}</span>
        </div>
        <div
          className="shrink-0 ml-3 w-6 h-6 flex items-center justify-center rounded-md transition-colors"
          style={{ backgroundColor: `${catStyle.border}15` }}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-stone-400 group-hover:text-stone-200 transition-colors" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-stone-400 group-hover:text-stone-200 transition-colors" />
          )}
        </div>
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
