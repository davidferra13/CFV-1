'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import type { HubMessage } from '@/lib/hub/types'
import { searchHubMessages } from '@/lib/hub/message-actions'

interface HubMessageSearchProps {
  groupId: string
}

export function HubMessageSearch({ groupId }: HubMessageSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HubMessage[]>([])
  const [searched, setSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(
    (q: string) => {
      if (q.trim().length < 2) {
        setResults([])
        setSearched(false)
        return
      }
      startTransition(async () => {
        try {
          const msgs = await searchHubMessages({ groupId, query: q })
          setResults(msgs)
          setSearched(true)
        } catch {
          setResults([])
          setSearched(true)
        }
      })
    },
    [groupId]
  )

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 400)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setSearched(false)
  }

  return (
    <div className="p-4">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search messages..."
          aria-label="Search messages"
          className="w-full rounded-lg bg-stone-800 px-3 py-2 pl-8 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[var(--hub-primary,#e88f47)]"
        />
        <svg
          className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 rounded p-0.5 text-stone-500 hover:text-stone-300"
            title="Clear search"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isPending && <div className="mt-3 text-center text-xs text-stone-500">Searching...</div>}

      {searched && !isPending && results.length === 0 && (
        <div className="mt-3 text-center text-xs text-stone-500">No messages found</div>
      )}

      {results.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-stone-500">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
          {results.map((msg) => (
            <div key={msg.id} className="rounded-lg bg-stone-800/50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-stone-300">
                  {msg.author?.display_name ?? 'Someone'}
                </span>
                <span className="text-xs text-stone-500">
                  {new Date(msg.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-stone-300">{msg.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
