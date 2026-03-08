'use client'

import { useMemo, useState } from 'react'
import { X, Plus, Check, Search } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import {
  DASHBOARD_WIDGET_IDS,
  DASHBOARD_WIDGET_LABELS,
  DASHBOARD_WIDGET_META,
  WIDGET_CATEGORY_ORDER,
  WIDGET_CATEGORY_LABELS,
  WIDGET_CATEGORY_STYLES,
  getWidgetIcon,
  type DashboardWidgetId,
  type WidgetCategory,
} from '@/lib/scheduling/types'

interface Props {
  currentWidgets: string[]
  onAdd: (widgetIds: string[]) => void
  onClose: () => void
}

export function WidgetPickerModal({ currentWidgets, onAdd, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<WidgetCategory | 'all'>('all')

  const currentSet = useMemo(() => new Set(currentWidgets), [currentWidgets])

  // Group widgets by category
  const grouped = useMemo(() => {
    const groups: Record<WidgetCategory, DashboardWidgetId[]> = {
      today: [],
      actions: [],
      prep: [],
      money: [],
      clients: [],
      analytics: [],
      collaboration: [],
      system: [],
    }
    for (const id of DASHBOARD_WIDGET_IDS) {
      const meta = DASHBOARD_WIDGET_META[id]
      if (meta) groups[meta.category].push(id)
    }
    return groups
  }, [])

  // Filter by search + category
  const filteredGroups = useMemo(() => {
    const searchLower = search.toLowerCase()
    return WIDGET_CATEGORY_ORDER.filter((cat) => activeCategory === 'all' || activeCategory === cat)
      .map((cat) => ({
        category: cat,
        label: WIDGET_CATEGORY_LABELS[cat],
        style: WIDGET_CATEGORY_STYLES[cat],
        widgets: grouped[cat].filter((id) => {
          if (!search) return true
          const label = DASHBOARD_WIDGET_LABELS[id]?.toLowerCase() ?? ''
          return label.includes(searchLower) || id.includes(searchLower)
        }),
      }))
      .filter((g) => g.widgets.length > 0)
  }, [grouped, search, activeCategory])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAdd = () => {
    onAdd(Array.from(selected))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-stone-700 bg-stone-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Add Widgets</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Browse by category and pick the widgets you want on your dashboard.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search + category filter */}
        <div className="px-5 py-3 border-b border-stone-800 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search widgets..."
              className="w-full pl-9 pr-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-brand-600"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'all'
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              All
            </button>
            {WIDGET_CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat ? 'text-stone-100' : 'text-stone-500 hover:text-stone-300'
                }`}
                style={
                  activeCategory === cat
                    ? {
                        backgroundColor: WIDGET_CATEGORY_STYLES[cat].bg,
                        borderColor: WIDGET_CATEGORY_STYLES[cat].border,
                        borderWidth: 1,
                      }
                    : undefined
                }
              >
                {WIDGET_CATEGORY_STYLES[cat].icon} {WIDGET_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {filteredGroups.map(({ category, label, style, widgets }) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                {style.icon} {label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {widgets.map((widgetId) => {
                  const alreadyAdded = currentSet.has(widgetId)
                  const isSelected = selected.has(widgetId)
                  const icon = getWidgetIcon(widgetId)
                  const label = DASHBOARD_WIDGET_LABELS[widgetId] || widgetId

                  return (
                    <button
                      key={widgetId}
                      onClick={() => !alreadyAdded && toggleSelect(widgetId)}
                      disabled={alreadyAdded}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        alreadyAdded
                          ? 'opacity-40 cursor-not-allowed bg-stone-800/30'
                          : isSelected
                            ? 'bg-brand-600/15 border border-brand-600/50'
                            : 'hover:bg-stone-800 border border-transparent'
                      }`}
                    >
                      <span className="text-base shrink-0">{icon}</span>
                      <span className="text-sm text-stone-200 truncate flex-1">{label}</span>
                      {alreadyAdded ? (
                        <Check className="h-3.5 w-3.5 text-stone-600 shrink-0" />
                      ) : isSelected ? (
                        <Check className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-stone-600 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-stone-500">No widgets match your search.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-700">
          <p className="text-xs text-stone-500">
            {selected.size > 0 ? `${selected.size} selected` : 'Select widgets to add'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={selected.size === 0}>
              Add {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
