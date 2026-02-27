// Accept Proposal Button - Client component with confirmation modal

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptEventProposal } from '@/lib/events/client-actions'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export default function AcceptProposalButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    setLoading(true)
    setError(null)

    try {
      await acceptEventProposal(eventId)
      // Success - redirect to payment page
      router.push(`/my-events/${eventId}/pay`)
    } catch (err: any) {
      setError(err.message || 'Failed to accept proposal')
      setShowConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full sm:w-auto"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
      >
        Accept This Proposal
      </Button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-stone-900 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-stone-100 mb-2">Accept Event Proposal?</h3>
            <p className="text-stone-400 mb-6">
              By accepting this proposal, you agree to the event details and pricing. You will be
              directed to payment after accepting.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
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
                {loading ? 'Accepting...' : 'Accept & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
