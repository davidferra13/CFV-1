'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp } from '@/components/ui/icons'
import { updateClientDashboardPreferences } from '@/lib/client-dashboard/actions'
import type {
  ClientDashboardWidgetId,
  ClientDashboardWidgetPreference,
} from '@/lib/client-dashboard/types'
import {
  CLIENT_DASHBOARD_WIDGET_DESCRIPTIONS,
  CLIENT_DASHBOARD_WIDGET_LABELS,
  DEFAULT_CLIENT_DASHBOARD_WIDGETS,
} from '@/lib/client-dashboard/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function cloneDefaultWidgets(): ClientDashboardWidgetPreference[] {
  return DEFAULT_CLIENT_DASHBOARD_WIDGETS.map((widget) => ({ ...widget }))
}

function normalizeWidgets(
  widgets: ClientDashboardWidgetPreference[]
): ClientDashboardWidgetPreference[] {
  if (!widgets.length) return cloneDefaultWidgets()
  return widgets.map((widget) => ({ ...widget }))
}

export function ClientDashboardLayoutForm({
  initialWidgets,
}: {
  initialWidgets: ClientDashboardWidgetPreference[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [widgets, setWidgets] = useState<ClientDashboardWidgetPreference[]>(
    normalizeWidgets(initialWidgets)
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const visibleWidgets = useMemo(() => widgets.filter((widget) => widget.enabled), [widgets])
  const hiddenWidgets = useMemo(() => widgets.filter((widget) => !widget.enabled), [widgets])

  const rebuildOrder = (nextWidgets: ClientDashboardWidgetPreference[]) => {
    const visible = nextWidgets.filter((widget) => widget.enabled)
    const hidden = nextWidgets.filter((widget) => !widget.enabled)
    return [...visible, ...hidden]
  }

  const setWidgetEnabled = (widgetId: ClientDashboardWidgetId, enabled: boolean) => {
    setWidgets((prev) =>
      rebuildOrder(prev.map((widget) => (widget.id === widgetId ? { ...widget, enabled } : widget)))
    )
    setSuccess(false)
    setError(null)
  }

  const moveVisibleWidget = (index: number, direction: 'up' | 'down') => {
    setWidgets((prev) => {
      const visible = prev.filter((widget) => widget.enabled)
      const hidden = prev.filter((widget) => !widget.enabled)
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= visible.length) return prev

      const nextVisible = [...visible]
      const [moved] = nextVisible.splice(index, 1)
      nextVisible.splice(target, 0, moved)
      return [...nextVisible, ...hidden]
    })
    setSuccess(false)
    setError(null)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSuccess(false)
    setError(null)

    startTransition(async () => {
      try {
        await updateClientDashboardPreferences({ dashboard_widgets: widgets })
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
            <p className="text-sm text-stone-500">These widgets will show on your dashboard.</p>

            {visibleWidgets.length === 0 && (
              <p className="rounded-md border border-dashed border-stone-600 p-3 text-sm text-stone-500">
                No enabled widgets. Turn widgets on from the disabled list.
              </p>
            )}

            {visibleWidgets.map((widget, index) => (
              <div
                key={widget.id}
                data-widget-id={widget.id}
                data-widget-state="enabled"
                className="flex items-start justify-between gap-3 rounded-lg border border-stone-700 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-stone-100">
                    {CLIENT_DASHBOARD_WIDGET_LABELS[widget.id]}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {CLIENT_DASHBOARD_WIDGET_DESCRIPTIONS[widget.id]}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => moveVisibleWidget(index, 'up')}
                    className="h-7 px-2"
                    aria-label={`Move ${CLIENT_DASHBOARD_WIDGET_LABELS[widget.id]} up`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === visibleWidgets.length - 1}
                    onClick={() => moveVisibleWidget(index, 'down')}
                    className="h-7 px-2"
                    aria-label={`Move ${CLIENT_DASHBOARD_WIDGET_LABELS[widget.id]} down`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setWidgetEnabled(widget.id, false)}
                  >
                    Disable
                  </Button>
                </div>
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
              <p className="rounded-md border border-dashed border-stone-600 p-3 text-sm text-stone-500">
                All widgets are currently visible.
              </p>
            )}

            {hiddenWidgets.map((widget) => (
              <div
                key={widget.id}
                data-widget-id={widget.id}
                data-widget-state="hidden"
                className="flex items-start justify-between gap-3 rounded-lg border border-stone-700 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-stone-100">
                    {CLIENT_DASHBOARD_WIDGET_LABELS[widget.id]}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {CLIENT_DASHBOARD_WIDGET_DESCRIPTIONS[widget.id]}
                  </p>
                </div>
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
        <div className="rounded-lg border border-red-200 bg-red-950 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-950 p-4">
          <p className="text-sm text-green-200">Dashboard widget settings saved.</p>
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
