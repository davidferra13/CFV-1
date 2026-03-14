'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Search, User, MessageCircle, Phone, Loader2 } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface ClientQuickResult {
  id: string
  full_name: string
  loyalty_tier: string | null
  dietary_restrictions: string | null
  allergies: string | null
  event_count: number
  last_event_date: string | null
  lifetime_revenue_cents: number
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-800 text-amber-100',
  silver: 'bg-stone-500 text-stone-100',
  gold: 'bg-yellow-600 text-yellow-50',
  platinum: 'bg-indigo-500 text-indigo-50',
}

export function ClientLookupWidget() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClientQuickResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { searchClientsQuick } = await import('@/lib/clients/actions')
      const data = await searchClientsQuick(q.trim())
      setResults(data)
      setSearched(true)
    } catch (err) {
      console.error('[ClientLookup] Search failed:', err)
      setResults([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  return (
    <Card className="bg-stone-900 border-stone-700">
      <CardContent className="p-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Look up client (name, dietary, allergy...)"
            className="w-full pl-9 pr-9 py-2.5 bg-stone-800 border border-stone-600 rounded-lg text-stone-200 text-sm placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 animate-spin" />
          )}
        </div>

        {/* Results */}
        {searched && results.length === 0 && !loading && (
          <div className="mt-3 text-center py-4">
            <User className="h-8 w-8 text-stone-600 mx-auto mb-2" />
            <p className="text-sm text-stone-400">No clients found for "{query}"</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map((client) => (
              <div
                key={client.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-stone-800/60 hover:bg-stone-800 transition-colors"
              >
                {/* Client info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-sm font-medium text-stone-100 hover:text-brand-400 transition-colors truncate"
                    >
                      {client.full_name}
                    </Link>
                    {client.loyalty_tier && (
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${TIER_COLORS[client.loyalty_tier] ?? 'bg-stone-600 text-stone-200'}`}
                      >
                        {client.loyalty_tier}
                      </span>
                    )}
                  </div>

                  {/* Dietary + allergies */}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {client.dietary_restrictions && (
                      <span className="text-xs text-stone-400">{client.dietary_restrictions}</span>
                    )}
                    {client.allergies && (
                      <span className="text-xs text-red-400 font-medium">
                        ALLERGY: {client.allergies}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-500">
                    <span>
                      {client.event_count} event{client.event_count !== 1 ? 's' : ''}
                    </span>
                    {client.last_event_date && (
                      <span>
                        Last:{' '}
                        {formatDistanceToNow(new Date(client.last_event_date), { addSuffix: true })}
                      </span>
                    )}
                    <span>Lifetime: {formatCurrency(client.lifetime_revenue_cents)}</span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <Link
                    href={`/hub?to=${client.id}`}
                    className="p-1.5 rounded hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
                    title="Message"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/inquiries/new?clientId=${client.id}`}
                    className="p-1.5 rounded hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
                    title="New inquiry"
                  >
                    <User className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/clients/${client.id}`}
                    className="p-1.5 rounded hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
                    title="View profile"
                  >
                    <Phone className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
