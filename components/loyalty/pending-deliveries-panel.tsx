'use client'

// Chef-facing panel: shows loyalty rewards that have been redeemed by clients
// but not yet delivered. Chef marks them as delivered after honouring at an event.

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { markRewardDelivered, cancelRewardDelivery } from '@/lib/loyalty/auto-award'
import type { PendingDeliveryWithClient } from '@/lib/loyalty/auto-award'

const REWARD_TYPE_LABELS: Record<string, string> = {
  discount_fixed: 'Fixed Discount',
  discount_percent: 'Percent Discount',
  free_course: 'Free Course',
  free_dinner: 'Free Dinner',
  upgrade: 'Upgrade',
}

function DeliveryRow({ delivery, onUpdate }: {
  delivery: PendingDeliveryWithClient
  onUpdate: () => void
}) {
  const [showDeliverForm, setShowDeliverForm] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDeliver() {
    setError(null)
    startTransition(async () => {
      try {
        await markRewardDelivered(delivery.id, undefined, note || undefined)
        setShowDeliverForm(false)
        onUpdate()
      } catch (err: any) {
        setError(err?.message || 'Failed to mark as delivered')
      }
    })
  }

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      try {
        await cancelRewardDelivery(delivery.id, note || undefined)
        setShowCancelForm(false)
        onUpdate()
      } catch (err: any) {
        setError(err?.message || 'Failed to cancel delivery')
      }
    })
  }

  return (
    <div className="border border-stone-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/clients/${delivery.client_id}`}
              className="font-semibold text-stone-900 hover:text-brand-600 truncate"
            >
              {delivery.clients?.full_name || 'Unknown client'}
            </Link>
            <Badge variant={delivery.redeemed_by === 'client' ? 'info' : 'default'}>
              {delivery.redeemed_by === 'client' ? 'Client redeemed' : 'Chef redeemed'}
            </Badge>
          </div>
          <p className="text-sm font-medium text-stone-800 mt-1">{delivery.reward_name}</p>
          <p className="text-xs text-stone-500">
            {REWARD_TYPE_LABELS[delivery.reward_type] || delivery.reward_type}
            · {delivery.points_spent} pts spent
            · Redeemed {format(new Date(delivery.created_at), 'MMM d, yyyy')}
          </p>
        </div>
        <Badge variant="warning">Pending Delivery</Badge>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {!showDeliverForm && !showCancelForm && (
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowDeliverForm(true)}
            disabled={isPending}
          >
            Mark Delivered
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCancelForm(true)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      )}

      {showDeliverForm && (
        <div className="space-y-2">
          <p className="text-sm text-stone-600">
            Mark this reward as delivered. Add an optional note (e.g., &ldquo;Delivered at Spring Dinner 3/15&rdquo;).
          </p>
          <input
            type="text"
            placeholder="Optional delivery note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleDeliver} disabled={isPending}>
              {isPending ? 'Saving...' : 'Confirm Delivered'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowDeliverForm(false); setNote('') }}
              disabled={isPending}
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {showCancelForm && (
        <div className="space-y-2">
          <p className="text-sm text-stone-600">
            Cancel this pending delivery. Points already deducted will not be restored.
            If a refund is needed, use &ldquo;Award Bonus Points&rdquo; on the client profile.
          </p>
          <input
            type="text"
            placeholder="Reason for cancellation (optional)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={handleCancel} disabled={isPending}>
              {isPending ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowCancelForm(false); setNote('') }}
              disabled={isPending}
            >
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function PendingDeliveriesPanel({
  deliveries: initialDeliveries,
}: {
  deliveries: PendingDeliveryWithClient[]
}) {
  const [deliveries, setDeliveries] = useState(initialDeliveries)

  // Refresh by removing delivered/cancelled items from local state immediately
  // (page will revalidate in background via revalidatePath)
  function handleUpdate() {
    // Optimistically remove — actual data refresh via server revalidation
    window.location.reload()
  }

  if (deliveries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Reward Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">
            No pending deliveries. When clients redeem rewards, they will appear here so you know what to deliver at their next event.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-amber-900">
            Pending Reward Deliveries
          </CardTitle>
          <Badge variant="warning">{deliveries.length}</Badge>
        </div>
        <p className="text-sm text-amber-700 mt-1">
          These rewards have been redeemed and are waiting to be honoured at a client&apos;s next event.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {deliveries.map((delivery) => (
          <DeliveryRow
            key={delivery.id}
            delivery={delivery}
            onUpdate={handleUpdate}
          />
        ))}
      </CardContent>
    </Card>
  )
}
