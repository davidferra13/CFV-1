'use client'

import { type ReactNode, useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { useSearch, type UseSearchOptions } from '@/lib/shared/use-search'
import { searchFields, normalizeQuery } from '@/lib/shared/search-utils'
import { X, Search } from '@/components/ui/icons'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClientModeProps<T> = {
  /** The full dataset to filter client-side */
  items: T[]
  /** Fields to search across (keys of T) */
  searchFields: (keyof T)[]
  /** Server-side search callback; omit for client-side filtering */
  onSearch?: never
  /** Render filtered results */
  children: (filtered: T[], helpers: SearchRenderHelpers) => ReactNode
}

type ServerModeProps<T> = {
  /** Not used in server mode */
  items?: never
  /** Not used in server mode */
  searchFields?: never
  /** Server-side search callback, receives the debounced query */
  onSearch: (query: string) => void | Promise<void>
  /** Render content; items array is empty in server mode (parent manages data) */
  children: (items: T[], helpers: SearchRenderHelpers) => ReactNode
}

export type SearchRenderHelpers = {
  query: string
  isSearching: boolean
  clearSearch: () => void
  effectiveQuery: string
}

type SharedProps = {
  /** Placeholder text for the search input */
  placeholder?: string
  /** Element to render when search yields no results */
  emptyState?: ReactNode
  /** Loading skeleton to show while debounce is pending */
  loadingSkeleton?: ReactNode
  /** Extra classname on the wrapper div */
  className?: string
  /** Enable focus with '/' key (disabled by default) */
  slashFocus?: boolean
  /** Whether to show the search icon inside the input */
  showIcon?: boolean
} & UseSearchOptions

export type SearchableContentProps<T> = SharedProps & (ClientModeProps<T> | ServerModeProps<T>)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SearchableContent - Shared search input + results pattern.
 *
 * Two modes:
 * - **Client-side filtering**: pass `items` + `searchFields`, the component
 *   filters and passes results to `children`.
 * - **Server-side search**: pass `onSearch`, the component calls it with
 *   the debounced query and passes an empty array to `children` (parent
 *   manages its own data).
 *
 * @example Client-side
 * <SearchableContent
 *   items={recipes}
 *   searchFields={['name', 'method', 'category']}
 *   placeholder="Search recipes..."
 *   paramKey="q"
 *   emptyState={<NoResults />}
 * >
 *   {(filtered, { query }) => <RecipeGrid items={filtered} highlight={query} />}
 * </SearchableContent>
 *
 * @example Server-side
 * <SearchableContent
 *   onSearch={(q) => fetchRecipes(q)}
 *   placeholder="Search recipes..."
 *   paramKey="q"
 * >
 *   {(_, { query, isSearching }) => (
 *     isSearching ? <Skeleton /> : <RecipeGrid items={serverResults} />
 *   )}
 * </SearchableContent>
 */
export function SearchableContent<T extends Record<string, unknown>>(
  props: SearchableContentProps<T>
) {
  const {
    placeholder = 'Search...',
    emptyState,
    loadingSkeleton,
    className = '',
    slashFocus = false,
    showIcon = true,
    // UseSearchOptions
    paramKey,
    debounceMs,
    minLength,
    initialQuery,
    // Mode-specific
    items,
    searchFields: fields,
    onSearch,
    children,
  } = props

  const { query, setQuery, clearSearch, isSearching, effectiveQuery } = useSearch({
    paramKey,
    debounceMs,
    minLength,
    initialQuery,
  })

  const inputRef = useRef<HTMLInputElement>(null)

  // Slash-key focus
  useEffect(() => {
    if (!slashFocus) return

    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [slashFocus])

  // Server-side: call onSearch when effectiveQuery changes
  const prevQueryRef = useRef(effectiveQuery)
  useEffect(() => {
    if (!onSearch) return
    if (prevQueryRef.current === effectiveQuery) return
    prevQueryRef.current = effectiveQuery
    onSearch(effectiveQuery)
  }, [effectiveQuery, onSearch])

  // Client-side: filter items
  const filtered = useMemo(() => {
    if (!items || !fields) return [] as T[]
    if (!effectiveQuery) return items

    const q = normalizeQuery(effectiveQuery)
    if (!q) return items

    return items.filter((item) => searchFields(item, fields, q))
  }, [items, fields, effectiveQuery])

  const isClientMode = !!items
  const hasResults = isClientMode ? filtered.length > 0 : true
  const showEmpty = isClientMode && !hasResults && !!effectiveQuery && !isSearching
  const showLoading = isSearching && !!loadingSkeleton

  const helpers: SearchRenderHelpers = {
    query: effectiveQuery,
    isSearching,
    clearSearch,
    effectiveQuery,
  }

  return (
    <div className={className}>
      {/* Search input */}
      <div className="relative">
        {showIcon && (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 pointer-events-none" />
        )}
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Prevent iOS zoom on focus (font-size >= 16px)
          style={{ fontSize: '16px' }}
          className={`
            block w-full rounded-lg border border-stone-600 bg-stone-900
            py-2 text-stone-100 placeholder:text-stone-400
            transition-[border-color,box-shadow] duration-200
            hover:border-stone-500
            focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-500/20
            sm:text-sm sm:leading-6
            ${showIcon ? 'pl-9 pr-9' : 'px-3 pr-9'}
          `}
          aria-label={placeholder}
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {slashFocus && !query && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-stone-600 px-1.5 py-0.5 text-xs text-stone-500 font-mono">
            /
          </kbd>
        )}
      </div>

      {/* Results area */}
      {showLoading && <div className="mt-4">{loadingSkeleton}</div>}
      {showEmpty && emptyState && <div className="mt-4">{emptyState}</div>}
      {!showLoading && !showEmpty && (
        <div className="mt-0">{children(isClientMode ? filtered : ([] as T[]), helpers)}</div>
      )}
    </div>
  )
}
