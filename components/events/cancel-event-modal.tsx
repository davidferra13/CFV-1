'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, XCircle } from '@/components/ui/icons'
import { cancelEvent } from '@/lib/events/cancel-actions'
import { getEventCancellationPreview } from '@/lib/events/cancellation-actions'
import type { CancellationPreview } from '@/lib/events/cancellation-actions'
import { calculateRescheduleFee, getFeeSchedule } from '@/lib/events/fee-schedule-actions'
import type { FeeScheduleEntry } from '@/lib/events/fee-schedule-actions'
import { toast } from 'sonner'

const NON_CANCELLABLE = ['cancelled', 'completed']

type Props = {
  eventId: string
  eventStatus: string
}

function formatFee(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(date: string) {
  const value = date.includes('T') ? date : `${date}T00:00:00`
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTierValue(tier: FeeScheduleEntry) {
  if (tier.fee_type === 'flat') return formatFee(tier.fee_value)
  return `${tier.fee_value / 100}%`
}

function formatTierWindow(tier: FeeScheduleEntry) {
  if (tier.days_before_min === tier.days_before_max) {
    return `${tier.days_before_min} days before`
  }
  return `${tier.days_before_min}-${tier.days_before_max} days before`
}

export function CancelEventModal({ eventId, eventStatus }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [initiatedBy, setInitiatedBy] = useState<'chef' | 'client' | 'mutual'>('chef')
  const [notifyStaff, setNotifyStaff] = useState(true)
  const [notifyVendors, setNotifyVendors] = useState(true)
  const [confirmedTerms, setConfirmedTerms] = useState(false)
  const [feeCents, setFeeCents] = useState<number | null>(null)
  const [feeDescription, setFeeDescription] = useState<string | null>(null)
  const [feeSchedule, setFeeSchedule] = useState<FeeScheduleEntry[]>([])
  const [preview, setPreview] = useState<CancellationPreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  const fetchCancellationDetails = useCallback(async () => {
    setLoadingDetails(true)
    setLoadError(null)

    try {
      const [feeResult, scheduleResult, previewResult] = await Promise.all([
        calculateRescheduleFee(eventId, ''),
        getFeeSchedule(),
        getEventCancellationPreview(eventId),
      ])

      if (feeResult.error) {
        setFeeCents(null)
        setFeeDescription(feeResult.error)
      } else {
        setFeeCents(feeResult.fee_cents)
        setFeeDescription(feeResult.tier_description)
      }

      if (scheduleResult.error) {
        setFeeSchedule([])
        setLoadError(scheduleResult.error)
      } else {
        setFeeSchedule(scheduleResult.data)
      }

      if (previewResult.error || !previewResult.data) {
        setPreview(null)
        setLoadError(previewResult.error ?? 'Could not load cancellation policy preview')
      } else {
        setPreview(previewResult.data)
      }
    } catch {
      setLoadError('Could not load cancellation details')
      setFeeCents(null)
      setFeeSchedule([])
      setPreview(null)
    } finally {
      setLoadingDetails(false)
    }
  }, [eventId])

  useEffect(() => {
    if (open) {
      fetchCancellationDetails()
    }
  }, [open, fetchCancellationDetails])

  if (NON_CANCELLABLE.includes(eventStatus)) return null

  const handleOpen = () => {
    setOpen(true)
    setReason('')
    setInitiatedBy('chef')
    setNotifyStaff(true)
    setNotifyVendors(true)
    setConfirmedTerms(false)
    setFeeCents(null)
    setFeeDescription(null)
    setFeeSchedule([])
    setPreview(null)
    setLoadError(null)
  }

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }

    if (!confirmedTerms) {
      toast.error('Please confirm that you reviewed the fee and policy details')
      return
    }

    setSubmitting(true)
    startTransition(async () => {
      try {
        const result = await cancelEvent(eventId, {
          reason: reason.trim(),
          initiatedBy,
          notifyStaff,
          notifyVendors,
        })

        if (result.success) {
          const feeMessage =
            result.cancellation_fee_cents && result.cancellation_fee_cents > 0
              ? ` Cancellation fee: ${formatFee(result.cancellation_fee_cents)}.`
              : ''
          toast.success(`Event cancelled.${feeMessage}`)
          setOpen(false)
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to cancel event')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to cancel event')
      } finally {
        setSubmitting(false)
      }
    })
  }

  const footer = (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(false)}
        disabled={submitting || isPending}
      >
        Keep Event
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={handleSubmit}
        disabled={
          submitting ||
          isPending ||
          loadingDetails ||
          !!loadError ||
          !reason.trim() ||
          !confirmedTerms
        }
        loading={submitting || isPending}
      >
        {submitting || isPending ? 'Cancelling...' : 'Confirm Cancellation'}
      </Button>
    </>
  )

  return (
    <>
      <Button variant="danger" size="sm" onClick={handleOpen}>
        <XCircle className="h-4 w-4" />
        Cancel
      </Button>

      <AccessibleDialog
        open={open}
        title="Cancel Event"
        description="Review the cancellation fee and policy before confirming."
        onClose={() => setOpen(false)}
        footer={footer}
        widthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-red-700/40 bg-red-950/30 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-200">
              This will cancel the booking, notify selected teams, and close active event work. The
              status change is terminal.
            </p>
          </div>

          {loadingDetails && (
            <div className="rounded-lg border border-stone-700 bg-stone-900/70 px-3 py-2 text-sm text-stone-400">
              Loading cancellation fee and policy...
            </div>
          )}

          {loadError && (
            <div className="rounded-lg border border-red-700/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {loadError}
            </div>
          )}

          {!loadingDetails && !loadError && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-stone-700 bg-stone-900/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-200">Cancellation Fee</p>
                  {feeCents !== null && feeCents > 0 ? (
                    <Badge variant="warning">{formatFee(feeCents)}</Badge>
                  ) : (
                    <Badge variant="success">No fee</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-stone-400">
                  {feeDescription || 'No matching fee tier applies for this event.'}
                </p>
                {feeSchedule.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {feeSchedule.map((tier) => (
                      <div
                        key={tier.id}
                        className="flex items-center justify-between gap-3 text-xs text-stone-500"
                      >
                        <span>{tier.description || formatTierWindow(tier)}</span>
                        <span className="font-medium text-stone-300">{formatTierValue(tier)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {preview && (
                <div className="rounded-lg border border-stone-700 bg-stone-900/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-200">Policy Preview</p>
                    <Badge variant={preview.gracePeriodApplies ? 'success' : 'default'}>
                      {preview.applicableTier.label}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    {preview.eventTitle ?? 'Untitled Event'} on {formatDate(preview.eventDate)}.
                  </p>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-stone-500">Total paid</span>
                      <span className="text-stone-300">{formatFee(preview.totalPaidCents)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-stone-500">Refund amount</span>
                      <span className="text-emerald-400">
                        {formatFee(preview.refundAmountCents)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-stone-800 pt-1">
                      <span className="text-stone-300">Fee retained</span>
                      <span className="font-medium text-amber-400">
                        {formatFee(preview.feeRetainedCents)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    {preview.policyName}: {preview.applicableTier.refund_percent}% refund,{' '}
                    {preview.daysUntilEvent} day{preview.daysUntilEvent === 1 ? '' : 's'} before
                    event.
                  </p>
                </div>
              )}
            </div>
          )}

          <Textarea
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this event being cancelled?"
            rows={3}
            required
          />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-stone-300">
                Initiated By
              </label>
              <select
                value={initiatedBy}
                onChange={(e) => setInitiatedBy(e.target.value as 'chef' | 'client' | 'mutual')}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="chef">Chef</option>
                <option value="client">Client</option>
                <option value="mutual">Mutual</option>
              </select>
            </div>

            <div className="space-y-2 rounded-lg border border-stone-700 bg-stone-900/60 p-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyStaff}
                  onChange={(e) => setNotifyStaff(e.target.checked)}
                  className="rounded border-stone-600 bg-stone-900 text-brand-600 focus:ring-brand-500/20"
                />
                <span className="text-sm text-stone-300">Notify staff</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyVendors}
                  onChange={(e) => setNotifyVendors(e.target.checked)}
                  className="rounded border-stone-600 bg-stone-900 text-brand-600 focus:ring-brand-500/20"
                />
                <span className="text-sm text-stone-300">Notify vendors</span>
              </label>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-800/70 bg-amber-950/30 p-3">
            <input
              type="checkbox"
              checked={confirmedTerms}
              onChange={(e) => setConfirmedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-600 bg-stone-900 text-brand-600 focus:ring-brand-500/20"
            />
            <span className="text-sm text-amber-100">
              I reviewed the cancellation fee, refund policy, notifications, and cancellation
              reason.
            </span>
          </label>
        </div>
      </AccessibleDialog>
    </>
  )
}
