'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils/currency'
import {
  requestClientGuestCountChange,
  type ClientGuestCountChangeCenter,
  type GuestCountChange,
} from '@/lib/guests/count-changes'

function getStatusBadge(status: GuestCountChange['status']) {
  switch (status) {
    case 'approved':
      return <Badge variant="success">Approved</Badge>
    case 'rejected':
      return <Badge variant="error">Declined</Badge>
    default:
      return <Badge variant="warning">Pending Review</Badge>
  }
}

function describePriceDelta(change: GuestCountChange) {
  const totalDeltaCents = (change.price_impact_cents ?? 0) + (change.surcharge_cents ?? 0)
  if (totalDeltaCents === 0) {
    return 'No automatic price change'
  }

  const direction = totalDeltaCents > 0 ? '+' : '-'
  return `${direction}${formatCurrency(Math.abs(totalDeltaCents))}`
}

export function GuestCountChangeCard({
  eventId,
  currentGuestCount,
  center,
}: {
  eventId: string
  currentGuestCount: number | null
  center: ClientGuestCountChangeCenter
}) {
  const router = useRouter()
  const [newCount, setNewCount] = useState(String(currentGuestCount ?? 1))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const pendingRequest = center.pendingRequest
  const requestHistory = center.history.slice(0, 5)
  const cutoffLabel = center.policy.cutoffAt
    ? format(new Date(center.policy.cutoffAt), 'PPP')
    : null

  function submitRequest() {
    const parsedCount = Number(newCount)
    if (!Number.isInteger(parsedCount) || parsedCount < 1) {
      setError('Enter a valid guest count.')
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await requestClientGuestCountChange({
        eventId,
        newCount: parsedCount,
        notes: notes.trim() || undefined,
      })

      if (!result.success) {
        setError(result.error || 'Could not submit the guest-count request.')
        return
      }

      router.refresh()
    })
  }

  return (
    <Card id="booking-change-center" className="mb-6">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Booking Change Center</CardTitle>
            <p className="mt-1 text-sm text-stone-400">
              Request a guest-count change and track chef review in one place.
            </p>
          </div>
          {pendingRequest ? <Badge variant="warning">Chef Review Needed</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
          <p className="text-sm font-medium text-stone-200">
            Current guest count: {currentGuestCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-stone-400">{center.policy.summary}</p>
          {cutoffLabel ? (
            <p className="mt-1 text-xs text-stone-500">Policy cutoff: {cutoffLabel}</p>
          ) : null}
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}

        {pendingRequest ? (
          <div className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-200">
                  Requested {pendingRequest.new_count} guests
                </p>
                <p className="text-xs text-amber-400">
                  Submitted {format(new Date(pendingRequest.created_at), 'PPP')}
                </p>
              </div>
              {getStatusBadge(pendingRequest.status)}
            </div>
            <p className="text-sm text-stone-300">
              Requested change: {pendingRequest.previous_count} to {pendingRequest.new_count} guests
            </p>
            <p className="text-xs text-stone-400">
              Estimated price change: {describePriceDelta(pendingRequest)}
            </p>
            {pendingRequest.notes ? (
              <p className="text-xs text-stone-400">Your note: {pendingRequest.notes}</p>
            ) : null}
          </div>
        ) : center.policy.canRequest ? (
          <div className="space-y-3 rounded-lg border border-stone-700 bg-stone-900/50 p-4">
            <div className="grid gap-3 sm:grid-cols-[200px,1fr]">
              <Input
                label="New guest count"
                type="number"
                min={1}
                max={500}
                value={newCount}
                onChange={(event) => setNewCount(event.target.value)}
              />
              <Textarea
                label="What changed?"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional context for your chef"
                maxLength={500}
                showCount
                rows={3}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button loading={isPending} onClick={submitRequest}>
                Submit Guest-Count Request
              </Button>
              <p className="text-xs text-stone-500">
                Your chef will review the request before the booking changes.
              </p>
            </div>
          </div>
        ) : (
          <Alert variant="warning">
            {center.policy.reason || 'Guest-count requests are not available for this booking.'}
          </Alert>
        )}

        <div className="space-y-3 border-t border-stone-800 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-200">Guest-count history</h3>
            <span className="text-xs text-stone-500">{requestHistory.length} recent update(s)</span>
          </div>

          {requestHistory.length === 0 ? (
            <p className="text-sm text-stone-500">No guest-count changes have been recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {requestHistory.map((change) => (
                <div
                  key={change.id}
                  className="rounded-lg border border-stone-800 bg-stone-950/40 p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-stone-200">
                          {change.previous_count} to {change.new_count} guests
                        </p>
                        {getStatusBadge(change.status)}
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        Requested {format(new Date(change.created_at), 'PPP')}
                        {change.reviewed_at
                          ? ` - reviewed ${format(new Date(change.reviewed_at), 'PPP')}`
                          : ''}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">
                        Requested by {change.requested_by_role === 'client' ? 'you' : 'your chef'}
                      </p>
                    </div>
                    <p className="text-xs text-stone-400">
                      Price adjustment: {describePriceDelta(change)}
                    </p>
                  </div>

                  {change.notes ? (
                    <p className="mt-2 text-xs text-stone-400">Request note: {change.notes}</p>
                  ) : null}
                  {change.review_notes ? (
                    <p className="mt-1 text-xs text-stone-400">Chef note: {change.review_notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
