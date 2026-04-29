'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  adminDeactivateHubGroup,
  adminHideSocialPost,
  adminSoftDeleteChatMessage,
  adminSoftDeleteHubMessage,
} from '@/lib/admin/owner-moderation-actions'

const CONFIRM_PHRASE = 'MODERATE'

type OwnerModerationKind = 'chat_message' | 'hub_message' | 'social_post' | 'hub_group'

type Props = {
  kind: OwnerModerationKind
  targetId: string
}

export function OwnerModerationForm({ kind, targetId }: Props) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const phraseMatches = confirmPhrase.trim().toUpperCase() === CONFIRM_PHRASE
  const reasonValid = reason.trim().length >= 3
  const canSubmit = phraseMatches && reasonValid && !isPending

  const label =
    kind === 'chat_message'
      ? 'Soft-delete message'
      : kind === 'hub_message'
        ? 'Soft-delete hub message'
        : kind === 'social_post'
          ? 'Hide post'
          : 'Deactivate group'

  function submitModeration() {
    if (!canSubmit) return
    const reasonValue = reason.trim()

    startTransition(async () => {
      setFeedback(null)
      try {
        if (kind === 'chat_message') {
          await adminSoftDeleteChatMessage(targetId, reasonValue)
        } else if (kind === 'hub_message') {
          await adminSoftDeleteHubMessage(targetId, reasonValue)
        } else if (kind === 'social_post') {
          await adminHideSocialPost(targetId, reasonValue)
        } else {
          await adminDeactivateHubGroup(targetId, reasonValue)
        }
        setFeedback({ ok: true, message: `${label} complete` })
        setReason('')
        setConfirmPhrase('')
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Moderation action failed'
        setFeedback({ ok: false, message })
      }
    })
  }

  return (
    <div className="rounded-lg border border-red-800/40 bg-red-950/20 p-3 space-y-2">
      <p className="text-xs font-semibold text-red-300 uppercase tracking-wide">{label}</p>
      <div className="space-y-1.5">
        <label className="block text-xs text-stone-400">Reason (required)</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          className="w-full rounded-md border border-stone-700 bg-stone-900 px-2 py-1.5 text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-red-400"
          placeholder="Explain why this moderation action is necessary"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs text-stone-400">
          Type <span className="font-mono text-stone-200">{CONFIRM_PHRASE}</span> to confirm
        </label>
        <input
          value={confirmPhrase}
          onChange={(event) => setConfirmPhrase(event.target.value)}
          className="w-full rounded-md border border-stone-700 bg-stone-900 px-2 py-1.5 text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-red-400"
          placeholder={CONFIRM_PHRASE}
        />
      </div>
      <button
        type="button"
        onClick={submitModeration}
        disabled={!canSubmit}
        className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-stone-100 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-red-600"
      >
        {isPending ? 'Applying...' : label}
      </button>
      {feedback ? (
        <p className={`text-xs ${feedback.ok ? 'text-emerald-300' : 'text-red-300'}`}>
          {feedback.message}
        </p>
      ) : null}
    </div>
  )
}
