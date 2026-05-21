'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { composeBroadcast, sendNow, cancelBroadcast } from '@/lib/dinner-circles/broadcasts'

type AudienceType = 'all' | 'missing_rsvp' | 'missing_dietary' | 'bring_list_assignees' | 'custom'
type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed'

interface Broadcast {
  id: string
  audience_type: AudienceType
  message: string
  status: BroadcastStatus
  channel: string
  scheduled_at: string | null
  sent_at: string | null
  cancelled_at: string | null
  recipient_count: number | null
  created_at: string
}

interface BroadcastComposerProps {
  circleId: string
  history: Broadcast[]
  onRefresh?: () => void
}

const AUDIENCE_LABELS: Record<AudienceType, string> = {
  all: 'All members',
  missing_rsvp: 'Missing RSVP',
  missing_dietary: 'Missing dietary info',
  bring_list_assignees: 'Bring list assignees',
  custom: 'Custom selection',
}

const STATUS_COLOR: Record<BroadcastStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-800',
  cancelled: 'bg-muted text-muted-foreground line-through',
  failed: 'bg-red-100 text-red-700',
}

export function BroadcastComposer({ circleId, history, onRefresh }: BroadcastComposerProps) {
  const [isPending, startTransition] = useTransition()
  const [showCompose, setShowCompose] = useState(false)
  const [audienceType, setAudienceType] = useState<AudienceType>('all')
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState<'in_app' | 'email'>('in_app')
  const [draftId, setDraftId] = useState<string | null>(null)

  const remaining = 2000 - message.length

  function handleCompose() {
    if (!message.trim()) return
    startTransition(async () => {
      try {
        const result = await composeBroadcast({
          circleId,
          audienceType,
          message: message.trim(),
          channel,
        })
        setDraftId(result.broadcastId)
        toast.success('Draft saved')
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to save draft')
      }
    })
  }

  function handleSendNow(broadcastId: string) {
    startTransition(async () => {
      try {
        const result = await sendNow({ circleId, broadcastId })
        toast.success(
          `Sent to ${result.recipientCount} member${result.recipientCount !== 1 ? 's' : ''}`
        )
        setDraftId(null)
        setMessage('')
        setShowCompose(false)
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to send')
      }
    })
  }

  function handleCancel(broadcastId: string) {
    startTransition(async () => {
      try {
        await cancelBroadcast({ circleId, broadcastId })
        toast.success('Broadcast cancelled')
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to cancel')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Circle Broadcasts</h3>
        {!showCompose && (
          <button
            onClick={() => setShowCompose(true)}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
          >
            + New broadcast
          </button>
        )}
      </div>

      {showCompose && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <p className="text-sm font-medium">Compose a message</p>

          {/* Audience */}
          <div className="space-y-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="broadcast-audience"
            >
              Audience
            </label>
            <select
              id="broadcast-audience"
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value as AudienceType)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {Object.entries(AUDIENCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Channel */}
          <div className="space-y-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="broadcast-channel"
            >
              Channel
            </label>
            <select
              id="broadcast-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as 'in_app' | 'email')}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="in_app">In-app notification</option>
              <option value="email">Email</option>
            </select>
          </div>

          {/* Message */}
          <div className="space-y-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="broadcast-message"
            >
              Message
            </label>
            <textarea
              id="broadcast-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message to your circle..."
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={4}
              maxLength={2000}
            />
            <p
              className={`text-xs text-right ${remaining < 100 ? 'text-red-500' : 'text-muted-foreground'}`}
            >
              {remaining} characters left
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {!draftId ? (
              <button
                onClick={handleCompose}
                disabled={!message.trim() || isPending}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Save draft
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSendNow(draftId)}
                  disabled={isPending}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Send now
                </button>
                <button
                  onClick={() => handleCancel(draftId)}
                  disabled={isPending}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Discard
                </button>
              </>
            )}
            <button
              onClick={() => {
                setShowCompose(false)
                setDraftId(null)
                setMessage('')
              }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Sent history
          </p>
          <ul className="space-y-2">
            {history.map((b) => (
              <li key={b.id} className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{b.message}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[b.status]}`}
                    >
                      {b.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {AUDIENCE_LABELS[b.audience_type]}
                    </span>
                    {b.recipient_count != null && (
                      <span className="text-xs text-muted-foreground">
                        {b.recipient_count} recipient{b.recipient_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {b.sent_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(b.sent_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {(b.status === 'draft' || b.status === 'scheduled') && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleSendNow(b.id)}
                      disabled={isPending}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => handleCancel(b.id)}
                      disabled={isPending}
                      className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length === 0 && !showCompose && (
        <p className="text-sm text-muted-foreground">No broadcasts sent yet.</p>
      )}
    </div>
  )
}
