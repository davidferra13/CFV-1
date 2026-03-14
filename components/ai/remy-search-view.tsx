'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { searchConversations } from '@/lib/ai/remy-local-storage'
import type { SearchResult } from '@/lib/ai/remy-types'
import { Search, X } from 'lucide-react'

interface RemySearchViewProps {
  onSelectConversation: (id: string) => void
}

export function RemySearchView({ onSelectConversation }: RemySearchViewProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }
    setIsSearching(true)
    try {
      const hits = await searchConversations(searchQuery)
      setResults(hits)
      setHasSearched(true)
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  function highlightMatch(text: string, q: string): React.ReactNode {
    if (!q.trim()) return text
    const lower = text.toLowerCase()
    const idx = lower.indexOf(q.toLowerCase())
    if (idx === -1) return text

    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-brand-500/30 text-white rounded px-0.5">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d`
    return `${Math.floor(days / 30)}mo`
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search Input */}
      <div className="px-3 py-2 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500/50 transition-colors"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('')
                setResults([])
                setHasSearched(false)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {isSearching && <div className="text-center py-8 text-gray-500 text-sm">Searching...</div>}

        {!isSearching && !hasSearched && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Type to search across all conversations
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {results.map((result) => (
          <button
            key={result.conversation.id}
            onClick={() => onSelectConversation(result.conversation.id)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-white truncate font-medium">
                {highlightMatch(result.conversation.title, query)}
              </span>
              <span className="text-[10px] text-gray-500 shrink-0 ml-2">
                {timeAgo(result.conversation.updatedAt)}
              </span>
            </div>
            {result.matchSource === 'message' && (
              <div className="text-xs text-gray-400 truncate">
                {highlightMatch(result.matchingSnippet, query)}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
