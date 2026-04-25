// Quote Response Buttons - Client accepts or rejects a quote
// Follows the same modal confirmation pattern as accept-proposal-button

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptQuote, rejectQuote } from '@/lib/quotes/client-actions'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { formatCurrency } from '@/lib/utils/currency'

export default function QuoteResponseButtons({
  quoteId,
  totalCents,
  eventId,
}: {
  quoteId: string
  totalCents: number
  eventId?: string
}) {
  const router = useRouter()
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await acceptQuote(quoteId)
      const resolvedEventId = result.eventId || eventId
      router.push(resolvedEventId ? `/my-events/${resolvedEventId}` : '/my-quotes')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to accept quote')
      setLoading(false)
      setShowAcceptConfirm(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    setError(null)

    try {
      await rejectQuote(quoteId, rejectReason || undefined)
      router.push('/my-quotes')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to decline quote')
      setLoading(false)
      setShowRejectConfirm(false)
    }
  }

  return (
    <>
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={() => setShowAcceptConfirm(true)}
          disabled={loading}
        >
          Accept Quote
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => setShowRejectConfirm(true)}
          disabled={loading}
        >
          Decline
        </Button>
      </div>

      <ConfirmModal
        open={showAcceptConfirm}
        title="Accept This Quote?"
        description={`You are accepting a quote for ${formatCurrency(totalCents)}. By accepting, you confirm this pricing works for you. Your chef will be notified and will follow up with next steps.`}
        confirmLabel="Accept Quote"
        loading={loading}
        onConfirm={handleAccept}
        onCancel={() => setShowAcceptConfirm(false)}
      />

      <ConfirmModal
        open={showRejectConfirm}
        title="Decline This Quote?"
        description="Let your chef know why so they can adjust if needed."
        confirmLabel="Decline Quote"
        variant="danger"
        loading={loading}
        onConfirm={handleReject}
        onCancel={() => setShowRejectConfirm(false)}
      >
        <Textarea
          label="Reason (optional)"
          placeholder="e.g., Budget is too high, need fewer courses..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
        />
      </ConfirmModal>
    </>
  )
}
