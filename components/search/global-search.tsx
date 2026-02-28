'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { universalSearch, type SearchResult } from '@/lib/search/universal-search'
import { useDebounce } from '@/lib/hooks/use-debounce'
import {
  readSearchHistory,
  togglePinnedSearch,
  writeRecentSearch,
  type SearchHistoryEntry,
} from '@/lib/search/search-recents'
import { applyStoredViewContext } from '@/lib/view-state/context-url'

type DisplayItem = SearchResult & {
  fromHistory?: boolean
  pinned?: boolean
}

const QUICK_CREATE_ACTIONS = [
  { label: 'New Event', href: '/events/new', icon: '+' },
  { label: 'New Client', href: '/clients/new', icon: '+' },
  { label: 'New Quote', href: '/quotes/new', icon: '+' },
  { label: 'New Inquiry', href: '/inquiries/new', icon: '+' },
  { label: 'New Expense', href: '/expenses/new', icon: '+' },
  { label: 'New Recipe', href: '/recipes/new', icon: '+' },
]

export function GlobalSearch({ userId, tenantId }: { userId: string; tenantId: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [grouped, setGrouped] = useState<Record<string, SearchResult[]>>({})
  const [history, setHistory] = useState<SearchHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const listboxId = 'global-search-results'
  const debouncedQuery = useDebounce(query, 300)
  const isSearching = debouncedQuery.length >= 2

  const openAndFocus = useCallback(() => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const refreshHistory = useCallback(() => {
    setHistory(readSearchHistory(tenantId, userId))
  }, [tenantId, userId])

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openAndFocus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openAndFocus])

  useEffect(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setGrouped({})
    setLoading(false)
    setHighlightedIndex(-1)
  }, [pathname])

  useEffect(() => {
    if (open) refreshHistory()
  }, [open, refreshHistory])

  useEffect(() => {
    if (!isSearching) {
      setResults([])
      setGrouped({})
      setLoading(false)
      return
    }

    setLoading(true)
    universalSearch(debouncedQuery)
      .then((data) => {
        setResults(data.results)
        setGrouped(data.grouped)
      })
      .catch(() => {
        setResults([])
        setGrouped({})
      })
      .finally(() => setLoading(false))
  }, [debouncedQuery, isSearching])

  const historyItems = useMemo<DisplayItem[]>(
    () =>
      history.map((entry) => ({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        snippet: entry.snippet,
        url: entry.url,
        metadata: entry.metadata,
        fromHistory: true,
        pinned: entry.pinned ?? false,
      })),
    [history]
  )

  const pinnedItems = useMemo(() => historyItems.filter((entry) => entry.pinned), [historyItems])
  const recentItems = useMemo(() => historyItems.filter((entry) => !entry.pinned), [historyItems])
  const flatSearchItems = useMemo(() => Object.values(grouped).flat(), [grouped])

  const matchingQuickActions = useMemo(() => {
    if (!query) return QUICK_CREATE_ACTIONS
    const q = query.toLowerCase()
    if (['new', 'create', 'add', '+'].some((kw) => q.includes(kw))) return QUICK_CREATE_ACTIONS
    return QUICK_CREATE_ACTIONS.filter((a) => a.label.toLowerCase().includes(q))
  }, [query])

  const displayItems = useMemo<DisplayItem[]>(
    () =>
      isSearching
        ? flatSearchItems.map((item) => ({
            ...item,
            pinned: Boolean(history.find((entry) => entry.id === item.id)?.pinned),
          }))
        : historyItems,
    [flatSearchItems, history, historyItems, isSearching]
  )

  const selectResult = useCallback(
    (item: SearchResult) => {
      const contextualUrl = applyStoredViewContext(item.url)
      writeRecentSearch(tenantId, userId, item, contextualUrl)
      refreshHistory()
      setOpen(false)
      setQuery('')
      setHighlightedIndex(-1)
      router.push(contextualUrl)
    },
    [refreshHistory, router, tenantId, userId]
  )

  const handleTogglePinned = useCallback(
    (itemId: string) => {
      setHistory(togglePinnedSearch(tenantId, userId, itemId))
    },
    [tenantId, userId]
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((i) => Math.min(i + 1, displayItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        const item = displayItems[highlightedIndex]
        if (item) selectResult(item)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    },
    [displayItems, highlightedIndex, selectResult]
  )

  function highlightText(text: string, q: string) {
    if (!q) return text
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = text.split(new RegExp(`(${escaped})`, 'ig'))
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <strong key={i} className="text-amber-600">
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    )
  }

  return (
    <div className="relative flex-shrink-0">
      <div className="relative z-50 flex items-center">
        <button
          onClick={openAndFocus}
          className="flex items-center justify-center w-8 h-8 hover:bg-stone-700 rounded-lg transition-colors"
          aria-label="Open search"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
        {open && (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search everything... (Ctrl/Cmd+K)"
            className="absolute right-0 top-full mt-1 w-[280px] px-3 py-2 rounded-lg border border-stone-700 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 bg-stone-900 shadow-lg"
            role="combobox"
            aria-controls={listboxId}
            aria-expanded={open}
            aria-autocomplete="list"
          />
        )}
      </div>

      {open && (
        <div
          id={listboxId}
          className="absolute top-[calc(100%+2.75rem)] right-0 w-[320px] max-w-[90vw] bg-stone-900 shadow-xl border border-stone-700 rounded-xl z-50 p-2"
          role="listbox"
        >
          {loading && (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-2 items-center">
                  <div className="w-10 h-10 bg-stone-800 rounded-md animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-stone-800 rounded w-1/2 animate-pulse" />
                    <div className="h-2 bg-stone-800 rounded w-1/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && isSearching && results.length === 0 && (
            <div className="p-5 text-center text-stone-400 text-sm">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {!loading && matchingQuickActions.length > 0 && (!isSearching || query.length < 2) && (
            <div className="mb-1">
              <div className="px-3 py-1.5 text-xs font-bold text-stone-500 uppercase tracking-wide">
                Quick Actions
              </div>
              {matchingQuickActions.map((action) => (
                <div
                  key={action.href}
                  role="option"
                  aria-selected="false"
                  onClick={() => {
                    setOpen(false)
                    setQuery('')
                    router.push(action.href)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-stone-800 transition-colors text-left cursor-pointer"
                >
                  <span className="w-6 h-6 flex items-center justify-center rounded-md bg-brand-500/20 text-brand-400 text-xs font-bold">
                    {action.icon}
                  </span>
                  <span className="text-sm text-stone-200">{action.label}</span>
                </div>
              ))}
            </div>
          )}

          {!loading &&
            !isSearching &&
            pinnedItems.length === 0 &&
            recentItems.length === 0 &&
            matchingQuickActions.length === 0 && (
              <div className="p-5 text-center text-stone-400 text-sm">No recent items yet.</div>
            )}

          {!loading && !isSearching && (pinnedItems.length > 0 || recentItems.length > 0) && (
            <>
              {pinnedItems.length > 0 ? (
                <div className="mb-1">
                  <div className="px-3 py-1.5 text-xs font-bold text-stone-500 uppercase tracking-wide">
                    Pinned
                  </div>
                  {pinnedItems.map((item) => {
                    const flatIndex = displayItems.findIndex((entry) => entry.id === item.id)
                    return (
                      <div
                        key={item.id}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          highlightedIndex === flatIndex ? 'bg-amber-950' : 'hover:bg-stone-800'
                        }`}
                        onMouseEnter={() => setHighlightedIndex(flatIndex)}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={highlightedIndex === flatIndex}
                          onClick={() => selectResult(item)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="text-sm font-semibold text-stone-200 truncate">
                            {item.title}
                          </div>
                          {item.snippet ? (
                            <div className="text-xs text-stone-500 truncate">{item.snippet}</div>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-amber-400 hover:text-amber-300"
                          onClick={() => handleTogglePinned(item.id)}
                          aria-label={`Unpin ${item.title}`}
                        >
                          Unpin
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {recentItems.length > 0 ? (
                <div className="mb-1">
                  <div className="px-3 py-1.5 text-xs font-bold text-stone-500 uppercase tracking-wide">
                    Recent
                  </div>
                  {recentItems.map((item) => {
                    const flatIndex = displayItems.findIndex((entry) => entry.id === item.id)
                    return (
                      <div
                        key={item.id}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          highlightedIndex === flatIndex ? 'bg-amber-950' : 'hover:bg-stone-800'
                        }`}
                        onMouseEnter={() => setHighlightedIndex(flatIndex)}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={highlightedIndex === flatIndex}
                          onClick={() => selectResult(item)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="text-sm font-semibold text-stone-200 truncate">
                            {item.title}
                          </div>
                          {item.snippet ? (
                            <div className="text-xs text-stone-500 truncate">{item.snippet}</div>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-stone-400 hover:text-stone-300"
                          onClick={() => handleTogglePinned(item.id)}
                          aria-label={`Pin ${item.title}`}
                        >
                          Pin
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </>
          )}

          {!loading &&
            isSearching &&
            Object.entries(grouped).map(([section, items]) => (
              <div key={section} className="mb-1">
                <div className="px-3 py-1.5 text-xs font-bold text-stone-500 uppercase tracking-wide">
                  {section}
                </div>
                {items.map((item) => {
                  const flatIndex = flatSearchItems.findIndex((entry) => entry.id === item.id)
                  const isPinned = Boolean(displayItems[flatIndex]?.pinned)
                  return (
                    <div
                      key={item.id}
                      className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                        highlightedIndex === flatIndex ? 'bg-amber-950' : 'hover:bg-stone-800'
                      }`}
                      onMouseEnter={() => setHighlightedIndex(flatIndex)}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={highlightedIndex === flatIndex}
                        onClick={() => selectResult(item)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="text-sm font-semibold text-stone-200 truncate">
                          {highlightText(item.title, query)}
                        </div>
                        {item.snippet && (
                          <div className="text-xs text-stone-500 truncate">
                            {highlightText(item.snippet, query)}
                          </div>
                        )}
                      </button>
                      {item.metadata?.badge && (
                        <span className="ml-2 text-xs text-stone-400">{item.metadata.badge}</span>
                      )}
                      <button
                        type="button"
                        className={`ml-2 text-xs ${isPinned ? 'text-amber-400' : 'text-stone-500 hover:text-stone-300'}`}
                        onClick={() => handleTogglePinned(item.id)}
                        aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${item.title}`}
                      >
                        {isPinned ? 'Unpin' : 'Pin'}
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
        </div>
      )}

      {open && <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />}
    </div>
  )
}
