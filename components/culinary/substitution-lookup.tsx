'use client'

// Substitution Lookup - Quick search for ingredient substitutes.
// Shows both system defaults and chef's personal substitutions.
// Used on the substitutions page and can be embedded in recipe/inventory views.

import { useState, useTransition, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { searchSubstitutions } from '@/lib/ingredients/substitution-actions'
import type { SubstitutionSearchResult } from '@/lib/ingredients/substitution-actions'
import { searchIngredientOnline } from '@/lib/pricing/web-sourcing-actions'
import type { SourcingResult } from '@/lib/pricing/web-sourcing-actions'
import { ExternalLink, Loader2 } from 'lucide-react'

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
          <SourcingFallback query={query} />
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

// ---------------------------------------------------------------------------
// Sourcing fallback - shown when no substitutions found.
// Searches specialty retailers so the chef can buy the original ingredient.
// ---------------------------------------------------------------------------

function SourcingFallback({ query }: { query: string }) {
  const [results, setResults] = useState<SourcingResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    searchIngredientOnline(query)
      .then((res) => {
        if (!cancelled && res.source === 'live') setResults(res.results)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-stone-500 px-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Searching where to buy &quot;{query}&quot;...
      </div>
    )
  }

  if (results.length === 0) return null

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
        Buy the original
      </p>
      <div className="space-y-2">
        {results.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-md bg-stone-800 hover:bg-stone-700 border border-stone-700 transition-colors group"
          >
            <div className="min-w-0">
              <span className="text-xs font-semibold text-brand-400 mr-2">{r.retailer}</span>
              <span className="text-sm text-stone-200 group-hover:text-white truncate">
                {r.title}
              </span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300 shrink-0 ml-2" />
          </a>
        ))}
      </div>
    </div>
  )
}
