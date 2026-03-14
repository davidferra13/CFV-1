'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Check, Copy, ExternalLink, Loader2, UserMinus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { acceptFriendRequest, declineFriendRequest, removeFriend } from '@/lib/hub/friend-actions'
import type { HubFriend } from '@/lib/hub/friend-actions'

// ---------------------------------------------------------------------------
// Friend Card
// ---------------------------------------------------------------------------

function FriendCard({
  friend,
  onRemoved,
}: {
  friend: HubFriend
  onRemoved: (friendshipId: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    if (!confirm(`Remove ${friend.profile.display_name} as a friend?`)) return
    startTransition(async () => {
      try {
        await removeFriend(friend.friendship_id)
        onRemoved(friend.friendship_id)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to remove friend')
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-900/60 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-400">
        {friend.profile.avatar_url ? (
          <Image
            src={friend.profile.avatar_url}
            alt=""
            width={40}
            height={40}
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

function PendingRequestCard({
  request,
  onAccepted,
  onDeclined,
}: {
  request: HubFriend
  onAccepted: (request: HubFriend) => void
  onDeclined: (friendshipId: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleAccept() {
    startTransition(async () => {
      try {
        await acceptFriendRequest(request.friendship_id)
        onAccepted(request)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  function handleDecline() {
    startTransition(async () => {
      try {
        await declineFriendRequest(request.friendship_id)
        onDeclined(request.friendship_id)
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
        <p className="text-xs text-stone-400">invited you to join their dinner circle</p>
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
// Main Friends List Component
// ---------------------------------------------------------------------------

export function FriendsList({
  initialFriends,
  initialRequests,
  inviteProfileToken,
}: {
  initialFriends: HubFriend[]
  initialRequests: HubFriend[]
  inviteProfileToken: string
}) {
  const [friends, setFriends] = useState(initialFriends)
  const [requests, setRequests] = useState(initialRequests)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const invitePath = `/my-hub/friends/invite/${inviteProfileToken}`
  const inviteUrl =
    typeof window === 'undefined' ? invitePath : `${window.location.origin}${invitePath}`

  function handleFriendRemoved(friendshipId: string) {
    setFriends((prev) => prev.filter((item) => item.friendship_id !== friendshipId))
  }

  function handleRequestAccepted(request: HubFriend) {
    const acceptedAt = new Date().toISOString()
    setRequests((prev) => prev.filter((item) => item.friendship_id !== request.friendship_id))
    setFriends((prev) => [
      {
        ...request,
        status: 'accepted',
        accepted_at: acceptedAt,
      },
      ...prev,
    ])
  }

  function handleRequestDeclined(friendshipId: string) {
    setRequests((prev) => prev.filter((item) => item.friendship_id !== friendshipId))
  }

  async function handleCopyInviteLink() {
    setCopyState('idle')
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error('Clipboard unavailable')
      }
      await navigator.clipboard.writeText(inviteUrl)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-700 bg-stone-900/80 p-4">
        <h2 className="text-lg font-semibold text-stone-100">Invite to Dinner Circle</h2>
        <p className="mt-1 text-sm text-stone-400">
          This is private and invite-only. Share this link only with people you trust.
        </p>
        <p className="mt-1 text-xs text-stone-500">
          There is no public client directory and no client-to-client browsing.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200"
          />
          <Button type="button" variant="secondary" onClick={handleCopyInviteLink}>
            <Copy className="mr-1.5 h-4 w-4" />
            Copy Link
          </Button>
          <Link href={invitePath}>
            <Button type="button" variant="ghost">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open
            </Button>
          </Link>
        </div>

        {copyState === 'copied' && (
          <p className="mt-2 text-xs text-emerald-400">Invite link copied.</p>
        )}
        {copyState === 'error' && (
          <p className="mt-2 text-xs text-red-400">
            Could not copy automatically. Copy the URL above.
          </p>
        )}
      </div>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-stone-100">
            Circle Invites ({requests.length})
          </h2>
          <div className="space-y-2">
            {requests.map((req) => (
              <PendingRequestCard
                key={req.friendship_id}
                request={req}
                onAccepted={handleRequestAccepted}
                onDeclined={handleRequestDeclined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Friends */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-stone-100">
          Dinner Circle {friends.length > 0 && `(${friends.length})`}
        </h2>

        {/* Friends Grid */}
        {friends.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {friends.map((friend) => (
              <FriendCard
                key={friend.friendship_id}
                friend={friend}
                onRemoved={handleFriendRemoved}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-700 bg-stone-900/30 py-10 text-center">
            <p className="text-sm text-stone-400">
              No circle members yet. Share your private invite link above.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
