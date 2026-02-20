'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateChefPreferences } from '@/lib/chef/actions'
import type { DashboardWidgetId, DashboardWidgetPreference } from '@/lib/scheduling/types'
import { DASHBOARD_WIDGET_LABELS, DEFAULT_DASHBOARD_WIDGETS } from '@/lib/scheduling/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  const [widgets, setWidgets] = useState<DashboardWidgetPreference[]>(normalizeWidgets(initialWidgets))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const visibleWidgets = useMemo(() => widgets.filter((widget) => widget.enabled), [widgets])
  const hiddenWidgets = useMemo(() => widgets.filter((widget) => !widget.enabled), [widgets])

  const rebuildOrder = (nextWidgets: DashboardWidgetPreference[]) => {
    const visible = nextWidgets.filter((widget) => widget.enabled)
    const hidden = nextWidgets.filter((widget) => !widget.enabled)
    return [...visible, ...hidden]
  }

  const setWidgetEnabled = (widgetId: DashboardWidgetId, enabled: boolean) => {
    setWidgets((prev) =>
      rebuildOrder(prev.map((widget) => (widget.id === widgetId ? { ...widget, enabled } : widget)))
    )
    setSuccess(false)
    setError(null)
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enabled Widgets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-500">
              These widgets will show on your dashboard.
            </p>

            {visibleWidgets.length === 0 && (
              <p className="rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500">
                No enabled widgets. Turn widgets on from the disabled list.
              </p>
            )}

            {visibleWidgets.map((widget) => (
              <div
                key={widget.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 p-3"
              >
                <p className="text-sm font-medium text-stone-900">{DASHBOARD_WIDGET_LABELS[widget.id]}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setWidgetEnabled(widget.id, false)}
                >
                  Disable
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hidden Widgets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-500">
              Disabled widgets stay off until you turn them back on.
            </p>

            {hiddenWidgets.length === 0 && (
              <p className="rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500">
                All widgets are currently visible.
              </p>
            )}

            {hiddenWidgets.map((widget) => (
              <div
                key={widget.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 p-3"
              >
                <p className="text-sm font-medium text-stone-900">{DASHBOARD_WIDGET_LABELS[widget.id]}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setWidgetEnabled(widget.id, true)}
                >
                  Enable
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">Dashboard widget settings saved.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setWidgets(cloneDefaultWidgets())
            setSuccess(false)
            setError(null)
          }}
          disabled={isPending}
        >
          Reset to Default
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Layout'}
        </Button>
      </div>
    </form>
  )
}
