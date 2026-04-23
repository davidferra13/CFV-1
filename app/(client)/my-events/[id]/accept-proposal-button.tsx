// Accept Proposal Button - Client component with confirmation modal

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptEventProposal } from '@/lib/events/client-actions'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { ConfirmModal } from '@/components/ui/confirm-modal'

type Props = {
  eventId: string
  successRedirectHref?: string
  confirmDescription?: string
  buttonLabel?: string
}

export default function AcceptProposalButton({
  eventId,
  successRedirectHref,
  confirmDescription,
  buttonLabel,
}: Props) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    setLoading(true)
    setError(null)

    try {
      await acceptEventProposal(eventId)
      router.push(successRedirectHref ?? `/my-events/${eventId}/pay`)
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
        {buttonLabel ?? 'Accept This Proposal'}
      </Button>

      <ConfirmModal
        open={showConfirm}
        title="Accept Event Proposal?"
        description={
          confirmDescription ??
          'By accepting this proposal, you agree to the event details and pricing. You will be directed to payment after accepting.'
        }
        confirmLabel="Accept & Continue"
        loading={loading}
        onConfirm={handleAccept}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
