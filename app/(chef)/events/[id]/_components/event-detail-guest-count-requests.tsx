'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils/currency'
import { reviewGuestCountChange, type GuestCountChange } from '@/lib/guests/count-changes'

function getStatusBadge(status: GuestCountChange['status']) {
  switch (status) {
    case 'approved':
      return <Badge variant="success">Approved</Badge>
    case 'rejected':
      return <Badge variant="error">Rejected</Badge>
    default:
      return <Badge variant="warning">Pending</Badge>
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

export function EventDetailGuestCountRequests({
  changes,
}: {
  changes: GuestCountChange[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [activeChangeId, setActiveChangeId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const pendingChanges = changes.filter(
    (change) => change.status === 'pending' && change.requested_by_role === 'client'
  )
  const history = changes.slice(0, 6)

  function submitDecision(changeId: string, decision: 'approved' | 'rejected') {
    setError(null)
    setActiveChangeId(changeId)

    startTransition(async () => {
      const result = await reviewGuestCountChange({
        changeId,
        decision,
        reviewNotes: reviewNotes[changeId]?.trim() || undefined,
      })

      if (!result.success) {
        setError(result.error || 'Could not review the guest-count request.')
        setActiveChangeId(null)
        return
      }

      router.refresh()
    })
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Guest Count Requests</h2>
          <p className="mt-1 text-sm text-stone-500">
            Review client booking-change requests without leaving the event financial view.
          </p>
        </div>
        <Badge variant={pendingChanges.length > 0 ? 'warning' : 'default'}>
          {pendingChanges.length > 0 ? `${pendingChanges.length} pending` : 'No pending requests'}
        </Badge>
      </div>

      {error ? <Alert className="mt-4" variant="error">{error}</Alert> : null}

      <div className="mt-4 space-y-4">
        {pendingChanges.length === 0 ? (
          <div className="rounded-lg border border-stone-700 bg-stone-900/40 p-4 text-sm text-stone-400">
            No client guest-count requests are waiting on review for this event.
          </div>
        ) : (
          pendingChanges.map((change) => {
            const isWorking = isPending && activeChangeId === change.id
            return (
              <div
                key={change.id}
                className="rounded-lg border border-amber-700/50 bg-amber-950/15 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-stone-100">
                        {change.previous_count} to {change.new_count} guests
                      </p>
                      {getStatusBadge(change.status)}
                    </div>
                    <p className="text-xs text-stone-400">
                      Requested {format(new Date(change.created_at), 'PPP')}
                    </p>
                    <p className="text-xs text-stone-400">
                      Estimated price change: {describePriceDelta(change)}
                    </p>
                    {change.notes ? (
                      <p className="text-xs text-stone-400">Client note: {change.notes}</p>
                    ) : null}
                  </div>
                  <div className="text-xs text-stone-500">Booking change review</div>
                </div>

                <div className="mt-4 space-y-3">
                  <Textarea
                    label="Chef response"
                    value={reviewNotes[change.id] ?? ''}
                    onChange={(event) =>
                      setReviewNotes((current) => ({
                        ...current,
                        [change.id]: event.target.value,
                      }))
                    }
                    placeholder="Optional note for the client"
                    maxLength={500}
                    showCount
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      loading={isWorking}
                      onClick={() => submitDecision(change.id, 'approved')}
                    >
                      Approve Change
                    </Button>
                    <Button
                      variant="danger"
                      loading={isWorking}
                      onClick={() => submitDecision(change.id, 'rejected')}
                    >
                      Reject Change
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-6 border-t border-stone-800 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-300">Recent history</h3>
          <span className="text-xs text-stone-500">{history.length} item(s)</span>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-stone-500">No guest-count history for this event yet.</p>
        ) : (
          history.map((change) => (
            <div key={change.id} className="rounded-lg border border-stone-800 bg-stone-950/40 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-stone-100">
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
                    Requested by {change.requested_by_role}
                  </p>
                </div>
                <p className="text-xs text-stone-400">
                  Price delta: {describePriceDelta(change)}
                </p>
              </div>

              {change.notes ? (
                <p className="mt-2 text-xs text-stone-400">Request note: {change.notes}</p>
              ) : null}
              {change.review_notes ? (
                <p className="mt-1 text-xs text-stone-400">Review note: {change.review_notes}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
