'use client'

import type { ShoppingConsolidation } from '@/lib/intelligence/bulk-buy'

interface Props {
  consolidation: ShoppingConsolidation
}

export function ConsolidatedShoppingList({ consolidation }: Props) {
  if (consolidation.items.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/40 p-6 text-center">
        <p className="text-stone-400 text-sm">No ingredients to consolidate.</p>
        <p className="text-stone-500 text-xs mt-1">
          Add menus with recipes to your events, then check back.
        </p>
      </div>
    )
  }

  // Group by store section
  const sections = new Map<string, typeof consolidation.items>()
  for (const item of consolidation.items) {
    const section = item.storeSection
    if (!sections.has(section)) sections.set(section, [])
    sections.get(section)!.push(item)
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between text-sm text-stone-400">
        <span>
          {consolidation.totalItems} items across {consolidation.eventsCovered} events
        </span>
        <span>
          {consolidation.dateRange.start} to {consolidation.dateRange.end}
        </span>
      </div>

      {/* Sections */}
      {[...sections.entries()].map(([sectionName, items]) => (
        <div
          key={sectionName}
          className="rounded-lg border border-stone-700/50 bg-stone-900/60 overflow-hidden"
        >
          {/* Section header */}
          <div className="px-4 py-2.5 bg-stone-800/40 border-b border-stone-700/30">
            <span className="text-sm font-semibold text-stone-200">{sectionName}</span>
            <span className="text-xs text-stone-500 ml-2">({items.length})</span>
          </div>

          {/* Items */}
          <div className="divide-y divide-stone-800/40">
            {items.map((item) => (
              <div
                key={item.ingredientId}
                className="px-4 py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-100">{item.ingredientName}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.events.map((event) => (
                      <span
                        key={event.eventId}
                        className="inline-flex items-center text-xs text-stone-400 bg-stone-800/60 rounded px-1.5 py-0.5"
                      >
                        {event.eventName}
                        <span className="text-stone-500 ml-1">
                          ({event.quantity} {item.unit})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-stone-100">
                    {item.totalQuantity} {item.unit}
                  </p>
                  {item.eventCount > 1 && (
                    <p className="text-xs text-emerald-400">{item.eventCount} events</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
