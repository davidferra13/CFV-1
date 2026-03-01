'use client'

import { useState, useTransition } from 'react'
import { UserMinus, Search, UserPlus, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  removeFriend,
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  searchPeople,
} from '@/lib/hub/friend-actions'
import type { HubFriend } from '@/lib/hub/friend-actions'
import type { HubGuestProfile } from '@/lib/hub/types'

// ---------------------------------------------------------------------------
// Friend Card
// ---------------------------------------------------------------------------

function FriendCard({ friend, onRemoved }: { friend: HubFriend; onRemoved: () => void }) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    if (!confirm(`Remove ${friend.profile.display_name} as a friend?`)) return
    startTransition(async () => {
      try {
        await removeFriend(friend.friendship_id)
        onRemoved()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to remove friend')
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-900/60 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-400">
        {friend.profile.avatar_url ? (
          <img
            src={friend.profile.avatar_url}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          friend.profile.display_name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-100">{friend.profile.display_name}</p>
        {friend.profile.bio && (
          <p className="truncate text-xs text-stone-400">{friend.profile.bio}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        className="rounded-lg p-2 text-stone-500 hover:bg-stone-800 hover:text-red-400 transition-colors"
        title="Remove friend"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserMinus className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pending Request Card
// ---------------------------------------------------------------------------

function PendingRequestCard({ request, onHandled }: { request: HubFriend; onHandled: () => void }) {
  const [isPending, startTransition] = useTransition()

  function handleAccept() {
    startTransition(async () => {
      try {
        await acceptFriendRequest(request.friendship_id)
        onHandled()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  function handleDecline() {
    startTransition(async () => {
      try {
        await declineFriendRequest(request.friendship_id)
        onHandled()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-400">
        {request.profile.display_name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-100">
          {request.profile.display_name}
        </p>
        <p className="text-xs text-stone-400">wants to be your friend</p>
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={handleAccept}
          disabled={isPending}
          className="rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-700 transition-colors"
          title="Accept"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={handleDecline}
          disabled={isPending}
          className="rounded-lg p-2 text-stone-400 hover:bg-stone-700 hover:text-red-400 transition-colors"
          title="Decline"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Search Result Card
// ---------------------------------------------------------------------------

function SearchResultCard({
  profile,
  isFriend,
  isPendingRequest,
  onSent,
}: {
  profile: HubGuestProfile
  isFriend: boolean
  isPendingRequest: boolean
  onSent: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  function handleAdd() {
    startTransition(async () => {
      try {
        await sendFriendRequest(profile.id)
        setSent(true)
        onSent()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to send request')
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-900/60 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-700 text-sm font-semibold text-stone-300">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          profile.display_name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-100">{profile.display_name}</p>
      </div>
      {isFriend ? (
        <span className="text-xs text-stone-400">Already friends</span>
      ) : isPendingRequest || sent ? (
        <span className="text-xs text-brand-400">Request sent</span>
      ) : (
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending}
          className="rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-700 transition-colors"
          title="Add friend"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Friends List Component
// ---------------------------------------------------------------------------

export function FriendsList({
  initialFriends,
  initialRequests,
}: {
  initialFriends: HubFriend[]
  initialRequests: HubFriend[]
}) {
  const [friends, setFriends] = useState(initialFriends)
  const [requests, setRequests] = useState(initialRequests)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<HubGuestProfile[]>([])
  const [existingFriendIds, setExistingFriendIds] = useState<string[]>([])
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const result = await searchPeople(query)
      setSearchResults(result.profiles)
      setExistingFriendIds(result.existing_friend_ids)
      setPendingIds(result.pending_request_ids)
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  function refreshData() {
    // Force page refresh to get fresh data
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {requests.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-stone-100">
            Friend Requests ({requests.length})
          </h2>
          <div className="space-y-2">
            {requests.map((req) => (
              <PendingRequestCard key={req.friendship_id} request={req} onHandled={refreshData} />
            ))}
          </div>
        </div>
      )}

      {/* Add Friends */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-100">
            Friends {friends.length > 0 && `(${friends.length})`}
          </h2>
          <Button variant="ghost" onClick={() => setShowSearch(!showSearch)} className="text-sm">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add Friend
          </Button>
        </div>

        {/* Search Panel */}
        {showSearch && (
          <div className="mb-4 rounded-xl border border-stone-700 bg-stone-900/80 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-lg border border-stone-700 bg-stone-800 py-2.5 pl-10 pr-4 text-sm text-stone-100 placeholder-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                autoFocus
              />
            </div>
            {isSearching && (
              <div className="mt-3 flex items-center justify-center py-4 text-sm text-stone-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}
            {!isSearching && searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((profile) => (
                  <SearchResultCard
                    key={profile.id}
                    profile={profile}
                    isFriend={existingFriendIds.includes(profile.id)}
                    isPendingRequest={pendingIds.includes(profile.id)}
                    onSent={() => setPendingIds((prev) => [...prev, profile.id])}
                  />
                ))}
              </div>
            )}
            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="mt-3 text-center text-sm text-stone-400">No people found</p>
            )}
          </div>
        )}

        {/* Friends Grid */}
        {friends.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {friends.map((friend) => (
              <FriendCard key={friend.friendship_id} friend={friend} onRemoved={refreshData} />
            ))}
          </div>
        ) : (
          !showSearch && (
            <div className="rounded-xl border border-dashed border-stone-700 bg-stone-900/30 py-10 text-center">
              <p className="text-sm text-stone-400">
                No friends yet. Click &quot;Add Friend&quot; to find people you know!
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
