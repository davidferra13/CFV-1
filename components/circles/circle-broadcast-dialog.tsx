'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { broadcastToCircle } from '@/lib/hub/circle-broadcast-actions'

interface CircleBroadcastDialogProps {
  circleId: string
  circleName: string
  open: boolean
  onClose: () => void
}

export function CircleBroadcastDialog({
  circleId,
  circleName,
  open,
  onClose,
}: CircleBroadcastDialogProps) {
  const [message, setMessage] = useState('')
  const [includeEmail, setIncludeEmail] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!open) return null

  const charCount = message.length
  const isOverLimit = charCount > 500
  const canSend = message.trim().length > 0 && !isOverLimit && !isPending

  const handleSend = () => {
    if (!canSend) return
    startTransition(async () => {
      try {
        const result = await broadcastToCircle(circleId, message, { includeEmail })
        if (result.success) {
          toast.success(
            `Broadcast sent to ${result.recipientCount} member${result.recipientCount === 1 ? '' : 's'}`
          )
          setMessage('')
          setIncludeEmail(false)
          onClose()
        } else {
          toast.error(result.error ?? 'Failed to send broadcast')
        }
      } catch {
        toast.error('Failed to send broadcast')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-md rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-stone-100">Broadcast to {circleName}</h2>
        <p className="mt-1 text-sm text-stone-400">Send a message to all members of this circle.</p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          rows={5}
          className="mt-4 w-full resize-none rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
        />

        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-stone-500'}`}>
            {charCount}/500
          </span>
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={includeEmail}
            onChange={(e) => setIncludeEmail(e.target.checked)}
            className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-stone-300">Also send via email</span>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-sm text-stone-400 hover:text-stone-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {isPending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </div>
    </div>
  )
}
