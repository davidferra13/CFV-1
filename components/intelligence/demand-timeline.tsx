/**
 * Demand Timeline
 *
 * Horizontal timeline showing ingredient needs by date.
 * Each day with an event shows a marker; ingredients are grouped by event.
 */

import type { IngredientDemandItem } from '@/lib/intelligence/ingredient-demand'

interface DemandTimelineProps {
  items: IngredientDemandItem[]
  dateRange: { start: string; end: string }
}

export function DemandTimeline({ items, dateRange }: DemandTimelineProps) {
  // Collect all unique event dates
  const eventDatesMap = new Map<string, { date: string; ingredients: string[]; eventCount: number }>()

  for (const item of items) {
    for (const evt of item.events) {
      const dateKey = evt.eventDate.slice(0, 10)
      if (!eventDatesMap.has(dateKey)) {
        eventDatesMap.set(dateKey, { date: dateKey, ingredients: [], eventCount: 0 })
      }
      const entry = eventDatesMap.get(dateKey)!
      if (!entry.ingredients.includes(item.ingredientName)) {
        entry.ingredients.push(item.ingredientName)
      }
      // Count unique events per date
      entry.eventCount = Math.max(
        entry.eventCount,
        items.reduce((max, i) => {
          const eventsOnDate = i.events.filter(e => e.eventDate.slice(0, 10) === dateKey)
          return Math.max(max, eventsOnDate.length)
        }, 0)
      )
    }
  }

  const eventDates = Array.from(eventDatesMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  if (eventDates.length === 0) return null

  const startMs = new Date(dateRange.start).getTime()
  const endMs = new Date(dateRange.end).getTime()
  const rangeMs = endMs - startMs || 1

  return (
    <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 p-4">
      <h3 className="text-sm font-semibold text-stone-300 mb-3">Ingredient Timeline</h3>

      {/* Timeline bar */}
      <div className="relative h-16 mb-2">
        {/* Track */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-stone-700 rounded-full" />

        {/* Event markers */}
        {eventDates.map((ed) => {
          const dateMs = new Date(ed.date).getTime()
          const pct = Math.max(2, Math.min(98, ((dateMs - startMs) / rangeMs) * 100))
          const ingredientCount = ed.ingredients.length
          // Scale marker size by ingredient count
          const size = Math.min(32, 16 + ingredientCount * 2)

          return (
            <div
              key={ed.date}
              className="absolute group"
              style={{ left: `${pct}%`, top: '6px', transform: 'translateX(-50%)' }}
            >
              {/* Marker */}
              <div
                className={`rounded-full border-2 border-stone-900 flex items-center justify-center text-xs font-bold ${
                  ingredientCount >= 10
                    ? 'bg-red-500 text-white'
                    : ingredientCount >= 5
                      ? 'bg-amber-500 text-stone-900'
                      : 'bg-emerald-500 text-stone-900'
                }`}
                style={{ width: `${size}px`, height: `${size}px` }}
              >
                {ingredientCount}
              </div>

              {/* Tooltip */}
              <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 w-48 bg-stone-800 border border-stone-600 rounded-lg p-2 shadow-lg">
                <p className="text-xs font-semibold text-stone-200 mb-1">
                  {new Date(ed.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-xs text-stone-400 mb-1">
                  {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''} needed
                </p>
                <div className="text-xs text-stone-500 max-h-20 overflow-y-auto">
                  {ed.ingredients.slice(0, 8).join(', ')}
                  {ed.ingredients.length > 8 && ` +${ed.ingredients.length - 8} more`}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Date labels */}
      <div className="flex justify-between text-xs text-stone-500">
        <span>
          {new Date(dateRange.start).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <span>
          {new Date(dateRange.end).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
    </div>
  )
}
