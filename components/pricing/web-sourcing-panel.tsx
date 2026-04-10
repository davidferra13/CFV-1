'use client'

/**
 * WebSourcingPanel
 *
 * Shared component for all ingredient sourcing dead-ends.
 * When a catalog/substitution/shopping search returns nothing, this panel
 * fires a DuckDuckGo search filtered to trusted specialty retailers and
 * shows confirmed product pages inline.
 *
 * Usage: render when search has 2+ chars and returns no catalog results.
 * Falls back to static retailer deep-links if DDG returns nothing.
 *
 * Rule 0d (CLAUDE-ARCHITECTURE.md): every ingredient dead-end must use this.
 */

import { useState, useEffect } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { searchIngredientOnline, type SourcingResult } from '@/lib/pricing/web-sourcing-actions'

const STATIC_RETAILERS = [
  {
    name: 'Eataly',
    url: (q: string) => `https://www.eataly.com/us_en/search?q=${encodeURIComponent(q)}`,
    note: 'Italian specialty',
  },
  {
    name: 'Whole Foods',
    url: (q: string) => `https://www.wholefoodsmarket.com/search?q=${encodeURIComponent(q)}`,
    note: 'Specialty produce',
  },
  {
    name: 'Instacart',
    url: (q: string) =>
      `https://www.instacart.com/store/items/item_page?q=${encodeURIComponent(q)}`,
    note: 'Same-day delivery',
  },
  {
    name: 'Formaggio Kitchen',
    url: (q: string) => `https://www.formaggiokitchen.com/search?q=${encodeURIComponent(q)}`,
    note: 'Gourmet specialty',
  },
  {
    name: 'Amazon Fresh',
    url: (q: string) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&rh=n%3A16310101`,
    note: 'National delivery',
  },
]

interface WebSourcingPanelProps {
  query: string
  /** Optional label override. Defaults to "Not in catalog - sourcing search" */
  label?: string
}

export function WebSourcingPanel({ query, label }: WebSourcingPanelProps) {
  const [liveResults, setLiveResults] = useState<SourcingResult[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!query || query.length < 2) return
    let cancelled = false
    setIsSearching(true)
    setLiveResults(null)

    searchIngredientOnline(query)
      .then((res) => {
        if (cancelled) return
        setLiveResults(res.source === 'live' ? res.results : [])
      })
      .catch(() => {
        if (!cancelled) setLiveResults([])
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div className="bg-stone-900 rounded-lg border border-stone-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
          {label ?? 'Not in catalog - sourcing search'}
        </p>
        {isSearching && <Loader2 className="w-3.5 h-3.5 text-stone-500 animate-spin" />}
      </div>

      {/* Live results */}
      {liveResults && liveResults.length > 0 && (
        <div className="space-y-2 mb-3">
          {liveResults.map((result) => (
            <a
              key={result.url}
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between px-3 py-2.5 rounded-md bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-stone-600 transition-colors group"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-brand-400">{result.retailer}</span>
                </div>
                <p className="text-sm text-stone-200 group-hover:text-white truncate">
                  {result.title}
                </p>
                {result.description && (
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{result.description}</p>
                )}
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300 shrink-0 mt-1" />
            </a>
          ))}
        </div>
      )}

      {/* Static fallback */}
      {(!liveResults || liveResults.length === 0) && !isSearching && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          {STATIC_RETAILERS.map((retailer) => (
            <a
              key={retailer.name}
              href={retailer.url(query)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2.5 rounded-md bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-stone-600 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-stone-200 group-hover:text-white">
                  {retailer.name}
                </p>
                <p className="text-xs text-stone-500">{retailer.note}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300 shrink-0 ml-2" />
            </a>
          ))}
        </div>
      )}

      <p className="text-xs text-stone-600">
        Searching for: <span className="text-stone-400 italic">{query}</span>
      </p>
    </div>
  )
}
