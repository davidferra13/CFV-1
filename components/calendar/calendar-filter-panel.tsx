'use client'

// CalendarFilterPanel — Pill toggle bar for filtering calendar categories.
// Includes built-in saved views (Calendar Sets) for one-click context switching.
// Saves filter state to localStorage keyed by a storage key (chef-scoped).
// Calls onFiltersChange whenever the user toggles a category.

import { useState, useEffect, useRef } from 'react'
import type { CalendarFilters } from '@/lib/calendar/constants'
import { DEFAULT_CALENDAR_FILTERS, BUILT_IN_VIEWS } from '@/lib/calendar/constants'

type Props = {
  storageKey: string
  onChange: (filters: CalendarFilters) => void
  initialFilters?: Partial<CalendarFilters>
}

type FilterDef = {
  key: keyof CalendarFilters
  label: string
  activeColor: string // tailwind bg class when active
  dotColor: string // hex dot to the left of label
}

const FILTER_DEFS: FilterDef[] = [
  {
    key: 'showEvents',
    label: 'Events',
    activeColor: 'bg-amber-900 text-amber-800 border-amber-300',
    dotColor: '#F59E0B',
  },
  {
    key: 'showDraftEvents',
    label: 'Drafts',
    activeColor: 'bg-yellow-900 text-yellow-800 border-yellow-300',
    dotColor: '#FDE68A',
  },
  {
    key: 'showPrepBlocks',
    label: 'Prep',
    activeColor: 'bg-green-900 text-green-800 border-green-300',
    dotColor: '#16A34A',
  },
  {
    key: 'showCalls',
    label: 'Calls',
    activeColor: 'bg-blue-900 text-blue-800 border-blue-300',
    dotColor: '#3B82F6',
  },
  {
    key: 'showPersonal',
    label: 'Personal',
    activeColor: 'bg-purple-900 text-purple-800 border-purple-300',
    dotColor: '#7C3AED',
  },
  {
    key: 'showBusiness',
    label: 'Business',
    activeColor: 'bg-teal-900 text-teal-800 border-teal-300',
    dotColor: '#0D9488',
  },
  {
    key: 'showIntentions',
    label: 'Goals',
    activeColor: 'bg-green-950 text-green-700 border-green-200',
    dotColor: '#4ADE80',
  },
  {
    key: 'showLeads',
    label: 'Leads',
    activeColor: 'bg-orange-900 text-orange-800 border-orange-300',
    dotColor: '#EA580C',
  },
]

export function CalendarFilterPanel({ storageKey, onChange, initialFilters }: Props) {
  // Use a ref to avoid the onChange callback causing re-render loops
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [filters, setFilters] = useState<CalendarFilters>(() => ({
    ...DEFAULT_CALENDAR_FILTERS,
    ...initialFilters,
  }))
  const [activeViewId, setActiveViewId] = useState<string | null>('full')

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        const merged = { ...DEFAULT_CALENDAR_FILTERS, ...parsed }
        setFilters(merged)
        onChangeRef.current(merged)
        // Check if stored filters match a built-in view
        const match = BUILT_IN_VIEWS.find((v) =>
          Object.keys(v.filters).every(
            (k) => v.filters[k as keyof CalendarFilters] === merged[k as keyof CalendarFilters]
          )
        )
        setActiveViewId(match?.id ?? null)
      }
    } catch {
      // ignore parse errors
    }
  }, [storageKey])

  function applyView(viewId: string) {
    const view = BUILT_IN_VIEWS.find((v) => v.id === viewId)
    if (!view) return
    setFilters(view.filters)
    setActiveViewId(viewId)
    try {
      localStorage.setItem(storageKey, JSON.stringify(view.filters))
    } catch {
      /* ignore */
    }
    onChange(view.filters)
  }

  function toggle(key: keyof CalendarFilters) {
    const next = { ...filters, [key]: !filters[key] }
    setFilters(next)
    setActiveViewId(null) // custom state — no longer matches any built-in view
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    onChange(next)
  }

  function reset() {
    setFilters(DEFAULT_CALENDAR_FILTERS)
    setActiveViewId('full')
    try {
      localStorage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
    onChange(DEFAULT_CALENDAR_FILTERS)
  }

  const allOn = Object.values(filters).every(Boolean)

  return (
    <div className="space-y-2">
      {/* View selector (Calendar Sets) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-stone-400 font-medium mr-0.5">View:</span>
        {BUILT_IN_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => applyView(view.id)}
            className={[
              'px-2.5 py-1 rounded-md border text-xs font-medium transition-all',
              activeViewId === view.id
                ? 'bg-stone-800 text-white border-stone-800'
                : 'bg-stone-900 text-stone-500 border-stone-700 hover:border-stone-400 hover:text-stone-300',
            ].join(' ')}
          >
            {view.name}
          </button>
        ))}
      </div>

      {/* Individual filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_DEFS.map((def) => {
          const active = filters[def.key]
          return (
            <button
              key={def.key}
              onClick={() => toggle(def.key)}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                active
                  ? def.activeColor
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700',
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
            type="button"
            onClick={reset}
            className="text-xs text-stone-400 hover:text-stone-400 underline ml-1"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
