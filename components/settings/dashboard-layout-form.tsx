'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateChefPreferences } from '@/lib/chef/actions'
import type {
  DashboardWidgetId,
  DashboardWidgetPreference,
  WidgetCategory,
} from '@/lib/scheduling/types'
import {
  DASHBOARD_WIDGET_LABELS,
  DASHBOARD_WIDGET_META,
  DEFAULT_DASHBOARD_WIDGETS,
  groupWidgetsByCategory,
} from '@/lib/scheduling/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronRight } from '@/components/ui/icons'

function cloneDefaultWidgets(): DashboardWidgetPreference[] {
  return DEFAULT_DASHBOARD_WIDGETS.map((widget) => ({ ...widget }))
}

function normalizeWidgets(widgets: DashboardWidgetPreference[]): DashboardWidgetPreference[] {
  if (!widgets.length) return cloneDefaultWidgets()
  return widgets.map((widget) => ({ ...widget }))
}

export function DashboardLayoutForm({
  initialWidgets,
}: {
  initialWidgets: DashboardWidgetPreference[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [widgets, setWidgets] = useState<DashboardWidgetPreference[]>(
    normalizeWidgets(initialWidgets)
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<WidgetCategory>>(
    new Set(['today', 'actions', 'prep', 'money', 'clients'])
  )

  const grouped = useMemo(() => groupWidgetsByCategory(widgets), [widgets])

  const toggleCategory = (cat: WidgetCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const setWidgetEnabled = (widgetId: DashboardWidgetId, enabled: boolean) => {
    setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, enabled } : w)))
    setSuccess(false)
    setError(null)
  }

  const setCategoryEnabled = (cat: WidgetCategory, enabled: boolean) => {
    setWidgets((prev) =>
      prev.map((w) => {
        const meta = DASHBOARD_WIDGET_META[w.id]
        return meta?.category === cat ? { ...w, enabled } : w
      })
    )
    setSuccess(false)
    setError(null)
  }

  const getCategoryStats = (cat: WidgetCategory) => {
    const catWidgets = widgets.filter((w) => DASHBOARD_WIDGET_META[w.id]?.category === cat)
    const enabled = catWidgets.filter((w) => w.enabled).length
    return { enabled, total: catWidgets.length }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSuccess(false)
    setError(null)

    startTransition(async () => {
      try {
        await updateChefPreferences({ dashboard_widgets: widgets })
        setSuccess(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save dashboard layout')
      }
    })
  }

  const totalEnabled = widgets.filter((w) => w.enabled).length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-400">
          {totalEnabled} of {widgets.length} widgets enabled
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setWidgets((prev) => prev.map((w) => ({ ...w, enabled: false })))
              setSuccess(false)
              setError(null)
            }}
            disabled={isPending}
          >
            Disable All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setWidgets(cloneDefaultWidgets())
              setSuccess(false)
              setError(null)
            }}
            disabled={isPending}
          >
            Reset to Defaults
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {grouped.map(({ category, label, widgets: catWidgets }) => {
          const expanded = expandedCategories.has(category)
          const stats = getCategoryStats(category)
          const allEnabled = stats.enabled === stats.total
          const noneEnabled = stats.enabled === 0

          return (
            <Card key={category}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-2 text-left flex-1"
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 text-stone-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-stone-400" />
                    )}
                    <CardTitle className="text-base">{label}</CardTitle>
                    <span className="text-xs text-stone-500 ml-2">
                      {stats.enabled}/{stats.total}
                    </span>
                  </button>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCategoryEnabled(category, true)}
                      disabled={allEnabled}
                      className="text-xs h-7 px-2"
                    >
                      All On
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCategoryEnabled(category, false)}
                      disabled={noneEnabled}
                      className="text-xs h-7 px-2"
                    >
                      All Off
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {expanded && (
                <CardContent className="pt-0 pb-3 px-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catWidgets.map((widget) => (
                      <label
                        key={widget.id}
                        className="flex items-center gap-3 rounded-lg border border-stone-700 p-2.5 cursor-pointer hover:bg-stone-800/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={widget.enabled}
                          onChange={(e) => setWidgetEnabled(widget.id, e.target.checked)}
                          className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-brand-600 focus:ring-brand-500 focus:ring-offset-0"
                        />
                        <span
                          className={`text-sm ${widget.enabled ? 'text-stone-100' : 'text-stone-500'}`}
                        >
                          {DASHBOARD_WIDGET_LABELS[widget.id]}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-950 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-950 p-4">
          <p className="text-sm text-green-200">Dashboard layout saved.</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Layout'}
        </Button>
      </div>
    </form>
  )
}
