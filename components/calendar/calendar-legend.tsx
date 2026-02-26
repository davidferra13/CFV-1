'use client'

// CalendarLegend — Collapsible color legend for all calendar views.
// Groups legend entries by category.

import { useState } from 'react'
import { CALENDAR_LEGEND } from '@/lib/calendar/colors'
import type { CalendarCategory } from '@/lib/calendar/colors'

const CATEGORY_LABELS: Record<CalendarCategory, string> = {
  events: 'Events',
  prep: 'Prep',
  calls: 'Calls',
  personal: 'Personal',
  business: 'Business',
  intentions: 'Goals & Intentions',
  leads: 'Leads',
}

export function CalendarLegend() {
  const [open, setOpen] = useState(false)

  const grouped = CALENDAR_LEGEND.reduce(
    (acc, entry) => {
      if (!acc[entry.category]) acc[entry.category] = []
      acc[entry.category].push(entry)
      return acc
    },
    {} as Record<CalendarCategory, typeof CALENDAR_LEGEND>
  )

  const categories = Object.keys(grouped) as CalendarCategory[]

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
      >
        <span>Color Legend</span>
        <span className="text-stone-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="space-y-1">
                {grouped[cat].map((entry) => (
                  <div key={entry.label} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: entry.color,
                        border:
                          entry.borderStyle && entry.borderStyle !== 'solid'
                            ? `2px ${entry.borderStyle} ${entry.color}`
                            : 'none',
                        opacity: entry.borderStyle && entry.borderStyle !== 'solid' ? 0.6 : 1,
                      }}
                    />
                    <span className="text-xs text-stone-600">{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
