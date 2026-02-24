'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Settings2, ArrowUp, ArrowDown } from 'lucide-react'
import { updateChefPreferences } from '@/lib/chef/actions'
import type { DashboardWidgetPreference } from '@/lib/scheduling/types'
import { DASHBOARD_WIDGET_LABELS } from '@/lib/scheduling/types'
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

  const visibleWidgets = useMemo(() => widgets.filter((widget) => widget.enabled), [widgets])

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
            <p className="text-sm font-semibold text-stone-100">Reorder Dashboard</p>
            <p className="text-xs text-stone-500">Use up/down to reorder visible widgets.</p>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {visibleWidgets.length === 0 && (
              <p className="rounded-md border border-dashed border-stone-600 p-3 text-xs text-stone-500">
                No visible widgets. Enable them in Settings.
              </p>
            )}

            {visibleWidgets.map((widget, index) => (
              <div
                key={widget.id}
                className="flex items-center justify-between gap-2 rounded-md border border-stone-700 p-2"
              >
                <p className="text-xs font-medium text-stone-200">
                  {DASHBOARD_WIDGET_LABELS[widget.id]}
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => moveVisibleWidget(index, 'up')}
                    className="h-7 px-2"
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
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

          <div className="mt-4 flex items-center justify-between gap-2">
            <Link
              href="/settings/dashboard"
              className="text-xs text-brand-600 hover:text-brand-400"
            >
              Manage widget visibility
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
