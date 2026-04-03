'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NonprofitBadge } from './nonprofit-badge'
import { browseNonprofits } from '@/lib/charity/propublica-actions'
import { NTEE_CATEGORIES, US_STATES } from '@/lib/charity/hours-types'
import type { ProPublicaNonprofit } from '@/lib/charity/hours-types'
import { Search, MapPin, ChevronDown } from '@/components/ui/icons'

function formatIncome(income: number): string {
  if (income >= 1_000_000_000) return `$${(income / 1_000_000_000).toFixed(1)}B`
  if (income >= 1_000_000) return `$${(income / 1_000_000).toFixed(1)}M`
  if (income >= 1_000) return `$${(income / 1_000).toFixed(0)}K`
  if (income > 0) return `$${income}`
  return ''
}

export function NonprofitSearch() {
  const [state, setState] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<ProPublicaNonprofit[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [searched, setSearched] = useState(false)
  const [pending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(
    (stateCode: string, nteeId: number | null, q: string, pg: number, append: boolean) => {
      if (!stateCode) return
      startTransition(async () => {
        try {
          const { results: newResults, hasMore: more } = await browseNonprofits(
            stateCode,
            nteeId ?? undefined,
            q || undefined,
            pg
          )
          setResults((prev) => (append ? [...prev, ...newResults] : newResults))
          setHasMore(more)
          setPage(pg)
          setSearched(true)
        } catch {
          setResults([])
          setHasMore(false)
          setSearched(true)
        }
      })
    },
    []
  )

  function handleStateChange(newState: string) {
    setState(newState)
    if (newState) doSearch(newState, selectedCategory, keyword, 0, false)
  }

  function handleCategoryClick(id: number) {
    const next = selectedCategory === id ? null : id
    setSelectedCategory(next)
    if (state) doSearch(state, next, keyword, 0, false)
  }

  function handleKeywordChange(value: string) {
    setKeyword(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (state) doSearch(state, selectedCategory, value, 0, false)
    }, 500)
  }

  function handleLoadMore() {
    doSearch(state, selectedCategory, keyword, page + 1, true)
  }

  function handleSelect(np: ProPublicaNonprofit) {
    // Fill the log form via the global handler (set by CharityHourForm)
    if (typeof window !== 'undefined' && (window as any).__charityHourFormFill) {
      ;(window as any).__charityHourFormFill({
        name: np.name,
        city: np.city,
        state: np.state,
        ein: np.ein,
      })
      // Scroll to form
      document.getElementById('charity-hour-form')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-medium text-stone-300 flex items-center gap-2 mb-4">
        <Search className="w-4 h-4" />
        Browse verified organizations
      </h2>

      {/* State dropdown */}
      <div className="mb-3">
        <label className="text-xs text-stone-500 mb-1 block">State</label>
        <div className="relative">
          <select
            value={state}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full appearance-none rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8"
          >
            <option value="">Select a state...</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
        </div>
      </div>

      {/* NTEE Category chips */}
      <div className="mb-3">
        <label className="text-xs text-stone-500 mb-1 block">Category</label>
        <div className="flex flex-wrap gap-1.5">
          {NTEE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keyword search */}
      {state && (
        <div className="mb-4">
          <label className="text-xs text-stone-500 mb-1 block">Search by name (optional)</label>
          <Input
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            placeholder="e.g. Harrison Food Pantry"
          />
        </div>
      )}

      {/* Results */}
      {pending && (
        <div className="py-6 text-center">
          <p className="text-sm text-stone-500">Searching...</p>
        </div>
      )}

      {!pending && searched && results.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-sm text-stone-500">No nonprofits found for this search.</p>
        </div>
      )}

      {!pending && results.length > 0 && (
        <div className="divide-y divide-stone-800">
          {results.map((np) => (
            <button
              key={np.ein}
              type="button"
              onClick={() => handleSelect(np)}
              className="w-full text-left py-3 hover:bg-stone-800/30 -mx-1 px-1 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-200">{np.name}</span>
                <NonprofitBadge verified />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <MapPin className="w-3 h-3 text-stone-600" />
                <span className="text-xs text-stone-500">
                  {np.city}, {np.state}
                </span>
                {np.income > 0 && (
                  <span className="text-xs text-stone-600">
                    · Income: {formatIncome(np.income)}
                  </span>
                )}
                <span className="text-xs text-stone-600">· EIN: {np.ein}</span>
              </div>
            </button>
          ))}

          {hasMore && (
            <div className="pt-3 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={pending}
                className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                Load more...
              </button>
            </div>
          )}

          <p className="text-xs text-stone-600 pt-3">
            Click any result to prefill the volunteer log.
          </p>
        </div>
      )}

      {!state && !searched && (
        <p className="text-xs text-stone-600 mt-2">
          Select a state to browse registered nonprofits. This is optional and meant to help when
          you want a verified organization before saving hours.
        </p>
      )}
    </Card>
  )
}
