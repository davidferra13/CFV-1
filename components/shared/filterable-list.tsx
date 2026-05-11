'use client'

import { ReactNode, useState, useCallback, useMemo } from 'react'
import {
  useFilterableList,
  applyFilters,
  type FilterableListConfig,
  type FilterDimension,
  type FilterableListResult,
  type FilterPreset,
} from '@/lib/shared/use-filterable-list'

// ============================================
// FILTER BAR
// ============================================

function FilterPill({
  label,
  active,
  onClick,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 touch-manipulation min-h-[36px] ${
        active
          ? 'bg-brand-600 text-white shadow-sm'
          : 'bg-stone-800/80 text-stone-400 border border-stone-600/60 hover:bg-stone-700/80 hover:text-stone-200 hover:border-stone-500'
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full ${
            active ? 'bg-brand-500/40 text-white' : 'bg-stone-700 text-stone-400'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
        className="w-full pl-9 pr-3 py-2 text-sm bg-stone-800/60 border border-stone-600/60 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 min-h-[36px]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

function SingleSelectDimension({
  dimension,
  value,
  onChange,
}: {
  dimension: FilterDimension
  value: string
  onChange: (v: string) => void
}) {
  const options = dimension.options || []
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => (
        <FilterPill
          key={opt.value}
          label={opt.label}
          active={value === opt.value}
          onClick={() => onChange(value === opt.value ? '' : opt.value)}
          count={opt.count}
        />
      ))}
    </div>
  )
}

function MultiSelectDimension({
  dimension,
  values,
  onToggle,
}: {
  dimension: FilterDimension
  values: string[]
  onToggle: (v: string) => void
}) {
  const options = dimension.options || []
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => (
        <FilterPill
          key={opt.value}
          label={opt.label}
          active={values.includes(opt.value)}
          onClick={() => onToggle(opt.value)}
          count={opt.count}
        />
      ))}
    </div>
  )
}

// ============================================
// FILTER BAR COMPONENT
// ============================================

export function FilterBar({
  filterState,
  className = '',
}: {
  filterState: FilterableListResult
  className?: string
}) {
  const { config, filters, setFilter, toggleValue, clearFilters, activeCount } = filterState
  const [mobileOpen, setMobileOpen] = useState(false)

  const dimensions = config.dimensions
  const presets = config.presets

  // Separate text dimensions (render as search) from select dimensions (render as pills)
  const textDimensions = dimensions.filter((d) => d.type === 'text')
  const selectDimensions = dimensions.filter((d) => d.type !== 'text' && d.type !== 'date-range')

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mobile toggle */}
      {selectDimensions.length > 0 && (
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200 sm:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="4" y1="21" y2="14" />
            <line x1="4" x2="4" y1="10" y2="3" />
            <line x1="12" x2="12" y1="21" y2="12" />
            <line x1="12" x2="12" y1="8" y2="3" />
            <line x1="20" x2="20" y1="21" y2="16" />
            <line x1="20" x2="20" y1="12" y2="3" />
            <line x1="2" x2="6" y1="14" y2="14" />
            <line x1="10" x2="14" y1="8" y2="8" />
            <line x1="18" x2="22" y1="16" y2="16" />
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </button>
      )}

      {/* Filter content */}
      <div
        className={`space-y-3 ${selectDimensions.length > 0 ? (mobileOpen ? 'block' : 'hidden sm:block') : ''}`}
      >
        {/* Presets */}
        {presets && presets.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-stone-500 mr-1">Quick:</span>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => filterState.applyPreset(preset)}
                className="text-xs px-2 py-1 rounded-md bg-stone-800/50 text-stone-400 border border-stone-700/50 hover:bg-stone-700/60 hover:text-stone-200 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* Select dimensions */}
        {selectDimensions.map((dim) => {
          if (dim.type === 'single-select') {
            return (
              <div key={dim.key}>
                {selectDimensions.length > 1 && (
                  <label className="text-xs text-stone-500 mb-1 block">{dim.label}</label>
                )}
                <SingleSelectDimension
                  dimension={dim}
                  value={(filters[dim.key] as string) || ''}
                  onChange={(v) => setFilter(dim.key, v)}
                />
              </div>
            )
          }
          if (dim.type === 'multi-select') {
            return (
              <div key={dim.key}>
                {selectDimensions.length > 1 && (
                  <label className="text-xs text-stone-500 mb-1 block">{dim.label}</label>
                )}
                <MultiSelectDimension
                  dimension={dim}
                  values={((filters[dim.key] as string[] | string) || []) as string[]}
                  onToggle={(v) => toggleValue(dim.key, v)}
                />
              </div>
            )
          }
          return null
        })}

        {/* Text search dimensions */}
        {textDimensions.map((dim) => (
          <SearchInput
            key={dim.key}
            value={(filters[dim.key] as string) || ''}
            onChange={(v) => setFilter(dim.key, v)}
            placeholder={dim.placeholder || `Search by ${dim.label.toLowerCase()}...`}
          />
        ))}

        {/* Clear all */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================
// FULL FILTERABLE LIST COMPONENT
// ============================================

type FilterableListProps<T> = {
  /** Configuration for filter dimensions, presets, persistence */
  config: FilterableListConfig
  /** The data to filter (client-side filtering) */
  items: T[]
  /** How to match each filter dimension against an item */
  matchers: Record<string, (item: T, value: unknown) => boolean>
  /** Render each item */
  renderItem: (item: T, index: number) => ReactNode
  /** Render empty state when no items match */
  renderEmpty?: (hasActiveFilters: boolean) => ReactNode
  /** Optional header content (rendered between filter bar and list) */
  header?: ReactNode
  /** Additional class for the list container */
  className?: string
  /** Additional class for the items container */
  listClassName?: string
}

export function FilterableList<T>({
  config,
  items,
  matchers,
  renderItem,
  renderEmpty,
  header,
  className = '',
  listClassName = 'space-y-2',
}: FilterableListProps<T>) {
  const filterState = useFilterableList(config)
  const { filters } = filterState

  const filteredItems = useMemo(
    () => applyFilters(items, filters, matchers),
    [items, filters, matchers]
  )

  return (
    <div className={className}>
      <FilterBar filterState={filterState} />

      {header}

      {filteredItems.length === 0 ? (
        renderEmpty ? (
          renderEmpty(filterState.activeCount > 0)
        ) : (
          <div className="rounded-xl border border-stone-700/40 bg-[var(--surface-2)] p-8 text-center mt-4">
            <p className="text-stone-500">
              {filterState.activeCount > 0
                ? 'No items match the current filters.'
                : 'No items yet.'}
            </p>
            {filterState.activeCount > 0 && (
              <button
                type="button"
                onClick={filterState.clearFilters}
                className="text-sm text-brand-400 hover:text-brand-300 mt-2"
              >
                Clear filters
              </button>
            )}
          </div>
        )
      ) : (
        <div className={`${listClassName} mt-4`}>
          {filteredItems.map((item, i) => renderItem(item, i))}
        </div>
      )}
    </div>
  )
}
