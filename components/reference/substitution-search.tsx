'use client'

import { useState, useMemo } from 'react'
import { SubstitutionCard } from './substitution-card'
import {
  searchSubstitutions,
  searchByIngredientAndReason,
  getAvailableReasons,
  REASON_LABELS,
} from '@/lib/reference/substitutions'
import type { SubstitutionReason } from '@/lib/reference/types'
import { Search } from '@/components/ui/icons'

export function SubstitutionSearch() {
  const [query, setQuery] = useState('')
  const [activeReason, setActiveReason] = useState<SubstitutionReason | 'all'>('all')
  const reasons = getAvailableReasons()

  const results = useMemo(() => {
    if (activeReason === 'all') return searchSubstitutions(query)
    return searchByIngredientAndReason(query, activeReason)
  }, [query, activeReason])

  // Group reasons by type for better UX
  const allergyReasons = reasons.filter((r) => r.startsWith('allergy_'))
  const dietaryReasons = reasons.filter((r) => r.startsWith('dietary_'))
  const otherReasons = reasons.filter((r) => !r.startsWith('allergy_') && !r.startsWith('dietary_'))

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ingredient (butter, flour, eggs...)"
          className="w-full rounded-lg border border-stone-600 bg-stone-900 pl-10 pr-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-stone-400 focus:outline-none"
        />
      </div>

      {/* Reason filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveReason('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeReason === 'all'
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            All
          </button>
          {allergyReasons.map((r) => (
            <button
              key={r}
              onClick={() => setActiveReason(r)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeReason === r
                  ? 'bg-red-700 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {REASON_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {dietaryReasons.map((r) => (
            <button
              key={r}
              onClick={() => setActiveReason(r)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeReason === r
                  ? 'bg-blue-700 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {REASON_LABELS[r]}
            </button>
          ))}
          {otherReasons.map((r) => (
            <button
              key={r}
              onClick={() => setActiveReason(r)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeReason === r
                  ? 'bg-stone-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {REASON_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-stone-500">{results.length} substitution rules</p>

      {/* Results */}
      {results.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-stone-500 text-sm">
            No substitution rules found. Try a different ingredient or filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((rule) => (
            <SubstitutionCard key={rule.id} rule={rule} />
          ))}
        </div>
      )}
    </div>
  )
}
