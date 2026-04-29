'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { universalSearch, type SearchResult } from '@/lib/search/universal-search'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { getPrimaryShortcutOptions } from '@/components/navigation/nav-config'
import { openRemy } from '@/lib/ai/remy-launch'
import {
  readSearchHistory,
  writeRecentSearch,
  type SearchHistoryEntry,
} from '@/lib/search/search-recents'

// ── Types ──────────────────────────────────────────────────────────

type PaletteItem = {
  id: string
  label: string
  sublabel?: string
  href?: string
  action?: () => void
  section: string
  icon?: string
}

// ── Static nav items (built once) ─────────────────────────────────

const NAV_ITEMS: PaletteItem[] = (() => {
  const options = getPrimaryShortcutOptions()
  return options.map((opt) => ({
    id: `nav:${opt.href}`,
    label: opt.label,
    sublabel: opt.context,
    href: opt.href,
    section: 'Pages',
    icon: '→',
  }))
})()

const QUICK_ACTIONS: PaletteItem[] = [
  {
    id: 'action:new-event',
    label: 'New Event',
    href: '/events/new',
    section: 'Quick Actions',
    icon: '+',
  },
  {
    id: 'action:new-menu',
    label: 'New Menu',
    href: '/menus/new',
    section: 'Quick Actions',
    icon: '+',
  },
  {
    id: 'action:new-client',
    label: 'New Client',
    href: '/clients/new',
    section: 'Quick Actions',
    icon: '+',
  },
  {
    id: 'action:new-quote',
    label: 'New Quote',
    href: '/quotes/new',
    section: 'Quick Actions',
    icon: '+',
  },
  {
    id: 'action:new-inquiry',
    label: 'New Inquiry',
    href: '/inquiries/new',
    section: 'Quick Actions',
    icon: '+',
  },
  {
    id: 'action:new-expense',
    label: 'New Expense',
    href: '/expenses/new',
    section: 'Quick Actions',
    icon: '+',
  },
  {
    id: 'action:new-recipe',
    label: 'New Recipe',
    href: '/recipes/new',
    section: 'Quick Actions',
    icon: '+',
  },
  {
    id: 'action:open-remy',
    label: 'Open Remy',
    section: 'Quick Actions',
    icon: '✦',
    action: () => openRemy(),
  },
  {
    id: 'action:return-catch-up',
    label: 'Ask Remy to catch me up',
    sublabel: 'Start the return-to-work briefing',
    section: 'Quick Actions',
    icon: '✦',
    action: () =>
      openRemy({
        prompt: 'Catch me up since I was away',
        source: 'command-palette-return-to-work',
        send: true,
      }),
  },
]

// ── Fuzzy match ───────────────────────────────────────────────────

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  // Check substring match first (fast path)
  if (lower.includes(q)) return true
  // Then fuzzy: every character of query appears in order
  let qi = 0
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++
  }
  return qi === q.length
}

function fuzzyScore(text: string, query: string): number {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  // Exact start = best
  if (lower.startsWith(q)) return 100
  // Word start match
  const words = lower.split(/[\s>/\-_]+/)
  if (words.some((w) => w.startsWith(q))) return 80
  // Substring
  if (lower.includes(q)) return 60
  // Fuzzy
  return 40
}

// ── Component ─────────────────────────────────────────────────────

export function CommandPalette({ userId, tenantId }: { userId: string; tenantId: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [dataResults, setDataResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [recents, setRecents] = useState<SearchHistoryEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const debouncedQuery = useDebounce(query, 250)

  // Load recents from localStorage when opening
  useEffect(() => {
    if (open) {
      setRecents(readSearchHistory(tenantId, userId))
    }
  }, [open, tenantId, userId])

  // Close on navigation
  useEffect(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [pathname])

  // Listen for open events
  useEffect(() => {
    const openPalette = () => {
      setOpen(true)
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        e.stopPropagation()
        openPalette()
      }
    }

    // Capture phase so we beat Remy's listener
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('open-search', openPalette)
    window.addEventListener('open-command-palette', openPalette)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('open-search', openPalette)
      window.removeEventListener('open-command-palette', openPalette)
    }
  }, [])

  // Fetch data results when query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setDataResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    universalSearch(debouncedQuery)
      .then((data) => setDataResults(data.results.filter((r) => r.type !== 'page')))
      .catch(() => setDataResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  // Build the visible items list
  const items = useMemo<PaletteItem[]>(() => {
    if (!query) {
      // No query: show recents (if any), then quick actions, then top nav items
      const recentItems: PaletteItem[] = recents.slice(0, 5).map((r) => ({
        id: `recent:${r.id}`,
        label: r.title,
        sublabel: r.snippet || r.type,
        href: r.url,
        section: 'Recent',
        icon: '↻',
      }))
      return [
        ...recentItems,
        ...QUICK_ACTIONS,
        ...NAV_ITEMS.slice(0, recentItems.length > 0 ? 10 : 15),
      ]
    }

    const matched: PaletteItem[] = []

    // Filter quick actions
    const matchedActions = QUICK_ACTIONS.filter(
      (item) => fuzzyMatch(item.label, query) || fuzzyMatch(item.sublabel || '', query)
    ).sort((a, b) => {
      const aScore = Math.max(fuzzyScore(a.label, query), fuzzyScore(a.sublabel || '', query))
      const bScore = Math.max(fuzzyScore(b.label, query), fuzzyScore(b.sublabel || '', query))
      return bScore - aScore
    })
    matched.push(...matchedActions)

    // Filter nav items
    const matchedNav = NAV_ITEMS.filter(
      (item) => fuzzyMatch(item.label, query) || fuzzyMatch(item.sublabel || '', query)
    )
      .sort((a, b) => {
        const aScore = Math.max(fuzzyScore(a.label, query), fuzzyScore(a.sublabel || '', query))
        const bScore = Math.max(fuzzyScore(b.label, query), fuzzyScore(b.sublabel || '', query))
        return bScore - aScore
      })
      .slice(0, 10)
    matched.push(...matchedNav)

    // Add data search results
    for (const result of dataResults) {
      matched.push({
        id: `data:${result.id}`,
        label: result.title,
        sublabel: result.snippet || result.type,
        href: result.url,
        section: result.type.charAt(0).toUpperCase() + result.type.slice(1) + 's',
        icon: '◆',
      })
    }

    return matched
  }, [query, dataResults, recents])

  // Group items by section
  const grouped = useMemo(() => {
    const groups: { section: string; items: PaletteItem[] }[] = []
    const map = new Map<string, PaletteItem[]>()
    for (const item of items) {
      const existing = map.get(item.section)
      if (existing) {
        existing.push(item)
      } else {
        const arr = [item]
        map.set(item.section, arr)
        groups.push({ section: item.section, items: arr })
      }
    }
    return groups
  }, [items])

  // Reset active index when items change
  useEffect(() => {
    setActiveIndex(0)
  }, [items.length])

  // Select an item
  const selectItem = useCallback(
    (item: PaletteItem) => {
      setOpen(false)
      setQuery('')
      // Record selection to recents (skip quick actions and nav-only items)
      if (item.href && !item.id.startsWith('action:') && !item.id.startsWith('nav:')) {
        const resultType = item.id.split(':')[0] as SearchResult['type']
        const resultId = item.id.replace(/^(data|recent):/, '')
        writeRecentSearch(
          tenantId,
          userId,
          {
            id: resultId,
            type: ([
              'client',
              'event',
              'inquiry',
              'menu',
              'recipe',
              'quote',
              'expense',
              'partner',
              'note',
              'message',
              'conversation',
            ].includes(resultType)
              ? resultType
              : 'page') as SearchResult['type'],
            title: item.label,
            snippet: item.sublabel,
            url: item.href,
          },
          item.href
        )
      }
      if (item.action) {
        item.action()
      } else if (item.href) {
        router.push(item.href)
      }
    },
    [router, tenantId, userId]
  )

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const active = listRef.current.querySelector('[data-active="true"]')
    if (active) {
      active.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, items.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = items[activeIndex]
        if (item) selectItem(item)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    },
    [activeIndex, items, selectItem]
  )

  if (!open) return null

  let flatIndex = -1

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg glass-heavy border border-stone-700 rounded-xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-800">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-stone-500 shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, actions, clients, events..."
            aria-label="Search pages, actions, clients, events"
            className="flex-1 bg-transparent text-sm text-stone-100 placeholder:text-stone-500 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-xxs font-mono text-stone-500 bg-stone-800 border border-stone-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2" role="listbox">
          {grouped.map((group) => (
            <div key={group.section}>
              <div className="px-4 py-1.5 text-xs-tight font-bold text-stone-500 uppercase tracking-wider">
                {group.section}
              </div>
              {group.items.map((item) => {
                flatIndex++
                const isActive = flatIndex === activeIndex
                const idx = flatIndex
                return (
                  <div
                    key={item.id}
                    data-active={isActive}
                    role="option"
                    aria-selected={isActive ? 'true' : 'false'}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-brand-600/20 text-stone-100'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold shrink-0 ${
                        item.icon === '+'
                          ? 'bg-brand-500/20 text-brand-400'
                          : item.icon === '✦'
                            ? 'bg-purple-500/20 text-purple-400'
                            : item.icon === '◆'
                              ? 'bg-amber-500/20 text-amber-400'
                              : item.icon === '↻'
                                ? 'bg-brand-500/20 text-brand-400'
                                : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {item.icon || '→'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.label}</div>
                      {item.sublabel && (
                        <div className="text-xs text-stone-500 truncate">{item.sublabel}</div>
                      )}
                    </div>
                    {isActive && (
                      <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-xxs font-mono text-stone-500 bg-stone-800 border border-stone-700">
                        ↵
                      </kbd>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {loading && <div className="px-4 py-3 text-sm text-stone-500">Searching...</div>}

          {!loading && query.length >= 2 && items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-stone-500">
              No results for &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-stone-800 text-xs-tight text-stone-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-stone-800 border border-stone-700 font-mono">
              ↑↓
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-stone-800 border border-stone-700 font-mono">
              ↵
            </kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-stone-800 border border-stone-700 font-mono">
              esc
            </kbd>
            close
          </span>
        </div>
      </div>
    </div>
  )
}
