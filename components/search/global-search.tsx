'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { universalSearch, type SearchResult } from '@/lib/search/universal-search'
import { useDebounce } from '@/lib/hooks/use-debounce'

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [grouped, setGrouped] = useState<Record<string, SearchResult[]>>({})
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const listboxId = 'global-search-results'
  const debouncedQuery = useDebounce(query, 300)

  const openAndFocus = useCallback(() => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

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
    if (!debouncedQuery || debouncedQuery.length < 2) {
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
  }, [debouncedQuery])

  const selectResult = useCallback(
    (item: SearchResult) => {
      setOpen(false)
      setQuery('')
      setHighlightedIndex(-1)
      router.push(item.url)
    },
    [router]
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const flat = Object.values(grouped).flat()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((i) => Math.min(i + 1, flat.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        const item = flat[highlightedIndex]
        if (item) selectResult(item)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    },
    [highlightedIndex, grouped, selectResult]
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
          className="flex items-center justify-center w-8 h-8 hover:bg-stone-100 rounded-lg transition-colors"
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
            className="absolute right-0 top-full mt-1 w-[280px] px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 bg-white shadow-lg"
            role="combobox"
            aria-controls={listboxId}
            aria-expanded={open}
            aria-autocomplete="list"
          />
        )}
      </div>

      {open && query.length >= 2 && (
        <div
          id={listboxId}
          className="absolute top-[calc(100%+2.75rem)] right-0 w-[320px] max-w-[90vw] bg-white shadow-xl border border-stone-200 rounded-xl z-50 p-2"
          role="listbox"
        >
          {loading && (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-2 items-center">
                  <div className="w-10 h-10 bg-stone-100 rounded-md animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-stone-100 rounded w-1/2 animate-pulse" />
                    <div className="h-2 bg-stone-100 rounded w-1/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="p-5 text-center text-stone-400 text-sm">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {!loading &&
            Object.entries(grouped).map(([section, items]) => {
              const flatAll = Object.values(grouped).flat()
              return (
                <div key={section} className="mb-1">
                  <div className="px-3 py-1.5 text-xs font-bold text-stone-500 uppercase tracking-wide">
                    {section}
                  </div>
                  {items.map((item) => {
                    const flatIndex = flatAll.findIndex((f) => f.id === item.id)
                    return (
                      <button
                        key={item.id}
                        role="option"
                        aria-selected={highlightedIndex === flatIndex}
                        onMouseEnter={() => setHighlightedIndex(flatIndex)}
                        onClick={() => selectResult(item)}
                        className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                          highlightedIndex === flatIndex ? 'bg-amber-50' : 'hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-stone-800 truncate">
                            {highlightText(item.title, query)}
                          </div>
                          {item.snippet && (
                            <div className="text-xs text-stone-500 truncate">
                              {highlightText(item.snippet, query)}
                            </div>
                          )}
                        </div>
                        {item.metadata?.badge && (
                          <span className="ml-2 text-xs text-stone-400">{item.metadata.badge}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
        </div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}
