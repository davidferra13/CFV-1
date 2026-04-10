'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'

interface SearchHit {
  id: string
  name: string
  category: string
}

interface IngredientSearchProps {
  currentId: string
}

export function IngredientSearch({ currentId }: IngredientSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [open, setOpen] = useState(false)
  const [isSearching, startSearch] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim() || query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        try {
          const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(query)}&limit=6`)
          if (!res.ok) return
          const data = await res.json()
          setResults(data.results ?? [])
          setOpen(true)
        } catch {
          // Network error - silent
        }
      })
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(hit: SearchHit) {
    setQuery('')
    setOpen(false)
    router.push(`/ingredient/${hit.id}`)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 pointer-events-none" />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 animate-spin" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search any ingredient..."
          className="w-full rounded-xl border border-stone-700 bg-stone-900/80 py-2.5 pl-9 pr-4 text-sm text-stone-200 placeholder-stone-500 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-600"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-stone-700 bg-stone-900 shadow-2xl overflow-hidden">
          {results.map((hit) => (
            <button
              key={hit.id}
              onClick={() => handleSelect(hit)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-800 transition-colors ${
                hit.id === currentId ? 'bg-stone-800/50' : ''
              }`}
            >
              <span className="flex-1 text-sm text-stone-200">{hit.name}</span>
              <span className="text-xs text-stone-600 shrink-0">{hit.category}</span>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !isSearching && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-stone-700 bg-stone-900 shadow-2xl px-4 py-3">
          <p className="text-sm text-stone-500">No ingredients found for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  )
}
