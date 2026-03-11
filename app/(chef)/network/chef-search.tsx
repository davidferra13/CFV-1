// Chef Search - Search for other chefs and send connection requests
'use client'

import { useState, useTransition, useEffect } from 'react'
import { Search } from '@/components/ui/icons'
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
  const [results, setResults] = useState<SearchableChef[]>([])
  const [searched, setSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const debouncedQuery = useDebounce(query, 300)

  // Load discoverable chefs by default; filter as debounced query changes
  useEffect(() => {
    setIsSearching(true)
    const normalizedQuery = debouncedQuery.trim()
    searchChefs({ query: normalizedQuery })
      .then((data) => {
        setResults(data)
        setSearched(normalizedQuery.length > 0)
      })
      .catch(() => {
        setResults([])
        setSearched(normalizedQuery.length > 0)
      })
      .finally(() => setIsSearching(false))
  }, [debouncedQuery])

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

      {actionError && (
        <div className="bg-red-950 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-200">{actionError}</p>
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
