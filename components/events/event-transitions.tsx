// Event Transitions Component
// Shows action buttons for transitioning event status based on current state.
// Readiness gates are shown inline — hard blocks disable the button, soft blocks warn.
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
  cancelEvent,
} from '@/lib/events/transitions'
import type { ReadinessResult, GateResult } from '@/lib/events/readiness'
import { trackAction } from '@/lib/ai/remy-activity-tracker'

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

// ─── Inline gate list shown before action buttons ────────────────────────────

function GateList({ blockers }: { blockers: GateResult[] }) {
  if (blockers.length === 0) return null

  const hardBlocks = blockers.filter((g) => g.isHardBlock)
  const softWarnings = blockers.filter((g) => !g.isHardBlock)

  return (
    <div className="space-y-2">
      {/* Hard blocks — must be resolved before proceeding */}
      {hardBlocks.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-950 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-red-900">Required before proceeding:</p>
          {hardBlocks.map((g) => (
            <div key={g.gate} className="flex items-start gap-2">
              <span className="mt-0.5 text-xs font-bold shrink-0 text-red-600">✕</span>
              <div>
                <p className="text-xs font-medium text-red-800">{g.label}</p>
                <p className="text-[11px] text-stone-500 mt-0.5">{g.description}</p>
                {g.details && (
                  <p className="text-[11px] text-red-600 mt-0.5 font-medium">{g.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Soft warnings — you can still proceed, but these are recommended */}
      {softWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-950 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-900">
            Recommended before proceeding (you can still continue):
          </p>
          {softWarnings.map((g) => (
            <div key={g.gate} className="flex items-start gap-2">
              <span className="mt-0.5 text-xs font-bold shrink-0 text-amber-500">!</span>
              <div>
                <p className="text-xs font-medium text-amber-800">{g.label}</p>
                <p className="text-[11px] text-stone-500 mt-0.5">{g.description}</p>
                {g.details && (
                  <p className="text-[11px] text-amber-700 mt-0.5 font-medium">{g.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EventTransitions({
  event,
  readiness,
}: {
  event: Event
  readiness?: ReadinessResult | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')

  const handleTransition = async (
    action: () => Promise<any>,
    redirectTo?: string,
    actionLabel?: string
  ) => {
    setLoading(true)
    setError(null)

    try {
      const result = await action()

      if (result.success) {
        if (actionLabel) trackAction(actionLabel, event.id)
        if (redirectTo) {
          router.push(redirectTo)
        } else {
          router.refresh()
        }
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

    await handleTransition(
      () => cancelEvent(event.id, cancellationReason),
      undefined,
      'Cancelled event'
    )
    setShowCancelDialog(false)
    setCancellationReason('')
  }

  // Derive gate blockers for the current transition from the passed readiness result
  const blockers: GateResult[] = readiness?.blockers ?? []
  const isHardBlocked = readiness?.hardBlocked ?? false

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
        {/* Readiness gate warnings — shown for transitions that have blockers */}
        {blockers.length > 0 && <GateList blockers={blockers} />}

        {/* Cancel Dialog */}
        {showCancelDialog && (
          <div className="border border-red-200 rounded-lg p-4 bg-red-950">
            <h3 className="text-sm font-semibold text-red-900 mb-3">Cancel Event</h3>
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
              onClick={() =>
                handleTransition(
                  () => proposeEvent(event.id),
                  undefined,
                  'Proposed event to client'
                )
              }
              loading={loading}
              disabled={loading || isHardBlocked}
              title={isHardBlocked ? 'Resolve required items above before sending' : undefined}
            >
              Send to Client
            </Button>
          )}

          {event.status === 'paid' && (
            <Button
              onClick={() =>
                handleTransition(() => confirmEvent(event.id), undefined, 'Confirmed event')
              }
              loading={loading}
              disabled={loading || isHardBlocked}
              title={isHardBlocked ? 'Resolve required items above before confirming' : undefined}
            >
              Confirm Event
            </Button>
          )}

          {event.status === 'confirmed' && (
            <Button
              onClick={() =>
                handleTransition(() => startEvent(event.id), undefined, 'Started event')
              }
              loading={loading}
              disabled={loading || isHardBlocked}
              title={isHardBlocked ? 'Resolve required items above before starting' : undefined}
            >
              Start Event
            </Button>
          )}

          {event.status === 'in_progress' && (
            <Button
              onClick={() =>
                handleTransition(
                  () => completeEvent(event.id),
                  `/events/${event.id}/close-out`,
                  'Completed event'
                )
              }
              loading={loading}
              disabled={loading || isHardBlocked}
              title={isHardBlocked ? 'Resolve required items above before completing' : undefined}
            >
              Finish Event
            </Button>
          )}

          {/* Cancel button available for all non-terminal states */}
          {!showCancelDialog && (
            <Button variant="danger" onClick={() => setShowCancelDialog(true)} disabled={loading}>
              Cancel Event
            </Button>
          )}
        </div>

        {/* Status-specific help text */}
        <div className="text-sm text-stone-400 mt-4">
          {event.status === 'draft' && (
            <p>
              Once sent, the client will be able to view and accept this event. Make sure all
              details are correct before sending.
            </p>
          )}
          {event.status === 'proposed' && (
            <p>
              Waiting for the client to review and accept. The event will move to &ldquo;Paid&rdquo;
              once payment is received.
            </p>
          )}
          {event.status === 'accepted' && (
            <p>
              Client accepted! Waiting for payment to come through. The event will move to
              &ldquo;Paid&rdquo; once payment succeeds.
            </p>
          )}
          {event.status === 'paid' && (
            <p>Payment received! Confirm the event to move forward with preparations.</p>
          )}
          {event.status === 'confirmed' && (
            <p>
              Event is confirmed and prep is underway. Start the event when you're on-site and ready
              to go.
            </p>
          )}
          {event.status === 'in_progress' && (
            <p>Event is underway. Finish it when you're done and cleaned up.</p>
          )}
        </div>
      </div>
    </Card>
  )
}
