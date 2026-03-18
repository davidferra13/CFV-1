'use client'

// Unified Document Search Client Component
// Cross-table search across receipts, chef_documents, and expenses.
// Filters: text query, source type, date range, amount range, event, client.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  searchAllDocuments,
  type UnifiedSearchFilters,
  type UnifiedSearchResult,
} from '@/lib/documents/search-actions'
import { format } from 'date-fns'

type Props = {
  events: { id: string; label: string }[]
  clients: { id: string; name: string }[]
}

function SourceBadge({ source }: { source: UnifiedSearchResult['source'] }) {
  const styles: Record<string, string> = {
    receipt: 'bg-emerald-900 text-emerald-400',
    document: 'bg-blue-900 text-blue-400',
    expense: 'bg-purple-900 text-purple-400',
  }
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${styles[source]}`}>
      {source}
    </span>
  )
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
      {type}
    </span>
  )
}

function formatCents(cents: number | null): string {
  if (cents === null) return ''
  return `$${(cents / 100).toFixed(2)}`
}

export function DocumentSearchClient({ events, clients }: Props) {
  const [results, setResults] = useState<UnifiedSearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [searched, setSearched] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Filter state
  const [query, setQuery] = useState('')
  const [sourceType, setSourceType] = useState<'all' | 'receipt' | 'document' | 'expense'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [eventId, setEventId] = useState('')
  const [clientId, setClientId] = useState('')

  const handleSearch = () => {
    const filters: UnifiedSearchFilters = {
      query: query.trim() || undefined,
      sourceType,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      eventId: eventId || undefined,
      clientId: clientId || undefined,
      limit: 30,
      offset: 0,
    }

    startTransition(async () => {
      try {
        const response = await searchAllDocuments(filters)
        setResults(response.results)
        setTotal(response.total)
        setHasMore(response.hasMore)
        setSearched(true)
      } catch {
        setResults([])
        setTotal(0)
        setSearched(true)
      }
    })
  }

  const handleLoadMore = () => {
    const filters: UnifiedSearchFilters = {
      query: query.trim() || undefined,
      sourceType,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      eventId: eventId || undefined,
      clientId: clientId || undefined,
      limit: 30,
      offset: results.length,
    }

    startTransition(async () => {
      try {
        const response = await searchAllDocuments(filters)
        setResults((prev) => [...prev, ...response.results])
        setTotal(response.total)
        setHasMore(response.hasMore)
      } catch {
        // Keep existing results
      }
    })
  }

  const handleClear = () => {
    setQuery('')
    setSourceType('all')
    setDateFrom('')
    setDateTo('')
    setEventId('')
    setClientId('')
    setResults([])
    setTotal(0)
    setHasMore(false)
    setSearched(false)
  }

  const hasFilters = query || sourceType !== 'all' || dateFrom || dateTo || eventId || clientId

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-1">Document Search</h2>
      <p className="text-sm text-stone-400 mb-4">
        Search across all receipts, documents, and expenses in one place.
      </p>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by store, vendor, title, description..."
            className="flex-1 min-w-[200px] h-10 rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200 placeholder:text-stone-500"
          />
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as any)}
            aria-label="Document source type"
            className="h-10 rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200"
          >
            <option value="all">All types</option>
            <option value="receipt">Receipts</option>
            <option value="document">Documents</option>
            <option value="expense">Expenses</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-stone-500">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded border border-stone-700 bg-stone-900 px-2 text-xs text-stone-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-stone-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded border border-stone-700 bg-stone-900 px-2 text-xs text-stone-200"
            />
          </div>
          {events.length > 0 && (
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              aria-label="Filter by event"
              className="h-9 rounded border border-stone-700 bg-stone-900 px-2 text-xs text-stone-200"
            >
              <option value="">All events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.label}
                </option>
              ))}
            </select>
          )}
          {clients.length > 0 && (
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              aria-label="Filter by client"
              className="h-9 rounded border border-stone-700 bg-stone-900 px-2 text-xs text-stone-200"
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSearch} disabled={isPending}>
            {isPending ? 'Searching...' : 'Search'}
          </Button>
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-stone-500">
            {total} result{total !== 1 ? 's' : ''} found
          </p>

          {results.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">
              No documents match your search.
            </p>
          ) : (
            <>
              {results.map((result) => (
                <div
                  key={`${result.source}-${result.id}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-800 pb-2 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SourceBadge source={result.source} />
                      <TypeBadge type={result.documentType} />
                      <span className="text-sm font-medium text-stone-200 truncate">
                        {result.title}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                      {result.date && <span>{format(new Date(result.date), 'MMM d, yyyy')}</span>}
                      {result.eventName && <span>{result.eventName}</span>}
                      {result.clientName && <span>{result.clientName}</span>}
                      {result.folderName && <span>in {result.folderName}</span>}
                      {result.status && <span>{result.status}</span>}
                    </div>
                    {result.summary && (
                      <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{result.summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result.amountCents !== null && (
                      <span className="text-sm font-medium text-stone-200">
                        {formatCents(result.amountCents)}
                      </span>
                    )}
                    {result.source === 'receipt' && result.eventId && (
                      <Button size="sm" variant="ghost" href={`/events/${result.eventId}/receipts`}>
                        View
                      </Button>
                    )}
                    {result.source === 'receipt' && !result.eventId && (
                      <Button size="sm" variant="ghost" href="/receipts">
                        View
                      </Button>
                    )}
                    {result.source === 'expense' && result.eventId && (
                      <Button size="sm" variant="ghost" href={`/events/${result.eventId}`}>
                        Event
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleLoadMore}
                    disabled={isPending}
                  >
                    {isPending ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}
