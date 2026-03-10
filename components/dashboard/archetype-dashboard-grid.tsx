// Archetype Dashboard Grid - Renders archetype-specific KPI widgets.
// Takes a widget config array and renders each widget as a card in a responsive grid.
// Widgets with real data components render them; others show a placeholder.

'use client'

import type { DashboardWidget } from '@/lib/archetypes/dashboard-config'
import { DashboardWidgetCard } from './dashboard-widget-card'

type ArchetypeDashboardGridProps = {
  widgets: DashboardWidget[]
  archetypeLabel: string
}

export function ArchetypeDashboardGrid({ widgets, archetypeLabel }: ArchetypeDashboardGridProps) {
  if (widgets.length === 0) {
    return (
      <div className="col-span-1 sm:col-span-2 lg:col-span-4 text-center py-8">
        <p className="text-sm text-stone-500">No widgets configured for this dashboard.</p>
      </div>
    )
  }

  return (
    <section className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-200">{archetypeLabel} Dashboard</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            KPIs and widgets tailored to your business type
          </p>
        </div>
        <span className="text-xs text-stone-600">
          {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {widgets.map((widget) => (
          <DashboardWidgetCard
            key={widget.key}
            title={widget.title}
            widgetKey={widget.key}
            gridSpan={widget.gridSpan}
          >
            <WidgetPlaceholder widget={widget} />
          </DashboardWidgetCard>
        ))}
      </div>
    </section>
  )
}

// Placeholder content for widgets that don't have real data components yet.
// Each widget shows its description and a "Coming soon" badge.
function WidgetPlaceholder({ widget }: { widget: DashboardWidget }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-stone-400">{widget.description}</p>
      <span className="inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-medium bg-stone-800 text-stone-500 border border-stone-700/50">
        Coming soon
      </span>
    </div>
  )
}
