'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import {
  acceptOnBehalf,
  cancelEvent,
  completeEvent,
  confirmEvent,
  markEventPaid,
  proposeEvent,
  startEvent,
} from '@/lib/events/transitions'
import {
  overrideReadinessForTransition,
  type GateResult,
  type ReadinessResult,
} from '@/lib/events/readiness'
import type { ServiceSimulationPanelState } from '@/lib/service-simulation/types'
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

type PendingTransition = {
  target: 'confirmed' | 'in_progress' | 'completed'
  run: () => Promise<any>
  actionLabel?: string
  redirectTo?: string
}

function getTargetStatus(status: EventStatus): PendingTransition['target'] | null {
  if (status === 'paid') return 'confirmed'
  if (status === 'confirmed') return 'in_progress'
  if (status === 'in_progress') return 'completed'
  return null
}

function isSoftGatedTarget(
  target: PendingTransition['target'] | null
): target is 'confirmed' | 'in_progress' {
  return target === 'confirmed' || target === 'in_progress'
}

function ReadinessCountPill({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'error' | 'warning' | 'info'
}) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          tone === 'error'
            ? 'text-rose-300'
            : tone === 'warning'
              ? 'text-amber-300'
              : 'text-stone-100'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function appendReturnTo(route: string, returnTo: string) {
  const separator = route.includes('?') ? '&' : '?'
  return `${route}${separator}returnTo=${encodeURIComponent(returnTo)}`
}

function ProofRow({ gate, returnTo }: { gate: GateResult; returnTo: string }) {
  const verifyHref = appendReturnTo(gate.verifyRoute, returnTo)
  const tone =
    gate.status === 'overridden'
      ? 'text-amber-300'
      : gate.status === 'stale'
        ? 'text-amber-300'
        : gate.isHardBlock
          ? 'text-rose-300'
          : gate.status === 'verified'
            ? 'text-emerald-300'
            : 'text-stone-200'

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-medium ${tone}`}>{gate.label}</p>
            <Badge
              variant={
                gate.status === 'overridden'
                  ? 'warning'
                  : gate.status === 'stale'
                    ? 'warning'
                    : gate.isHardBlock
                      ? 'error'
                      : gate.status === 'verified'
                        ? 'success'
                        : 'info'
              }
            >
              {gate.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-stone-400">{gate.details || gate.description}</p>
          {gate.overrideReason ? (
            <p className="mt-1 text-xs text-amber-400">Override: {gate.overrideReason}</p>
          ) : null}
        </div>
        <Button href={verifyHref} variant="ghost" size="sm" className="sm:shrink-0">
          {gate.ctaLabel}
        </Button>
      </div>
    </div>
  )
}

function ReadinessCard({
  eventId,
  readiness,
  simulation,
}: {
  eventId: string
  readiness: ReadinessResult | null
  simulation: ServiceSimulationPanelState | null
}) {
  if (!readiness) return null

  const hasConcerns =
    readiness.counts.blockers > 0 || readiness.counts.risks > 0 || readiness.counts.stale > 0
  const returnTo = `/events/${eventId}?tab=ops#service-simulation`

  return (
    <div
      className={`rounded-lg border p-4 ${
        readiness.counts.blockers > 0
          ? 'border-rose-800/60 bg-rose-950/20'
          : readiness.counts.stale > 0 || readiness.counts.risks > 0
            ? 'border-amber-800/60 bg-amber-950/20'
            : 'border-emerald-800/60 bg-emerald-950/10'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-stone-100">Proof-Based Readiness</p>
            <Badge
              variant={
                readiness.counts.blockers > 0 ? 'error' : hasConcerns ? 'warning' : 'success'
              }
            >
              Confidence {readiness.confidence}%
            </Badge>
            {simulation ? (
              <Badge
                variant={
                  simulation.status === 'current'
                    ? 'success'
                    : simulation.status === 'stale'
                      ? 'warning'
                      : 'info'
                }
              >
                Rehearsal {simulation.status}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-stone-300">
            {readiness.counts.blockers} blockers, {readiness.counts.risks} risks,{' '}
            {readiness.counts.stale} stale.
          </p>
          {readiness.mostLikelyFailurePoint ? (
            <p className="mt-1 text-sm text-stone-400">
              Most likely failure point: {readiness.mostLikelyFailurePoint.label}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button
            href={`/events/${eventId}?tab=ops#service-simulation`}
            variant="secondary"
            size="sm"
          >
            Open Readiness
          </Button>
          {readiness.mostLikelyFailurePoint ? (
            <Button
              href={appendReturnTo(readiness.mostLikelyFailurePoint.verifyRoute, returnTo)}
              variant="ghost"
              size="sm"
            >
              {readiness.mostLikelyFailurePoint.ctaLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function EventTransitions({
  event,
  readiness,
  simulation,
}: {
  event: Event
  readiness?: ReadinessResult | null
  simulation?: ServiceSimulationPanelState | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [pendingTransition, setPendingTransition] = useState<PendingTransition | null>(null)

  const targetStatus = getTargetStatus(event.status)
  const readinessReturnTo = `/events/${event.id}?tab=ops#service-simulation`
  const shouldPromptForReadiness =
    isSoftGatedTarget(targetStatus) &&
    Boolean(readiness) &&
    (readiness!.counts.blockers > 0 ||
      readiness!.counts.risks > 0 ||
      readiness!.counts.stale > 0 ||
      simulation?.status !== 'current')

  async function handleTransition(
    action: () => Promise<any>,
    redirectTo?: string,
    actionLabel?: string
  ) {
    setLoading(true)
    setError(null)

    try {
      const result = await action()

      if (result.success) {
        if (actionLabel) trackAction(actionLabel, event.id)
        if (result.warnings && result.warnings.length > 0) {
          for (const warning of result.warnings) {
            toast.warning(warning, { duration: 8000 })
          }
        }
        if (redirectTo) {
          router.push(redirectTo)
        } else {
          router.refresh()
        }
      } else {
        throw new Error(result.error || 'Transition failed')
      }
    } catch (err) {
      console.error('Transition error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function continuePendingTransition() {
    if (!pendingTransition) return

    const next = pendingTransition
    setPendingTransition(null)
    setLoading(true)
    setError(null)

    try {
      if (readiness && next.target !== 'completed' && readiness.counts.blockers > 0) {
        await overrideReadinessForTransition(event.id, next.target)
      }
      await handleTransition(next.run, next.redirectTo, next.actionLabel)
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : 'Failed to override readiness blockers')
    }
  }

  async function handleCancel() {
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

  function runTransition(
    run: () => Promise<any>,
    options?: { redirectTo?: string; actionLabel?: string }
  ) {
    if (targetStatus && shouldPromptForReadiness) {
      setPendingTransition({
        target: targetStatus,
        run,
        redirectTo: options?.redirectTo,
        actionLabel: options?.actionLabel,
      })
      return
    }

    void handleTransition(run, options?.redirectTo, options?.actionLabel)
  }

  if (event.status === 'completed' || event.status === 'cancelled') {
    return (
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Actions</h2>
        <p className="text-stone-500">
          This event is {event.status}. No further actions available.
        </p>
      </Card>
    )
  }

  return (
    <>
      <Card className="p-6" data-testid="event-transitions">
        <h2 className="mb-4 text-xl font-semibold">Actions</h2>

        {error ? (
          <Alert variant="error" title="Error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <div className="space-y-4">
          <ReadinessCard
            eventId={event.id}
            readiness={readiness ?? null}
            simulation={simulation ?? null}
          />

          {showCancelDialog ? (
            <div className="rounded-lg border border-red-200 bg-red-950 p-4">
              <h3 className="mb-3 text-sm font-semibold text-red-900">Cancel Event</h3>
              <Input
                label="Cancellation Reason"
                required
                placeholder="Please provide a reason for cancellation..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
              />
              <div className="mt-4 flex gap-2">
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
          ) : null}

          <div className="flex flex-wrap gap-2">
            {event.status === 'draft' ? (
              <Button
                onClick={() =>
                  runTransition(() => proposeEvent(event.id), {
                    actionLabel: 'Proposed event to client',
                  })
                }
                loading={loading}
                disabled={loading}
              >
                Propose to Client
              </Button>
            ) : null}

            {event.status === 'proposed' ? (
              <Button
                variant="secondary"
                onClick={() =>
                  runTransition(() => acceptOnBehalf(event.id), {
                    actionLabel: 'Accepted event on behalf of client',
                  })
                }
                loading={loading}
                disabled={loading}
              >
                Accept on Behalf
              </Button>
            ) : null}

            {event.status === 'accepted' || event.status === 'draft' ? (
              <Button
                variant="secondary"
                onClick={() =>
                  runTransition(() => markEventPaid(event.id), {
                    actionLabel: 'Marked event paid offline',
                  })
                }
                loading={loading}
                disabled={loading}
              >
                Mark Paid (Offline)
              </Button>
            ) : null}

            {event.status === 'paid' ? (
              <Button
                onClick={() =>
                  runTransition(() => confirmEvent(event.id), {
                    actionLabel: 'Confirmed event',
                  })
                }
                loading={loading}
                disabled={loading}
              >
                Confirm Event
              </Button>
            ) : null}

            {event.status === 'confirmed' ? (
              <Button
                onClick={() =>
                  runTransition(() => startEvent(event.id), {
                    actionLabel: 'Started event',
                  })
                }
                loading={loading}
                disabled={loading}
              >
                Mark In Progress
              </Button>
            ) : null}

            {event.status === 'in_progress' ? (
              <Button
                onClick={() =>
                  runTransition(() => completeEvent(event.id), {
                    redirectTo: `/events/${event.id}/close-out`,
                    actionLabel: 'Completed event',
                  })
                }
                loading={loading}
                disabled={loading}
              >
                Mark Completed
              </Button>
            ) : null}

            {!showCancelDialog ? (
              <Button variant="danger" onClick={() => setShowCancelDialog(true)} disabled={loading}>
                Cancel Event
              </Button>
            ) : null}
          </div>

          <div className="text-sm text-stone-400">
            {event.status === 'draft' ? (
              <p>Once proposed, the client can review and accept the event.</p>
            ) : null}
            {event.status === 'proposed' ? (
              <p>
                Waiting for client response, or accept on their behalf if they already confirmed.
              </p>
            ) : null}
            {event.status === 'accepted' ? (
              <p>
                Client accepted. Awaiting payment via Stripe, or mark paid if payment was received
                offline.
              </p>
            ) : null}
            {event.status === 'paid' ? (
              <p>
                Payment is in. Confirm when the operational proof looks solid enough to move
                forward.
              </p>
            ) : null}
            {event.status === 'confirmed' ? (
              <p>Starting service is gated by current proof, not a manual checklist.</p>
            ) : null}
            {event.status === 'in_progress' ? (
              <p>
                Completion stays soft here. Proof remains visible, but it does not hard-stop
                wrap-up.
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <ConfirmModal
        open={Boolean(pendingTransition && readiness)}
        title={
          readiness?.counts.blockers
            ? 'Readiness blockers need an explicit override'
            : 'Proceed with current readiness signal?'
        }
        description={
          readiness
            ? `Confidence ${readiness.confidence}%. ${readiness.counts.blockers} blockers, ${readiness.counts.risks} risks, ${readiness.counts.stale} stale.`
            : undefined
        }
        confirmLabel={readiness?.counts.blockers ? 'Override and Continue' : 'Continue'}
        cancelLabel="Go Back"
        loading={loading}
        onCancel={() => setPendingTransition(null)}
        onConfirm={() => {
          void continuePendingTransition()
        }}
        maxWidth="max-w-2xl"
      >
        {readiness ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ReadinessCountPill label="Confidence" value={readiness.confidence} tone="info" />
              <ReadinessCountPill label="Blockers" value={readiness.counts.blockers} tone="error" />
              <ReadinessCountPill label="Risks" value={readiness.counts.risks} tone="warning" />
              <ReadinessCountPill label="Stale" value={readiness.counts.stale} tone="warning" />
            </div>

            <div className="space-y-2">
              {readiness.gates
                .filter((gate) => gate.status !== 'verified')
                .map((gate) => (
                  <ProofRow key={gate.gate} gate={gate} returnTo={readinessReturnTo} />
                ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                href={`/events/${event.id}?tab=ops#service-simulation`}
                variant="secondary"
                size="sm"
              >
                Review Readiness
              </Button>
              {readiness.mostLikelyFailurePoint ? (
                <Button
                  href={appendReturnTo(
                    readiness.mostLikelyFailurePoint.verifyRoute,
                    readinessReturnTo
                  )}
                  variant="ghost"
                  size="sm"
                >
                  {readiness.mostLikelyFailurePoint.ctaLabel}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </ConfirmModal>
    </>
  )
}
