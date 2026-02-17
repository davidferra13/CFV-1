'use client'

import { useState, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { searchChatMessages } from '@/lib/chat/actions'
import { format } from 'date-fns'
import type { ChatMessage } from '@/lib/chat/types'

interface ChatSearchProps {
  conversationId: string
  onResultClick?: (messageId: string) => void
  onClose: () => void
}

export function ChatSearch({ conversationId, onResultClick, onClose }: ChatSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChatMessage[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setSearching(true)
    setSearched(true)
    try {
      const msgs = await searchChatMessages(conversationId, trimmed)
      setResults(msgs)
    } finally {
      setSearching(false)
    }
  }, [conversationId, query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="border-b border-stone-200 bg-white">
      {/* Search input */}
      <div className="flex items-center gap-2 px-4 py-2">
        <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          autoFocus
          className="flex-1 text-sm border-none outline-none bg-transparent placeholder:text-stone-400"
        />
        {searching && <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />}
        <button
          onClick={onClose}
          className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Results */}
      {searched && (
        <div className="max-h-60 overflow-y-auto border-t border-stone-100">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-stone-500">No messages found</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {results.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => onResultClick?.(msg.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-stone-50 transition-colors"
                >
                  <p className="text-sm text-stone-800 line-clamp-2">
                    {highlightMatch(msg.body || '', query)}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    {format(new Date(msg.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </button>
              ))}
            </div>
          )}
          <p className="px-4 py-1.5 text-[10px] text-stone-400 border-t border-stone-100">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}
