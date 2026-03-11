'use client'

import { useState, useTransition } from 'react'
import { platformSearch, type SearchResult } from '@/lib/admin/platform-search'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'

const TYPE_COLORS: Record<string, string> = {
  chef: 'bg-blue-900 text-blue-200',
  client: 'bg-purple-900 text-purple-200',
  event: 'bg-green-900 text-green-200',
  recipe: 'bg-orange-900 text-orange-200',
  inquiry: 'bg-yellow-900 text-yellow-200',
}

export function AdminSearchForm() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length < 2) return

    startTransition(async () => {
      try {
        const data = await platformSearch(query)
        setResults(data)
        setHasSearched(true)
      } catch (err) {
        console.error('[Search]', err)
        setResults([])
        setHasSearched(true)
      }
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chefs, clients, events, recipes, inquiries..."
          className="flex-1 bg-stone-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          autoFocus
        />
        <button
          type="submit"
          disabled={isPending || query.trim().length < 2}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? 'Searching...' : 'Search'}
        </button>
      </form>

      {hasSearched && (
        <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No results found for "{query}"
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="px-4 py-2.5 bg-slate-50 text-xs text-stone-500 font-medium">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              {results.map((r) => (
                <div
                  key={`${r.type}-${r.id}`}
                  className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${TYPE_COLORS[r.type] ?? 'bg-stone-800 text-stone-400'}`}
                    >
                      {r.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        {r.subtitle && <span className="truncate">{r.subtitle}</span>}
                        {r.chefName && r.type !== 'chef' && (
                          <span className="truncate">({r.chefName})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {r.chefId && <ViewAsChefButton chefId={r.chefId} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
