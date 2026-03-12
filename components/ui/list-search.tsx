'use client'

import { useState, useMemo, useCallback, type ReactNode } from 'react'

interface ListSearchProps<T> {
  items: T[]
  searchKeys: (keyof T)[]
  placeholder?: string
  children: (filteredItems: T[], searchQuery: string) => ReactNode
  categoryKey?: keyof T
  categoryOptions?: string[]
  categoryLabel?: string
}

/**
 * Reusable client-side search + optional category filter for list pages.
 * Wraps any list with a debounce-free search input and renders children
 * with filtered items.
 *
 * Usage:
 *   <ListSearch items={recipes} searchKeys={['name', 'category']} placeholder="Search recipes...">
 *     {(filtered) => <RecipeTable items={filtered} />}
 *   </ListSearch>
 */
export function ListSearch<T extends Record<string, any>>({
  items,
  searchKeys,
  placeholder = 'Search...',
  children,
  categoryKey,
  categoryOptions,
  categoryLabel = 'Category',
}: ListSearchProps<T>) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const filtered = useMemo(() => {
    let result = items

    // Category filter
    if (selectedCategory && categoryKey) {
      result = result.filter((item) => {
        const val = String(item[categoryKey] ?? '').toLowerCase()
        return val === selectedCategory.toLowerCase()
      })
    }

    // Text search
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      result = result.filter((item) =>
        searchKeys.some((key) => {
          const val = item[key]
          if (val == null) return false
          return String(val).toLowerCase().includes(q)
        })
      )
    }

    return result
  }, [items, query, selectedCategory, searchKeys, categoryKey])

  // Derive category options from data if not provided
  const categories = useMemo(() => {
    if (categoryOptions) return categoryOptions
    if (!categoryKey) return []
    const set = new Set<string>()
    for (const item of items) {
      const val = item[categoryKey]
      if (val != null && String(val).trim()) {
        set.add(String(val))
      }
    }
    return Array.from(set).sort()
  }, [items, categoryKey, categoryOptions])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx={11} cy={11} r={8} />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {categoryKey && categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All {categoryLabel}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        )}

        {(query || selectedCategory) && (
          <span className="self-center text-xs text-stone-500">
            {filtered.length} of {items.length}
          </span>
        )}
      </div>

      {children(filtered, query)}
    </div>
  )
}
