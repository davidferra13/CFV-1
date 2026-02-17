// Event Transitions Component
// Shows action buttons for transitioning event status based on current state
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import {
  proposeEvent,
  confirmEvent,
  startEvent,
  completeEvent,
  cancelEvent
} from '@/lib/events/transitions'

type EventStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'paid'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

type Event = {
  id: string
  status: EventStatus
}

export function EventTransitions({ event }: { event: Event }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')

  const handleTransition = async (action: () => Promise<any>) => {
    setLoading(true)
    setError(null)

    try {
      const result = await action()

      if (result.success) {
        router.refresh()
      } else {
        throw new Error('Transition failed')
      }
    } catch (err) {
      console.error('Transition error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      setError('Please provide a cancellation reason')
      return
    }

    await handleTransition(() => cancelEvent(event.id, cancellationReason))
    setShowCancelDialog(false)
    setCancellationReason('')
  }

  // Terminal states - no actions available
  if (event.status === 'completed' || event.status === 'cancelled') {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <p className="text-stone-500">
          This event is {event.status}. No further actions available.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Actions</h2>

      {error && (
        <Alert variant="error" title="Error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        {/* Cancel Dialog */}
        {showCancelDialog && (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <h3 className="text-sm font-semibold text-red-900 mb-3">
              Cancel Event
            </h3>
            <Input
              label="Cancellation Reason"
              required
              placeholder="Please provide a reason for cancellation..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                loading={loading}
                disabled={loading || !cancellationReason.trim()}
              >
                Confirm Cancellation
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowCancelDialog(false)
                  setCancellationReason('')
                  setError(null)
                }}
                disabled={loading}
              >
                Nevermind
              </Button>
            </div>
          </div>
        )}

        {/* Primary Actions based on status */}
        <div className="flex flex-wrap gap-2">
          {event.status === 'draft' && (
            <Button
              onClick={() => handleTransition(() => proposeEvent(event.id))}
              loading={loading}
              disabled={loading}
            >
              Propose to Client
            </Button>
          )}

          {event.status === 'paid' && (
            <Button
              onClick={() => handleTransition(() => confirmEvent(event.id))}
              loading={loading}
              disabled={loading}
            >
              Confirm Event
            </Button>
          )}

          {event.status === 'confirmed' && (
            <Button
              onClick={() => handleTransition(() => startEvent(event.id))}
              loading={loading}
              disabled={loading}
            >
              Mark In Progress
            </Button>
          )}

          {event.status === 'in_progress' && (
            <Button
              onClick={() => handleTransition(() => completeEvent(event.id))}
              loading={loading}
              disabled={loading}
            >
              Mark Completed
            </Button>
          )}

          {/* Cancel button available for all non-terminal states */}
          {!showCancelDialog && (
            <Button
              variant="danger"
              onClick={() => setShowCancelDialog(true)}
              disabled={loading}
            >
              Cancel Event
            </Button>
          )}
        </div>

        {/* Status-specific help text */}
        <div className="text-sm text-stone-600 mt-4">
          {event.status === 'draft' && (
            <p>
              Once proposed, the client will be able to view and accept this event. Make sure all
              details are correct before proposing.
            </p>
          )}
          {event.status === 'proposed' && (
            <p>
              Waiting for client to accept the proposal. The event will automatically move to
              &ldquo;Paid&rdquo; status once payment is received.
            </p>
          )}
          {event.status === 'accepted' && (
            <p>
              Client has accepted. Waiting for payment to be processed. The event will
              automatically move to &ldquo;Paid&rdquo; status once payment succeeds.
            </p>
          )}
          {event.status === 'paid' && (
            <p>
              Payment received! Confirm the event to move forward with preparations.
            </p>
          )}
          {event.status === 'confirmed' && (
            <p>
              Event is confirmed. Mark as &ldquo;In Progress&rdquo; when the event begins.
            </p>
          )}
          {event.status === 'in_progress' && (
            <p>
              Event is currently in progress. Mark as completed when finished.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
