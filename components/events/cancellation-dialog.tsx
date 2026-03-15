'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getEventCancellationPreview } from '@/lib/events/cancellation-actions'
import type { CancellationPreview } from '@/lib/events/cancellation-actions'

type CancellationDialogProps = {
  eventId: string
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CancellationDialog({ eventId, open, onClose, onConfirm }: CancellationDialogProps) {
  const [preview, setPreview] = useState<CancellationPreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Load preview when dialog opens
  useEffect(() => {
    if (!open) {
      setPreview(null)
      setLoadError(null)
      setConfirmed(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)

    getEventCancellationPreview(eventId)
      .then((result) => {
        if (result.error || !result.data) {
          setLoadError(result.error ?? 'Could not load cancellation details')
          setPreview(null)
        } else {
          setPreview(result.data)
        }
      })
      .catch(() => {
        setLoadError('Could not load cancellation details')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [open, eventId])

  function handleConfirm() {
    if (!confirmed) {
      toast.error('Please confirm you understand the cancellation terms.')
      return
    }
    startTransition(() => {
      onConfirm()
    })
  }

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={onClose} disabled={isPending}>
        Keep Event
      </Button>
      <Button
        variant="danger"
        onClick={handleConfirm}
        disabled={!confirmed || isPending || isLoading || !!loadError}
      >
        {isPending ? 'Cancelling...' : 'Cancel Event'}
      </Button>
    </div>
  )

  return (
    <AccessibleDialog
      open={open}
      title="Cancel Event"
      description="Review the cancellation terms before proceeding."
      onClose={onClose}
      footer={footer}
    >
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          Loading cancellation details...
        </div>
      )}

      {loadError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {loadError}
        </div>
      )}

      {preview && !isLoading && (
        <div className="space-y-4">
          {/* Event info */}
          <div className="rounded-md border p-3 space-y-1">
            <p className="text-sm font-medium">{preview.eventTitle ?? 'Untitled Event'}</p>
            <p className="text-sm text-muted-foreground">{formatDate(preview.eventDate)}</p>
            <p className="text-sm text-muted-foreground">
              {preview.daysUntilEvent} day{preview.daysUntilEvent !== 1 ? 's' : ''} away
            </p>
          </div>

          {/* Policy tier */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Policy</span>
              <span className="text-sm text-muted-foreground">{preview.policyName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tier</span>
              <Badge variant={preview.gracePeriodApplies ? 'success' : 'default'}>
                {preview.applicableTier.label}
              </Badge>
            </div>
            {preview.gracePeriodApplies && (
              <p className="text-xs text-green-600 dark:text-green-400">
                This booking is within the {preview.policyName} grace period. Full refund applies.
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Refund rate</span>
              <span className="text-sm">{preview.applicableTier.refund_percent}%</span>
            </div>
          </div>

          {/* Financial breakdown */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total paid</span>
              <span className="text-sm">{formatCents(preview.totalPaidCents)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Refund amount</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {formatCents(preview.refundAmountCents)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-sm font-medium">Fee retained</span>
              <span className="text-sm font-medium">{formatCents(preview.feeRetainedCents)}</span>
            </div>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 cursor-pointer dark:border-amber-800 dark:bg-amber-950">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              I understand that cancelling this event will result in a{' '}
              <strong>{formatCents(preview.feeRetainedCents)}</strong> cancellation fee
              {preview.refundAmountCents > 0 && (
                <>
                  {' '}
                  and a <strong>{formatCents(preview.refundAmountCents)}</strong> refund to the
                  client
                </>
              )}
              . This action cannot be undone.
            </span>
          </label>
        </div>
      )}
    </AccessibleDialog>
  )
}
