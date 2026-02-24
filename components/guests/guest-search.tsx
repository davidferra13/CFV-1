'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { searchGuests } from '@/lib/guests/actions'

interface SearchResult {
  id: string
  name: string
  phone: string | null
  email: string | null
  guest_tags: { tag: string; color: string | null }[]
  guest_comps: { id: string; redeemed_at: string | null }[]
}

const TAG_COLORS: Record<string, string> = {
  gold: 'text-amber-400',
  blue: 'text-sky-400',
  green: 'text-emerald-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
}

export function GuestSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchGuests(query)
        setResults(data as SearchResult[])
        setShowDropdown(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (guestId: string) => {
    setShowDropdown(false)
    setQuery('')
    router.push(`/guests/${guestId}`)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search guests by name or phone..."
        onFocus={() => {
          if (results.length > 0) setShowDropdown(true)
        }}
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-stone-600 border-t-brand-500 rounded-full animate-spin" />
        </div>
      )}

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 shadow-lg overflow-hidden">
          {results.map((guest) => {
            const activeCompCount = guest.guest_comps?.filter((c) => !c.redeemed_at).length ?? 0

            return (
              <button
                key={guest.id}
                onClick={() => handleSelect(guest.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-800 transition-colors text-left"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-200">{guest.name}</span>
                    {activeCompCount > 0 && (
                      <span className="text-xs text-amber-400" title="Has active comps">
                        *
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {guest.phone && <span className="text-xs text-stone-500">{guest.phone}</span>}
                    {guest.guest_tags?.map((t) => (
                      <span
                        key={t.tag}
                        className={`text-xs ${TAG_COLORS[t.color || ''] || 'text-stone-400'}`}
                      >
                        {t.tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showDropdown && query.trim() && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 shadow-lg px-4 py-3">
          <p className="text-sm text-stone-500">No guests found.</p>
        </div>
      )}
    </div>
  )
}
