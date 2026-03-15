'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { getBidHistory } from '@/lib/finance/catering-bid-actions'

type BidHistoryItem = {
  id: string
  quoteName: string | null
  clientName: string | null
  totalCents: number
  perPersonCents: number | null
  guestCount: number | null
  status: string
  createdAt: string
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function statusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="default">Draft</Badge>
    case 'sent':
      return <Badge variant="info">Sent</Badge>
    case 'accepted':
      return <Badge variant="success">Accepted</Badge>
    case 'rejected':
      return <Badge variant="error">Rejected</Badge>
    case 'expired':
      return <Badge variant="warning">Expired</Badge>
    default:
      return <Badge variant="default">{status}</Badge>
  }
}

export function CateringBidHistory({
  onViewBid,
}: {
  onViewBid?: (quoteId: string) => void
}) {
  const [items, setItems] = useState<BidHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getBidHistory()
      .then((data) => {
        if (!cancelled) {
          setItems(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load bid history'
          )
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading bid history...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        <p>{error}</p>
      </Alert>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <p>No catering bids yet.</p>
          <p className="text-sm mt-1">
            Create your first bid using the calculator above.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bid History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">
                    {item.quoteName || 'Untitled Bid'}
                  </p>
                  {statusBadge(item.status)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.clientName && <span>{item.clientName} - </span>}
                  {new Date(item.createdAt).toLocaleDateString()}
                  {item.guestCount && (
                    <span> - {item.guestCount} guests</span>
                  )}
                </p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="font-semibold text-sm">
                  {formatCents(item.totalCents)}
                </p>
                {item.perPersonCents != null && (
                  <p className="text-xs text-gray-500">
                    {formatCents(item.perPersonCents)}/person
                  </p>
                )}
              </div>
              {onViewBid && (
                <Button
                  variant="ghost"
                  className="ml-2"
                  onClick={() => onViewBid(item.id)}
                >
                  View
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
