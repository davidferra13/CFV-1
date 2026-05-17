'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SmsDraftWithClient } from '@/lib/sms/triage-actions'

// ---------------------------------------------------------------------------
// Single draft card: shows original SMS, Remy's draft, approve/edit/reject
// ---------------------------------------------------------------------------

function SmsDraftCard({ draft }: { draft: SmsDraftWithClient }) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(draft.edited_response || draft.draft_response)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const runAction = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    startTransition(async () => {
      try {
        setError(null)
        const result = await action()
        if (!result.success) {
          setError(result.error || 'Action failed.')
          return
        }
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error.')
      }
    })
  }

  const handleApprove = () => {
    import('@/lib/sms/triage-actions').then(({ approveSmsDraft }) =>
      runAction(() => approveSmsDraft({ draftId: draft.id }))
    )
  }

  const handleReject = () => {
    import('@/lib/sms/triage-actions').then(({ rejectSmsDraft }) =>
      runAction(() => rejectSmsDraft({ draftId: draft.id }))
    )
  }

  const handleSaveEdit = () => {
    if (!editText.trim()) return
    import('@/lib/sms/triage-actions').then(({ editSmsDraft }) =>
      runAction(async () => {
        const result = await editSmsDraft({
          draftId: draft.id,
          editedResponse: editText.trim(),
        })
        if (result.success) setIsEditing(false)
        return result
      })
    )
  }

  const confidenceLabel =
    draft.confidence_score >= 0.7
      ? 'High confidence'
      : draft.confidence_score >= 0.5
        ? 'Medium confidence'
        : 'Low confidence'

  const confidenceColor =
    draft.confidence_score >= 0.7
      ? 'text-emerald-400'
      : draft.confidence_score >= 0.5
        ? 'text-amber-400'
        : 'text-red-400'

  const ageMinutes = Math.round((Date.now() - new Date(draft.created_at).getTime()) / (1000 * 60))
  const ageLabel =
    ageMinutes < 1
      ? 'Just now'
      : ageMinutes < 60
        ? `${ageMinutes}m ago`
        : `${Math.round(ageMinutes / 60)}h ago`

  const category = (draft.context_used as any)?.category || 'general'

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-stone-800/50 border-b border-stone-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">💬</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-100 truncate">
                {draft.client_name || draft.sender_phone}
              </span>
              {draft.client_name && (
                <span className="text-xs text-stone-500">{draft.sender_phone}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>{ageLabel}</span>
              <span>&#183;</span>
              <span className="capitalize">{category}</span>
              {draft.escalation_level > 0 && (
                <>
                  <span>&#183;</span>
                  <span className="text-amber-400">Escalated (level {draft.escalation_level})</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs ${confidenceColor}`}>{confidenceLabel}</span>
          <Badge variant="default" className="text-xs">
            SMS
          </Badge>
        </div>
      </div>

      {/* Original message */}
      <div className="px-4 py-3 border-b border-stone-800">
        <p className="text-xs text-stone-500 mb-1">Received</p>
        <p className="text-sm text-stone-200 whitespace-pre-wrap">{draft.original_message}</p>
      </div>

      {/* Draft response */}
      <div className="px-4 py-3 bg-brand-950/20 border-b border-stone-800">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs text-brand-400">Remy&apos;s suggested reply</p>
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y min-h-[80px]"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              maxLength={1600}
              disabled={isPending}
              aria-label="Edit SMS reply"
              placeholder="Edit the reply before sending..."
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500">{editText.length}/1600</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false)
                    setEditText(draft.edited_response || draft.draft_response)
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={isPending}>
                  Save Edit
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-100 whitespace-pre-wrap">
            {draft.edited_response || draft.draft_response}
          </p>
        )}
      </div>

      {/* Actions */}
      {error && <div className="px-4 py-2 text-xs text-red-400 bg-red-950/30">{error}</div>}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex gap-2">
          {draft.thread_id && (
            <Link
              href={`/inbox/triage/${draft.thread_id}`}
              className="text-xs text-stone-400 hover:text-stone-200 underline underline-offset-2"
            >
              View thread
            </Link>
          )}
        </div>
        {!isEditing && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-stone-400 hover:text-red-400"
              onClick={handleReject}
              disabled={isPending}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(true)}
              disabled={isPending}
            >
              Edit
            </Button>
            <Button size="sm" onClick={handleApprove} disabled={isPending}>
              {isPending ? 'Sending...' : 'Approve & Send'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel: renders all pending SMS drafts, designed to embed in inbox page
// ---------------------------------------------------------------------------

export function SmsTriage({ drafts }: { drafts: SmsDraftWithClient[] }) {
  if (drafts.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-stone-100">SMS Replies Waiting</h2>
          <Badge variant="default" className="text-xs">
            {drafts.length}
          </Badge>
        </div>
        <p className="text-xs text-stone-500">
          Remy drafted these replies. Review and approve to send.
        </p>
      </div>
      {drafts.map((draft) => (
        <SmsDraftCard key={draft.id} draft={draft} />
      ))}
    </div>
  )
}
