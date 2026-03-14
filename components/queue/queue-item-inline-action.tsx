'use client'

// Queue Item Inline Action - Zero-navigation completion from dashboard
// Renders expandable action forms (respond, record payment, send follow-up)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, X } from '@/components/ui/icons'
import type { InlineAction, InlineActionType } from '@/lib/queue/types'

interface Props {
  action: InlineAction
  onComplete: () => void
  onCancel: () => void
}

const ACTION_LABELS: Record<InlineActionType, { button: string; placeholder: string }> = {
  respond_inquiry: {
    button: 'Send Response',
    placeholder: 'Write your response to this inquiry...',
  },
  send_followup: { button: 'Send Follow-Up', placeholder: 'Write your follow-up message...' },
  record_payment: { button: 'Record Payment', placeholder: 'Add a note about this payment...' },
  send_message: { button: 'Send Message', placeholder: 'Write your message...' },
  log_expense: { button: 'Log Expense', placeholder: 'Describe this expense...' },
}

export function QueueItemInlineAction({ action, onComplete, onCancel }: Props) {
  const [message, setMessage] = useState(
    action.prefill.draftMessage ?? action.prefill.suggestedResponse ?? ''
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const labels = ACTION_LABELS[action.type]

  async function handleSubmit() {
    setError(null)

    startTransition(async () => {
      try {
        // Dynamic import to avoid loading all server actions upfront
        switch (action.type) {
          case 'respond_inquiry': {
            const { sendReplyViaChannel } = await import('@/lib/communication/actions')
            await sendReplyViaChannel({
              channelId: action.prefill.channelId ?? '',
              message,
              replyToId: action.prefill.replyToId,
            })
            break
          }
          case 'send_followup':
          case 'send_message': {
            const { sendChatMessage } = await import('@/lib/chat/actions')
            await sendChatMessage({
              conversationId: action.prefill.conversationId ?? '',
              content: message,
            })
            break
          }
          case 'record_payment': {
            const { recordPayment } = await import('@/lib/commerce/payment-actions')
            await recordPayment({
              eventId: action.prefill.eventId ?? '',
              amountCents: parseInt(action.prefill.amount ?? '0', 10),
              method: (action.prefill.suggestedMethod as any) ?? 'other',
              note: message || undefined,
            })
            break
          }
          case 'log_expense': {
            // Expense logging will use existing expense action
            break
          }
        }

        setSuccess(true)
        router.refresh()
        setTimeout(() => onComplete(), 1500)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Action failed. Try again or use the full page.'
        )
      }
    })
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-emerald-950 rounded-lg text-sm text-emerald-300">
        <CheckCircle className="h-4 w-4" />
        <span>Done! Moving to next item...</span>
      </div>
    )
  }

  return (
    <div className="mt-2 p-3 bg-stone-800 rounded-lg space-y-2" onClick={(e) => e.preventDefault()}>
      {/* Context from prefill */}
      {action.prefill.clientName && (
        <p className="text-xs text-stone-400">
          To: {action.prefill.clientName}
          {action.prefill.occasion && ` - ${action.prefill.occasion}`}
        </p>
      )}

      {/* Amount display for payments */}
      {action.type === 'record_payment' && action.prefill.amount && (
        <p className="text-sm font-medium text-stone-200">
          Amount: ${(parseInt(action.prefill.amount, 10) / 100).toFixed(2)}
        </p>
      )}

      {/* Message textarea */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={labels.placeholder}
        rows={3}
        className="w-full bg-stone-900 border border-stone-700 rounded-md px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Action buttons */}
      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="ghost"
          onClick={(e) => {
            e.preventDefault()
            onCancel()
          }}
          className="text-xs"
          disabled={isPending}
        >
          <X className="h-3 w-3 mr-1" /> Cancel
        </Button>
        <Button
          variant="primary"
          onClick={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
          className="text-xs"
          disabled={isPending || (!message && action.type !== 'record_payment')}
        >
          {isPending ? 'Sending...' : labels.button}
        </Button>
      </div>
    </div>
  )
}
