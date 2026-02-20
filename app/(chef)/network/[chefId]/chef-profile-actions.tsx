'use client'

import { useState, useTransition } from 'react'
import { followChef, unfollowChef } from '@/lib/social/chef-social-actions'
import { sendConnectionRequest } from '@/lib/network/actions'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck, Handshake } from 'lucide-react'

export function ChefProfileActions({
  chefId,
  isFollowing: initialFollowing,
  isConnected,
}: {
  chefId: string
  isFollowing: boolean
  isConnected: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [connected, setConnected] = useState(isConnected)
  const [requestSent, setRequestSent] = useState(false)
  const [pending, startTransition] = useTransition()

  function toggleFollow() {
    const next = !following
    setFollowing(next)
    startTransition(async () => {
      if (next) await followChef(chefId)
      else await unfollowChef(chefId)
    })
  }

  function sendRequest() {
    setRequestSent(true)
    startTransition(async () => {
      await sendConnectionRequest({ addressee_id: chefId })
    })
  }

  return (
    <div className="flex flex-col gap-2 flex-shrink-0">
      <Button
        variant={following ? 'secondary' : 'primary'}
        onClick={toggleFollow}
        disabled={pending}
        className="text-sm gap-1.5"
      >
        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {following ? 'Following' : 'Follow'}
      </Button>

      {!connected && !requestSent && (
        <Button
          variant="secondary"
          onClick={sendRequest}
          disabled={pending}
          className="text-sm gap-1.5"
        >
          <Handshake className="h-4 w-4" />
          Connect
        </Button>
      )}

      {(connected || requestSent) && (
        <div className="flex items-center gap-1.5 text-xs text-stone-500 justify-center">
          <Handshake className="h-3.5 w-3.5" />
          {connected ? 'Connected' : 'Request sent'}
        </div>
      )}
    </div>
  )
}
