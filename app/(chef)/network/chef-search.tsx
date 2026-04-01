// Chef Search - Search for other chefs and send connection requests
'use client'

import { useState, useTransition, useEffect } from 'react'
import { Search, MapPin, X } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChefCard } from '@/components/network/chef-card'
import {
  searchChefs,
  sendConnectionRequest,
  respondToConnectionRequest,
} from '@/lib/network/actions'
import type { SearchableChef } from '@/lib/network/actions'
import { useDebounce } from '@/lib/hooks/use-debounce'

export function ChefSearch() {
  const [query, setQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [results, setResults] = useState<SearchableChef[]>([])
  const [searched, setSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const debouncedQuery = useDebounce(query, 300)
  const debouncedCity = useDebounce(cityFilter, 400)
  const debouncedState = useDebounce(stateFilter, 400)

  const hasLocationFilter = cityFilter.trim().length > 0 || stateFilter.trim().length > 0

  function clearFilters() {
    setCityFilter('')
    setStateFilter('')
  }

  // Load discoverable chefs by default; filter as debounced inputs change
  useEffect(() => {
    setIsSearching(true)
    const normalizedQuery = debouncedQuery.trim()
    searchChefs({
      query: normalizedQuery,
      city: debouncedCity.trim() || undefined,
      state: debouncedState.trim().toUpperCase() || undefined,
    })
      .then((data) => {
        setResults(data)
        setSearched(
          normalizedQuery.length > 0 || debouncedCity.length > 0 || debouncedState.length > 0
        )
      })
      .catch(() => {
        setResults([])
        setSearched(normalizedQuery.length > 0)
      })
      .finally(() => setIsSearching(false))
  }, [debouncedQuery, debouncedCity, debouncedState])

  function handleConnect(chefId: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await sendConnectionRequest({ addressee_id: chefId })
        // Update local state to reflect the sent request
        setResults((prev) =>
          prev.map((c) =>
            c.id === chefId ? { ...c, connection_status: 'pending_sent' as const } : c
          )
        )
      } catch (err: any) {
        setActionError(err.message || 'Failed to send request')
      }
    })
  }

  function handleRespond(connectionId: string, chefId: string, action: 'accept' | 'decline') {
    setActionError(null)
    startTransition(async () => {
      try {
        await respondToConnectionRequest({ connection_id: connectionId, action })
        setResults((prev) =>
          prev.map((c) =>
            c.id === chefId
              ? {
                  ...c,
                  connection_status:
                    action === 'accept' ? ('accepted' as const) : ('declined' as const),
                }
              : c
          )
        )
      } catch (err: any) {
        setActionError(err.message || `Failed to ${action} request`)
      }
    })
  }

  function renderActions(chef: SearchableChef) {
    switch (chef.connection_status) {
      case 'none':
      case 'declined':
        return (
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleConnect(chef.id)}
            disabled={isPending}
          >
            Connect
          </Button>
        )
      case 'pending_sent':
        return <Badge variant="default">Request Sent</Badge>
      case 'pending_received':
        return (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleRespond(chef.connection_id!, chef.id, 'accept')}
              disabled={isPending}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRespond(chef.connection_id!, chef.id, 'decline')}
              disabled={isPending}
            >
              Decline
            </Button>
          </div>
        )
      case 'accepted':
        return <Badge variant="success">Connected</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Name search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          type="search"
          placeholder="Search by business name or display name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full rounded-lg border border-stone-600 bg-stone-900 pl-10 pr-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {/* Location filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <MapPin className="h-3.5 w-3.5 text-stone-500 flex-shrink-0" />
        <input
          type="text"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          placeholder="City"
          maxLength={100}
          className="flex-1 min-w-0 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <input
          type="text"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value.toUpperCase().slice(0, 2))}
          placeholder="ST"
          maxLength={2}
          className="w-14 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 uppercase"
        />
        {hasLocationFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300"
            title="Clear location filters"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {actionError && (
        <div className="bg-red-950 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}

      {isSearching && <p className="text-sm text-stone-500 text-center py-4">Searching...</p>}

      {!isSearching && searched && results.length === 0 && (
        <p className="text-sm text-stone-500 text-center py-4">
          No chefs found matching &ldquo;{query}&rdquo;. They may have network discovery turned off.
        </p>
      )}

      {!isSearching && !searched && results.length === 0 && (
        <p className="text-sm text-stone-500 text-center py-4">No discoverable chefs yet.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((chef) => (
            <ChefCard
              key={chef.id}
              displayName={chef.display_name}
              businessName={chef.business_name}
              bio={chef.bio}
              profileImageUrl={chef.profile_image_url}
              city={chef.city}
              state={chef.state}
              actions={renderActions(chef)}
            />
          ))}
          <p className="text-xs text-stone-400 text-center pt-1">
            Showing {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
