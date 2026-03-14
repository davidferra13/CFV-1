'use client'

// Event Follow-Up Sequence Status
// Shows timeline of sent/pending/cancelled follow-up emails for a completed event.
// Includes cancel button for remaining pending sends.

import { useTransition, useState } from 'react'
import { toast } from 'sonner'
import { cancelEventFollowUp } from '@/lib/follow-up/follow-up-actions'

type FollowUpSend = {
  id: string
  step_number: number
  subject: string
  status: string
  scheduled_for: string
  sent_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
}

type Props = {
  eventId: string
  sends: FollowUpSend[]
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Scheduled' },
  sent: { bg: 'bg-green-50', text: 'text-green-700', label: 'Sent' },
  opened: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Opened' },
  clicked: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Clicked' },
  bounced: { bg: 'bg-red-50', text: 'text-red-700', label: 'Bounced' },
  skipped: { bg: 'bg-zinc-50', text: 'text-zinc-500', label: 'Cancelled' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function EventSequenceStatus({ eventId, sends: initialSends }: Props) {
  const [sends, setSends] = useState(initialSends)
  const [isPending, startTransition] = useTransition()

  const hasPending = sends.some((s) => s.status === 'pending')

  function handleCancel() {
    const previous = sends
    // Optimistic: mark all pending as skipped
    setSends((prev) =>
      prev.map((s) =>
        s.status === 'pending'
          ? {
              ...s,
              status: 'skipped',
              cancelled_at: new Date().toISOString(),
              cancel_reason: 'Manually cancelled',
            }
          : s
      )
    )

    startTransition(async () => {
      try {
        const result = await cancelEventFollowUp(eventId)
        if (!result.success) {
          setSends(previous)
          toast.error(result.error || 'Failed to cancel follow-ups')
          return
        }
        toast.success(
          `Cancelled ${result.cancelled} pending follow-up${result.cancelled === 1 ? '' : 's'}`
        )
      } catch {
        setSends(previous)
        toast.error('Failed to cancel follow-ups')
      }
    })
  }

  if (sends.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm text-zinc-500">No follow-up emails scheduled for this event.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Follow-Up Sequence</h3>
        {hasPending && (
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {isPending ? 'Cancelling...' : 'Cancel Remaining'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sends.map((send) => {
          const style = STATUS_STYLES[send.status] || STATUS_STYLES.pending

          return (
            <div
              key={send.id}
              className={`flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 ${
                send.status === 'skipped' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Step indicator */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                  {send.step_number}
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-900">{send.subject}</p>
                  <p className="text-xs text-zinc-500">
                    {send.sent_at
                      ? `Sent ${formatDate(send.sent_at)}`
                      : send.cancelled_at
                        ? `Cancelled ${formatDate(send.cancelled_at)}`
                        : `Scheduled for ${formatDate(send.scheduled_for)}`}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
              >
                {style.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
