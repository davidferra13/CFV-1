// Dashboard Widget Card - Reusable wrapper for archetype dashboard widgets.
// Renders a card with title bar, loading state, error state, and grid span support.

'use client'

import type { WidgetGridSpan } from '@/lib/archetypes/dashboard-config'

type DashboardWidgetCardProps = {
  title: string
  widgetKey: string
  gridSpan?: WidgetGridSpan
  children: React.ReactNode
  isLoading?: boolean
  error?: string | null
}

export function DashboardWidgetCard({
  title,
  widgetKey,
  gridSpan = 1,
  children,
  isLoading = false,
  error = null,
}: DashboardWidgetCardProps) {
  const spanClass = gridSpan === 2 ? 'col-span-1 sm:col-span-2' : 'col-span-1'

  return (
    <div
      data-widget-key={widgetKey}
      className={`${spanClass} rounded-2xl border border-stone-700/50 bg-stone-900/60 overflow-hidden transition-all duration-200 hover:border-stone-600/60`}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800/50">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider truncate">
          {title}
        </h3>
      </div>

      {/* Content area */}
      <div className="px-4 py-4">
        {isLoading ? (
          <WidgetLoadingState />
        ) : error ? (
          <WidgetErrorState message={error} />
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function WidgetLoadingState() {
  return (
    <div className="animate-pulse space-y-2.5">
      <div className="h-8 w-24 rounded bg-stone-800" />
      <div className="h-3 w-32 rounded bg-stone-800" />
    </div>
  )
}

function WidgetErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-sm text-red-400">!</span>
      <p className="text-xs text-stone-500">{message}</p>
    </div>
  )
}
