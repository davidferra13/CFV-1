// Quote Response Buttons — Client accepts or rejects a quote
// Follows the same modal confirmation pattern as accept-proposal-button

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptQuote, rejectQuote } from '@/lib/quotes/client-actions'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils/currency'

export default function QuoteResponseButtons({
  quoteId,
  totalCents,
}: {
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
      await acceptQuote(quoteId)
      router.push('/my-quotes')
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

      {/* Accept Confirmation Modal */}
      {showAcceptConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-stone-100 mb-2">Accept This Quote?</h3>
            <p className="text-stone-400 mb-2">
              You are accepting a quote for <strong>{formatCurrency(totalCents)}</strong>.
            </p>
            <p className="text-stone-400 mb-6">
              By accepting, you agree to the pricing and terms. Your chef will be notified.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAcceptConfirm(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-stone-600 rounded-lg text-stone-300 hover:bg-stone-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition disabled:opacity-50"
              >
                {loading ? 'Accepting...' : 'Accept Quote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-stone-100 mb-2">Decline This Quote?</h3>
            <p className="text-stone-400 mb-4">
              Let your chef know why so they can adjust if needed.
            </p>

            <Textarea
              label="Reason (optional)"
              placeholder="e.g., Budget is too high, need fewer courses..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectConfirm(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-stone-600 rounded-lg text-stone-300 hover:bg-stone-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? 'Declining...' : 'Decline Quote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
