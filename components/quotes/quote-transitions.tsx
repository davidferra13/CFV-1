// Quote Transitions Component
// Shows action buttons for moving quotes through the pipeline
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { ConfirmPolicyDialog } from '@/components/ui/confirm-policy-dialog'
import { transitionQuote, deleteQuote, restoreQuote } from '@/lib/quotes/actions'
import { showUndoToast } from '@/components/ui/undo-toast'
import { useUndoStack } from '@/lib/undo/use-undo-stack'
import { mapErrorToUI } from '@/lib/errors/map-error-to-ui'
import { confirmPolicy, type ConfirmPolicyInput } from '@/lib/confirm/confirm-policy'

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

type Quote = {
  id: string
  status: QuoteStatus
  total_quoted_cents: number
  valid_until: string | null
}

export function QuoteTransitions({ quote }: { quote: Quote }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmInput, setConfirmInput] = useState<ConfirmPolicyInput | null>(null)
  const pendingConfirmActionRef = useRef<null | (() => Promise<void>)>(null)
  const undoStack = useUndoStack<string | null>(null)

  const requestPolicyConfirmation = (
    policyInput: ConfirmPolicyInput,
    action: () => Promise<void>
  ) => {
    const decision = confirmPolicy(policyInput)
    if (decision.mode === 'none') {
      void action()
      return
    }
    pendingConfirmActionRef.current = action
    setConfirmInput(policyInput)
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    const fn = pendingConfirmActionRef.current
    setConfirmOpen(false)
    setConfirmInput(null)
    pendingConfirmActionRef.current = null
    if (!fn) return
    await fn()
  }

  const handleTransition = async (newStatus: QuoteStatus) => {
    setLoading(true)
    setError(null)

    try {
      const result = await transitionQuote(quote.id, newStatus)
      if (result.success) {
        router.refresh()
      }
    } catch (err) {
      const uiError = mapErrorToUI(err)
      setError(uiError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await deleteQuote(quote.id)
      if (result.success) {
        undoStack.push(quote.id, quote.id)
        showUndoToast(
          'Quote deleted. You can undo this for the next 20 seconds.',
          () => {
            const deletedQuoteId = undoStack.undo()
            if (!deletedQuoteId) return
            void restoreQuote(deletedQuoteId).then(() => router.refresh())
          },
          20000
        )
        router.push('/quotes')
      }
    } catch (err) {
      const uiError = mapErrorToUI(err)
      setError(uiError.message)
      setLoading(false)
    }
  }

  // Terminal states
  if (quote.status === 'accepted') {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <p className="text-green-700">
          This quote has been accepted by the client. Pricing is frozen.
        </p>
      </Card>
    )
  }

  if (quote.status === 'rejected') {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <p className="text-stone-500">This quote was rejected by the client.</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Actions</h2>

      {error && (
        <Alert variant="error" title="Error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {quote.status === 'draft' && (
            <>
              <Button
                onClick={() =>
                  requestPolicyConfirmation(
                    {
                      risk: 'medium',
                      reversible: true,
                      entityName: quote.id,
                      impactPreview: 'Client will receive this quote in the portal.',
                      actionLabel: 'Send Quote',
                    },
                    () => handleTransition('sent')
                  )
                }
                loading={loading}
                disabled={loading}
              >
                Send to Client
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push(`/quotes/${quote.id}/edit`)}
                disabled={loading}
              >
                Edit Quote
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  requestPolicyConfirmation(
                    {
                      risk: 'low',
                      reversible: true,
                      entityName: quote.id,
                      impactPreview: 'Quote will be soft-deleted and can be undone from toast.',
                      actionLabel: 'Delete Quote',
                    },
                    handleDelete
                  )
                }
                disabled={loading}
              >
                Delete
              </Button>
            </>
          )}

          {quote.status === 'sent' && (
            <>
              <Button
                variant="secondary"
                onClick={() =>
                  requestPolicyConfirmation(
                    {
                      risk: 'medium',
                      reversible: true,
                      entityName: quote.id,
                      impactPreview: 'This quote will be marked expired.',
                      actionLabel: 'Mark Expired',
                    },
                    () => handleTransition('expired')
                  )
                }
                disabled={loading}
              >
                Mark Expired
              </Button>
            </>
          )}

          {quote.status === 'expired' && (
            <Button onClick={() => handleTransition('draft')} loading={loading} disabled={loading}>
              Revise & Resend
            </Button>
          )}
        </div>

        {/* Status-specific help text */}
        <div className="text-sm text-stone-400">
          {quote.status === 'draft' && (
            <p>This quote is in draft. Review pricing and send it to the client when ready.</p>
          )}
          {quote.status === 'sent' && (
            <p>
              Quote sent to client. Waiting for their response in the client portal. If it is no
              longer valid, mark it expired and send a revised version.
            </p>
          )}
          {quote.status === 'expired' && (
            <p>This quote expired. You can revise it and send a new version.</p>
          )}
        </div>
      </div>
      <ConfirmPolicyDialog
        open={confirmOpen}
        policy={confirmInput}
        loading={loading}
        onCancel={() => {
          setConfirmOpen(false)
          setConfirmInput(null)
          pendingConfirmActionRef.current = null
        }}
        onConfirm={handleConfirm}
      />
    </Card>
  )
}
