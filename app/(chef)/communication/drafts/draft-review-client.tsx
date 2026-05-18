'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  approveDraft,
  rejectDraft,
  type ScheduledMessage,
} from '@/lib/communication/scheduled-message-actions'

// ==========================================
// TYPES
// ==========================================

type DraftReviewClientProps = {
  initialDrafts: ScheduledMessage[]
  initialError: string | null
}

// ==========================================
// HELPERS
// ==========================================

function channelLabel(channel: string): string {
  switch (channel) {
    case 'email':
      return 'Email'
    case 'sms':
      return 'SMS'
    case 'app':
      return 'In-App'
    default:
      return channel
  }
}

function channelColor(channel: string): string {
  switch (channel) {
    case 'email':
      return 'bg-blue-900/50 text-blue-300 border-blue-700/50'
    case 'sms':
      return 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50'
    case 'app':
      return 'bg-purple-900/50 text-purple-300 border-purple-700/50'
    default:
      return 'bg-stone-800 text-stone-300 border-stone-600'
  }
}

function contextLabel(type: string | null): string {
  if (!type) return 'General'
  switch (type) {
    case 'inquiry':
      return 'Inquiry'
    case 'event':
      return 'Event'
    case 'client':
      return 'Client'
    default:
      return type
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return iso
  }
}

function toDatetimeLocal(iso: string): string {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

// ==========================================
// COMPONENT
// ==========================================

export function DraftReviewClient({ initialDrafts, initialError }: DraftReviewClientProps) {
  const [drafts, setDrafts] = useState<ScheduledMessage[]>(initialDrafts)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editTime, setEditTime] = useState('')
  const [isPending, startTransition] = useTransition()

  if (initialError) {
    return (
      <Card className="border-red-800/50 bg-red-950/30 p-6">
        <p className="text-sm text-red-300">Failed to load drafts: {initialError}</p>
      </Card>
    )
  }

  if (drafts.length === 0) {
    return (
      <Card className="border-stone-700/50 bg-stone-800/50 p-8 text-center">
        <p className="text-stone-400">
          No drafts to review. When signals are detected, actionable drafts will appear here.
        </p>
      </Card>
    )
  }

  function expandDraft(draft: ScheduledMessage) {
    if (expandedId === draft.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(draft.id)
    setEditSubject(draft.subject ?? '')
    setEditBody(draft.body)
    setEditTime(toDatetimeLocal(draft.scheduled_for))
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      try {
        const edits: {
          subject?: string
          body?: string
          scheduled_for?: string
        } = {}

        const draft = drafts.find((d) => d.id === id)
        if (!draft) return

        if (editSubject !== (draft.subject ?? '')) {
          edits.subject = editSubject
        }
        if (editBody !== draft.body) {
          edits.body = editBody
        }
        if (editTime) {
          const newIso = new Date(editTime).toISOString()
          if (newIso !== draft.scheduled_for) {
            edits.scheduled_for = newIso
          }
        }

        const result = await approveDraft(id, Object.keys(edits).length > 0 ? edits : undefined)

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Draft approved and scheduled for sending')
        setDrafts((prev) => prev.filter((d) => d.id !== id))
        setExpandedId(null)
      } catch {
        toast.error('Something went wrong while approving')
      }
    })
  }

  function handleReject(id: string) {
    startTransition(async () => {
      try {
        const result = await rejectDraft(id)

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Draft rejected and cancelled')
        setDrafts((prev) => prev.filter((d) => d.id !== id))
        setExpandedId(null)
      } catch {
        toast.error('Something went wrong while rejecting')
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        {drafts.length} draft{drafts.length !== 1 ? 's' : ''} pending review
      </p>

      {drafts.map((draft) => {
        const isExpanded = expandedId === draft.id

        return (
          <Card
            key={draft.id}
            className="border-stone-700/50 bg-stone-800/60 transition-colors hover:border-stone-600/50"
          >
            {/* Collapsed row */}
            <button
              type="button"
              onClick={() => expandDraft(draft)}
              className="flex w-full items-start gap-3 p-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Badge className={channelColor(draft.channel)}>
                    {channelLabel(draft.channel)}
                  </Badge>
                  {draft.context_type && (
                    <Badge className="border-stone-600 bg-stone-800 text-stone-300">
                      {contextLabel(draft.context_type)}
                    </Badge>
                  )}
                  <Badge className="border-amber-700/50 bg-amber-900/30 text-amber-300">
                    AI Generated
                  </Badge>
                </div>

                <p className="text-sm font-medium text-stone-200">
                  {draft.subject || '(No subject)'}
                </p>
                {!isExpanded && (
                  <p className="mt-0.5 text-xs text-stone-400">{truncate(draft.body, 120)}</p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs text-stone-400">{formatDate(draft.scheduled_for)}</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {isExpanded ? 'Click to collapse' : 'Click to expand'}
                </p>
              </div>
            </button>

            {/* Expanded editor */}
            {isExpanded && (
              <div className="border-t border-stone-700/50 p-4">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-400">Subject</label>
                    <Input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      placeholder="Message subject"
                      className="border-stone-600 bg-stone-900 text-stone-100 placeholder:text-stone-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-400">Body</label>
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={6}
                      className="border-stone-600 bg-stone-900 text-stone-100 placeholder:text-stone-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-400">
                      Scheduled Send Time
                    </label>
                    <Input
                      type="datetime-local"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="border-stone-600 bg-stone-900 text-stone-100"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={() => handleApprove(draft.id)}
                      disabled={isPending}
                      className="bg-emerald-700 text-white hover:bg-emerald-600"
                    >
                      {isPending ? 'Saving...' : 'Approve & Schedule'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleReject(draft.id)}
                      disabled={isPending}
                      className="border border-red-800/50 text-red-400 hover:bg-red-950/50 hover:text-red-300"
                    >
                      {isPending ? 'Saving...' : 'Reject'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
