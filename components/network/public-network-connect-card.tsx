'use client'

import { useState, useTransition } from 'react'
import { sendConnectionRequest } from '@/lib/network/actions'
import { Button } from '@/components/ui/button'
import { Handshake, UserPlus } from '@/components/ui/icons'
import { toast } from 'sonner'

type ViewerRole = 'guest' | 'client' | 'chef'
type ConnectionState =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'accepted'
  | 'declined'
  | 'self'

export function PublicNetworkConnectCard({
  chefId,
  chefName,
  viewerRole,
  connectionState,
  acceptingRequests,
}: {
  chefId: string
  chefName: string
  viewerRole: ViewerRole
  connectionState: ConnectionState
  acceptingRequests: boolean
}) {
  const [status, setStatus] = useState<ConnectionState>(connectionState)
  const [isPending, startTransition] = useTransition()

  function requestConnection() {
    startTransition(async () => {
      try {
        await sendConnectionRequest({ addressee_id: chefId })
        setStatus('pending_sent')
        toast.success('Connection request sent')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to send connection request')
      }
    })
  }

  if (viewerRole !== 'chef') {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-900/70 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Join the chef network</h2>
        <p className="mt-1 text-sm text-stone-400">
          Sign in with your chef account, or create one, to connect with {chefName}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/auth/signin">
            <Handshake className="h-4 w-4" />
            Sign in
          </Button>
          <Button variant="secondary" href="/auth/signup">
            <UserPlus className="h-4 w-4" />
            Create chef account
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'self') {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-900/70 p-5">
        <h2 className="text-lg font-semibold text-stone-100">This is your connect QR</h2>
        <p className="mt-1 text-sm text-stone-400">
          Share it at pop-ups, dinners, or industry events so other chefs can find you.
        </p>
        <div className="mt-4">
          <Button href="/network?tab=connections" variant="secondary">
            Open my connections
          </Button>
        </div>
      </div>
    )
  }

  if (!acceptingRequests) {
    return (
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/40 p-5">
        <h2 className="text-lg font-semibold text-amber-200">Requests are currently closed</h2>
        <p className="mt-1 text-sm text-amber-100/80">
          {chefName} is not accepting new chef-network requests right now.
        </p>
      </div>
    )
  }

  if (status === 'accepted') {
    return (
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-5">
        <h2 className="text-lg font-semibold text-emerald-200">Already connected</h2>
        <p className="mt-1 text-sm text-emerald-100/80">
          You and {chefName} are already connected in ChefFlow.
        </p>
        <div className="mt-4">
          <Button href={`/network/${chefId}`} variant="secondary">
            View profile
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'pending_received') {
    return (
      <div className="rounded-xl border border-blue-700/40 bg-blue-950/30 p-5">
        <h2 className="text-lg font-semibold text-blue-200">Request awaiting your response</h2>
        <p className="mt-1 text-sm text-blue-100/80">
          {chefName} has already requested to connect with you.
        </p>
        <div className="mt-4">
          <Button href="/network?tab=connections" variant="secondary">
            Review request
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'pending_sent') {
    return (
      <div className="rounded-xl border border-blue-700/40 bg-blue-950/30 p-5">
        <h2 className="text-lg font-semibold text-blue-200">Connection request sent</h2>
        <p className="mt-1 text-sm text-blue-100/80">
          {chefName} will see your request in their ChefFlow network inbox.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900/70 p-5">
      <h2 className="text-lg font-semibold text-stone-100">Connect with {chefName}</h2>
      <p className="mt-1 text-sm text-stone-400">
        Send a chef-to-chef network request from this QR landing page.
      </p>
      <div className="mt-4">
        <Button onClick={requestConnection} disabled={isPending}>
          <Handshake className="h-4 w-4" />
          {isPending ? 'Sending...' : 'Send connection request'}
        </Button>
      </div>
    </div>
  )
}
