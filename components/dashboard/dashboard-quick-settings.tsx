'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Settings2 } from '@/components/ui/icons'
import { updateChefPreferences } from '@/lib/chef/actions'
import type { DashboardWidgetPreference, DashboardWidgetId } from '@/lib/scheduling/types'
import {
  DASHBOARD_WIDGET_LABELS,
  DASHBOARD_WIDGET_META,
  groupWidgetsByCategory,
} from '@/lib/scheduling/types'
import { Button } from '@/components/ui/button'

function cloneWidgets(widgets: DashboardWidgetPreference[]): DashboardWidgetPreference[] {
  return widgets.map((widget) => ({ ...widget }))
}

export function DashboardQuickSettings({
  initialWidgets,
}: {
  initialWidgets: DashboardWidgetPreference[]
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [widgets, setWidgets] = useState<DashboardWidgetPreference[]>(cloneWidgets(initialWidgets))
  const [error, setError] = useState<string | null>(null)

  const grouped = useMemo(() => groupWidgetsByCategory(widgets), [widgets])
  const enabledCount = useMemo(() => widgets.filter((w) => w.enabled).length, [widgets])

  const toggleWidget = (widgetId: DashboardWidgetId) => {
    setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, enabled: !w.enabled } : w)))
  }

  const handleSave = () => {
    setError(null)

    startTransition(async () => {
      try {
        await updateChefPreferences({ dashboard_widgets: widgets })
        setIsOpen(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save dashboard order')
      }
    })
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          setError(null)
          setWidgets(cloneWidgets(initialWidgets))
          setIsOpen((prev) => !prev)
        }}
        className="inline-flex items-center gap-1.5"
      >
        <Settings2 className="h-4 w-4" />
        Layout
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-stone-700 bg-stone-900 p-4 shadow-lg">
          <div className="mb-3">
            <p className="text-sm font-semibold text-stone-100">Dashboard Widgets</p>
            <p className="text-xs text-stone-500">{enabledCount} enabled. Toggle widgets on/off.</p>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {grouped.map(({ category, label, widgets: catWidgets }) => {
              const enabledInCat = catWidgets.filter((w) => w.enabled).length
              return (
                <div key={category}>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    {label}
                    <span className="ml-1 font-normal">
                      ({enabledInCat}/{catWidgets.length})
                    </span>
                  </p>
                  <div className="space-y-1">
                    {catWidgets.map((widget) => (
                      <label
                        key={widget.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-stone-800 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={widget.enabled}
                          onChange={() => toggleWidget(widget.id)}
                          className="h-3.5 w-3.5 rounded border-stone-600 bg-stone-800 text-brand-600 focus:ring-brand-500 focus:ring-offset-0"
                        />
                        <span
                          className={`text-xs ${widget.enabled ? 'text-stone-200' : 'text-stone-500'}`}
                        >
                          {DASHBOARD_WIDGET_LABELS[widget.id]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-stone-700 pt-3">
            <Link
              href="/settings/dashboard"
              className="text-xs text-brand-600 hover:text-brand-400"
            >
              Full settings
            </Link>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Close
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
