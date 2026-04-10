'use client'

// Substitution Lookup - Quick search for ingredient substitutes.
// Shows both system defaults and chef's personal substitutions.
// Used on the substitutions page and can be embedded in recipe/inventory views.

import { useState, useTransition, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { searchSubstitutions } from '@/lib/ingredients/substitution-actions'
import type { SubstitutionSearchResult } from '@/lib/ingredients/substitution-actions'
import { WebSourcingPanel } from '@/components/pricing/web-sourcing-panel'

interface SubstitutionLookupProps {
  className?: string
  initialQuery?: string
}

export function SubstitutionLookup({ className = '', initialQuery = '' }: SubstitutionLookupProps) {
  const [query, setQuery] = useState(initialQuery)
  const [result, setResult] = useState<SubstitutionSearchResult | null>(null)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSearch = useCallback(() => {
    if (!query.trim() || query.trim().length < 2) return

    setError(null)
    startTransition(async () => {
      try {
        const data = await searchSubstitutions(query.trim())
        setResult(data)
        setSearched(true)
      } catch (err) {
        console.error('[SubstitutionLookup] Search failed:', err)
        setError('Could not search substitutions')
        setSearched(true)
      }
    })
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for an ingredient (e.g., butter, egg, flour)"
          className="flex-1 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <Button
          variant="primary"
          onClick={handleSearch}
          disabled={isPending || query.trim().length < 2}
        >
          {isPending ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* No results */}
      {searched && !result && !error && (
        <div className="space-y-3">
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 text-center">
            <p className="text-sm text-stone-400">No substitutions found for &quot;{query}&quot;</p>
            <p className="text-xs text-stone-500 mt-1">
              Try a different ingredient name, or add your own substitution below.
            </p>
          </div>
          <WebSourcingPanel query={query} label="Buy the original" />
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 divide-y divide-stone-700">
          <div className="px-4 py-3">
            <h3 className="text-sm font-medium text-stone-200">
              Substitutes for <span className="text-brand-400">{result.original}</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {result.substitutes.length} option{result.substitutes.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="divide-y divide-stone-700/50">
            {result.substitutes.map((sub) => (
              <div key={sub.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-200">{sub.substitute}</span>
                  <Badge variant={sub.source === 'system' ? 'default' : 'info'}>
                    {sub.source === 'system' ? 'Standard' : 'Personal'}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-400 font-mono bg-stone-900 px-1.5 py-0.5 rounded">
                    {sub.ratio}
                  </span>
                </div>

                {sub.notes && <p className="text-xs text-stone-400">{sub.notes}</p>}

                {sub.dietary_safe_for.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sub.dietary_safe_for.map((diet) => (
                      <Badge key={diet} variant="success">
                        {diet}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
