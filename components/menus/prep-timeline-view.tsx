'use client'

import { useEffect, useState } from 'react'
import { getMenuPrepTimeline } from '@/lib/menus/actions'
import type { PrepTimelineSlot } from '@/lib/menus/actions'

type Props = {
  menuId: string
}

export function PrepTimelineView({ menuId }: Props) {
  const [timeline, setTimeline] = useState<PrepTimelineSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getMenuPrepTimeline(menuId)
        if (!cancelled) setTimeline(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load prep timeline')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [menuId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-stone-500 text-sm">
        Loading prep timeline...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-950 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    )
  }

  if (timeline.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-700 px-4 py-8 text-center text-sm text-stone-500">
        No components have prep timeline data yet. Assign prep day and time to components to build
        the timeline.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {timeline.map((day) => (
        <DaySection key={day.dayOffset} day={day} />
      ))}
    </div>
  )
}

function DaySection({ day }: { day: PrepTimelineSlot }) {
  // Group components by time of day
  const byTime = new Map<string, PrepTimelineSlot['components']>()
  for (const comp of day.components) {
    const key = comp.timeLabel
    const arr = byTime.get(key) || []
    arr.push(comp)
    byTime.set(key, arr)
  }

  const timeGroups = Array.from(byTime.entries())

  return (
    <section>
      <h3 className="text-lg font-semibold text-stone-100 mb-3">{day.dayLabel}</h3>

      <div className="space-y-4">
        {timeGroups.map(([timeLabel, components]) => (
          <div key={timeLabel}>
            <h4 className="text-sm text-stone-400 font-medium mb-2 pl-1">{timeLabel}</h4>

            <div className="space-y-1.5">
              {components.map((comp) => (
                <ComponentItem key={comp.id} component={comp} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ComponentItem({ component }: { component: PrepTimelineSlot['components'][number] }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm">
      <span className="font-medium text-stone-200 truncate">{component.name}</span>

      <span className="shrink-0 rounded-full bg-stone-800 px-2 py-0.5 text-xs text-stone-400">
        {component.category}
      </span>

      {component.station && (
        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-200">
          {component.station}
        </span>
      )}

      {(component.dishName || component.courseName) && (
        <span className="ml-auto shrink-0 text-xs text-stone-500 truncate max-w-[200px]">
          {component.courseName && component.dishName
            ? `${component.courseName} / ${component.dishName}`
            : component.courseName || component.dishName}
        </span>
      )}
    </div>
  )
}
