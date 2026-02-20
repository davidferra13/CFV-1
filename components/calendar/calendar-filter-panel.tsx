'use client'

// CalendarFilterPanel — Pill toggle bar for filtering calendar categories.
// Saves filter state to localStorage keyed by a storage key (chef-scoped).
// Calls onFiltersChange whenever the user toggles a category.

import { useState, useEffect } from 'react'
import type { CalendarFilters } from '@/lib/calendar/constants'
import { DEFAULT_CALENDAR_FILTERS } from '@/lib/calendar/constants'

type Props = {
  storageKey: string
  onChange: (filters: CalendarFilters) => void
  initialFilters?: Partial<CalendarFilters>
}

type FilterDef = {
  key: keyof CalendarFilters
  label: string
  activeColor: string   // tailwind bg class when active
  dotColor: string      // hex dot to the left of label
}

const FILTER_DEFS: FilterDef[] = [
  { key: 'showEvents',      label: 'Events',    activeColor: 'bg-amber-100 text-amber-800 border-amber-300', dotColor: '#F59E0B' },
  { key: 'showDraftEvents', label: 'Drafts',    activeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300', dotColor: '#FDE68A' },
  { key: 'showPrepBlocks',  label: 'Prep',      activeColor: 'bg-green-100 text-green-800 border-green-300', dotColor: '#16A34A' },
  { key: 'showCalls',       label: 'Calls',     activeColor: 'bg-blue-100 text-blue-800 border-blue-300', dotColor: '#3B82F6' },
  { key: 'showPersonal',    label: 'Personal',  activeColor: 'bg-purple-100 text-purple-800 border-purple-300', dotColor: '#7C3AED' },
  { key: 'showBusiness',    label: 'Business',  activeColor: 'bg-teal-100 text-teal-800 border-teal-300', dotColor: '#0D9488' },
  { key: 'showIntentions',  label: 'Goals',     activeColor: 'bg-green-50 text-green-700 border-green-200', dotColor: '#4ADE80' },
  { key: 'showLeads',       label: 'Leads',     activeColor: 'bg-orange-100 text-orange-800 border-orange-300', dotColor: '#EA580C' },
]

export function CalendarFilterPanel({ storageKey, onChange, initialFilters }: Props) {
  const [filters, setFilters] = useState<CalendarFilters>(() => ({
    ...DEFAULT_CALENDAR_FILTERS,
    ...initialFilters,
  }))

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        const merged = { ...DEFAULT_CALENDAR_FILTERS, ...parsed }
        setFilters(merged)
        onChange(merged)
      }
    } catch {
      // ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  function toggle(key: keyof CalendarFilters) {
    const next = { ...filters, [key]: !filters[key] }
    setFilters(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch { /* ignore */ }
    onChange(next)
  }

  function reset() {
    setFilters(DEFAULT_CALENDAR_FILTERS)
    try {
      localStorage.removeItem(storageKey)
    } catch { /* ignore */ }
    onChange(DEFAULT_CALENDAR_FILTERS)
  }

  const allOn = Object.values(filters).every(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTER_DEFS.map(def => {
        const active = filters[def.key]
        return (
          <button
            key={def.key}
            onClick={() => toggle(def.key)}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
              active
                ? def.activeColor
                : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100',
            ].join(' ')}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: active ? def.dotColor : '#D1D5DB' }}
            />
            {def.label}
          </button>
        )
      })}
      {!allOn && (
        <button
          onClick={reset}
          className="text-xs text-stone-400 hover:text-stone-600 underline ml-1"
        >
          Reset
        </button>
      )}
    </div>
  )
}
