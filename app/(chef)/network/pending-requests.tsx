// Pending Requests - Show incoming and outgoing connection requests
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChefCard } from '@/components/network/chef-card'
import { respondToConnectionRequest } from '@/lib/network/actions'
import type { PendingRequest } from '@/lib/network/actions'

interface PendingRequestsProps {
  requests: PendingRequest[]
}

export function PendingRequests({ requests: initialRequests }: PendingRequestsProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const received = requests.filter((r) => r.direction === 'received')
  const sent = requests.filter((r) => r.direction === 'sent')

  if (requests.length === 0) return null

  function handleRespond(connectionId: string, action: 'accept' | 'decline') {
    setError(null)
    startTransition(async () => {
      try {
        await respondToConnectionRequest({ connection_id: connectionId, action })
        setRequests((prev) => prev.filter((r) => r.id !== connectionId))
      } catch (err: any) {
        setError(err.message || `Failed to ${action} request`)
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {received.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">
            Received ({received.length})
          </h4>
          {received.map((req) => (
            <div key={req.id}>
              <ChefCard
                displayName={req.display_name}
                businessName={req.business_name}
                bio={req.request_message}
                profileImageUrl={null}
                city={req.city}
                state={req.state}
                actions={
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleRespond(req.id, 'accept')}
                      disabled={isPending}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRespond(req.id, 'decline')}
                      disabled={isPending}
                    >
                      Decline
                    </Button>
                  </div>
                }
              />
            </div>
          ))}
        </div>
      )}

      {sent.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">
            Sent ({sent.length})
          </h4>
          {sent.map((req) => (
            <ChefCard
              key={req.id}
              displayName={req.display_name}
              businessName={req.business_name}
              bio={null}
              profileImageUrl={null}
              city={req.city}
              state={req.state}
              actions={<Badge variant="default">Pending</Badge>}
            />
          ))}
        </div>
      )}
    </div>
  )
}
