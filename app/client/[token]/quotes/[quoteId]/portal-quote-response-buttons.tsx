'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptQuoteByPortalToken, rejectQuoteByPortalToken } from '@/lib/quotes/client-actions'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { formatCurrency } from '@/lib/utils/currency'

export function PortalQuoteResponseButtons({
  token,
  quoteId,
  totalCents,
}: {
  token: string
  quoteId: string
  totalCents: number
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
      await acceptQuoteByPortalToken(token, quoteId)
      setShowAcceptConfirm(false)
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
      await rejectQuoteByPortalToken(token, quoteId, rejectReason || undefined)
      setShowRejectConfirm(false)
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
        description={`You are accepting a quote for ${formatCurrency(totalCents)}. By accepting, you agree to the pricing and terms. Your chef will be notified.`}
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
