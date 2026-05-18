'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CalendarCheck } from '@/components/ui/icons'
import { rescheduleEventWithFee } from '@/lib/events/reschedule-actions'
import { calculateRescheduleFee } from '@/lib/events/fee-schedule-actions'
import type { RescheduleHistoryEntry } from '@/lib/events/reschedule-history-actions'
import { toast } from 'sonner'

const RESCHEDULABLE_STATUSES = ['draft', 'proposed', 'accepted', 'paid', 'confirmed']

type Props = {
  eventId: string
  eventStatus: string
  currentDate: string
  history?: RescheduleHistoryEntry[]
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

export function RescheduleEventModal({ eventId, eventStatus, currentDate, history = [] }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [reason, setReason] = useState('')
  const [initiatedBy, setInitiatedBy] = useState<'chef' | 'client'>('chef')
  const [waiveFee, setWaiveFee] = useState(false)
  const [waiveReason, setWaiveReason] = useState('')
  const [feeCents, setFeeCents] = useState<number | null>(null)
  const [feeDescription, setFeeDescription] = useState<string | null>(null)
  const [feeLoading, setFeeLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  const fetchFeePreview = useCallback(
    async (date: string) => {
      if (!date || date === currentDate) {
        setFeeCents(null)
        setFeeDescription(null)
        return
      }

      setFeeLoading(true)
      try {
        const result = await calculateRescheduleFee(eventId, date)
        if (result.error) {
          setFeeCents(null)
          setFeeDescription(result.error)
        } else {
          setFeeCents(result.fee_cents)
          setFeeDescription(result.tier_description)
        }
      } catch {
        setFeeCents(null)
        setFeeDescription('Could not calculate fee')
      } finally {
        setFeeLoading(false)
      }
    },
    [eventId, currentDate]
  )

  useEffect(() => {
    if (!open || !newDate) return
    const timeout = window.setTimeout(() => fetchFeePreview(newDate), 300)
    return () => window.clearTimeout(timeout)
  }, [open, newDate, fetchFeePreview])

  if (!RESCHEDULABLE_STATUSES.includes(eventStatus)) return null

  const resetForm = () => {
    setNewDate('')
    setReason('')
    setInitiatedBy('chef')
    setWaiveFee(false)
    setWaiveReason('')
    setFeeCents(null)
    setFeeDescription(null)
  }

  const handleOpen = () => {
    resetForm()
    setOpen(true)
  }

  const handleSubmit = () => {
    if (!newDate) {
      toast.error('Please select a new date')
      return
    }

    if (newDate === currentDate) {
      toast.error('New date must be different from the current date')
      return
    }

    setSubmitting(true)
    startTransition(async () => {
      try {
        const result = await rescheduleEventWithFee(eventId, {
          newDate,
          reason: reason || undefined,
          initiatedBy,
          waiveFee,
          waiveReason: waiveFee ? waiveReason || undefined : undefined,
        })

        if (result.success) {
          const feeMessage =
            result.fee_cents && result.fee_cents > 0
              ? ` Fee: ${formatFee(result.fee_cents)}${result.fee_waived ? ' waived.' : '.'}`
              : ''
          toast.success(`Event rescheduled to ${newDate}.${feeMessage}`)
          setOpen(false)
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to reschedule event')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to reschedule event')
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
        Keep Date
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={handleSubmit}
        disabled={submitting || isPending || !newDate || newDate === currentDate}
        loading={submitting || isPending}
      >
        {submitting || isPending ? 'Rescheduling...' : 'Reschedule'}
      </Button>
    </>
  )

  return (
    <>
      <Button variant="secondary" size="sm" onClick={handleOpen}>
        <CalendarCheck className="h-4 w-4" />
        Reschedule
      </Button>

      <AccessibleDialog
        open={open}
        title="Reschedule Event"
        description={`Current date: ${formatDate(currentDate)}.`}
        onClose={() => setOpen(false)}
        footer={footer}
        widthClassName="max-w-xl"
      >
        <div className="space-y-4">
          <Input
            label="New Event Date"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
          />

          {newDate && newDate !== currentDate && (
            <div className="rounded-lg border border-stone-700 bg-stone-900/70 px-3 py-2">
              {feeLoading ? (
                <p className="text-sm text-stone-400">Calculating fee...</p>
              ) : feeCents !== null && feeCents > 0 ? (
                <div>
                  <p className="text-sm text-stone-300">
                    Reschedule fee:{' '}
                    <span className="font-semibold text-amber-400">{formatFee(feeCents)}</span>
                  </p>
                  {feeDescription && (
                    <p className="mt-0.5 text-xs text-stone-400">{feeDescription}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-stone-400">
                  {feeDescription || 'No fee applies for this reschedule'}
                </p>
              )}
            </div>
          )}

          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-stone-300">Initiated By</label>
            <select
              value={initiatedBy}
              onChange={(e) => setInitiatedBy(e.target.value as 'chef' | 'client')}
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="chef">Chef</option>
              <option value="client">Client</option>
            </select>
          </div>

          <Textarea
            label="Reason"
            helperText="Optional. This is saved to the reschedule history."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this event being rescheduled?"
            rows={2}
          />

          {feeCents !== null && feeCents > 0 && (
            <div className="space-y-2 rounded-lg border border-stone-700 bg-stone-900/60 p-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={waiveFee}
                  onChange={(e) => setWaiveFee(e.target.checked)}
                  className="rounded border-stone-600 bg-stone-900 text-brand-600 focus:ring-brand-500/20"
                />
                <span className="text-sm text-stone-300">Waive fee</span>
              </label>
              {waiveFee && (
                <Input
                  label="Waive Reason"
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="Reason for waiving the fee"
                />
              )}
            </div>
          )}

          {history.length > 0 && (
            <div className="rounded-lg border border-stone-700 bg-stone-900/60">
              <div className="flex items-center justify-between border-b border-stone-800 px-3 py-2">
                <p className="text-sm font-medium text-stone-200">Reschedule History</p>
                <Badge variant="info">{history.length}</Badge>
              </div>
              <div className="max-h-48 divide-y divide-stone-800 overflow-auto">
                {history.map((entry) => (
                  <div key={entry.id} className="px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-stone-200">
                      <span>{formatDate(entry.original_date)}</span>
                      <span className="text-stone-500">to</span>
                      <span>{formatDate(entry.new_date)}</span>
                      <Badge variant={entry.fee_waived ? 'success' : 'default'}>
                        {entry.fee_waived ? 'Fee waived' : formatFee(entry.fee_cents)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {entry.initiated_by === 'client' ? 'Client' : 'Chef'} initiated on{' '}
                      {new Date(entry.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    {entry.reason && <p className="mt-1 text-xs text-stone-400">{entry.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AccessibleDialog>
    </>
  )
}
