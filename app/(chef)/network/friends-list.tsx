// Friends List - Display accepted connections with search/filter
'use client'

import { useState, useMemo, useTransition } from 'react'
import { Search, UserMinus } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { ChefCard } from '@/components/network/chef-card'
import { removeConnection } from '@/lib/network/actions'
import type { ChefFriend } from '@/lib/network/actions'

interface FriendsListProps {
  friends: ChefFriend[]
}

export function FriendsList({ friends: initialFriends }: FriendsListProps) {
  const [friends, setFriends] = useState(initialFriends)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return friends
    const q = search.toLowerCase()
    return friends.filter(
      (f) =>
        (f.display_name || '').toLowerCase().includes(q) ||
        f.business_name.toLowerCase().includes(q) ||
        (f.city || '').toLowerCase().includes(q) ||
        (f.state || '').toLowerCase().includes(q)
    )
  }, [friends, search])

  function handleRemove(connectionId: string) {
    if (confirmRemove !== connectionId) {
      setConfirmRemove(connectionId)
      return
    }

    setError(null)
    setConfirmRemove(null)
    startTransition(async () => {
      try {
        await removeConnection(connectionId)
        setFriends((prev) => prev.filter((f) => f.id !== connectionId))
      } catch (err: any) {
        setError(err.message || 'Failed to remove connection')
      }
    })
  }

  if (friends.length === 0) {
    return (
      <p className="text-sm text-stone-500 text-center py-6">
        No connections yet. Search for other chefs above to start connecting.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-950 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {friends.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="search"
            placeholder="Filter connections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 pl-10 pr-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((friend) => (
          <ChefCard
            key={friend.id}
            displayName={friend.display_name}
            businessName={friend.business_name}
            bio={friend.bio}
            profileImageUrl={friend.profile_image_url}
            city={friend.city}
            state={friend.state}
            actions={
              confirmRemove === friend.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-500">Sure?</span>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRemove(friend.id)}
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemove(friend.id)}
                  disabled={isPending}
                  title="Remove connection"
                >
                  <UserMinus className="h-4 w-4 text-stone-400" />
                </Button>
              )
            }
          />
        ))}
      </div>

      <p className="text-sm text-stone-500 text-center">
        {filtered.length} of {friends.length} connection{friends.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
