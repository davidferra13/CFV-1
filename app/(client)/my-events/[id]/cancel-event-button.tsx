'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { cancelEventAsClient, requestCancellationViaChat } from '@/lib/events/client-actions'

type CancelableStatus = 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress'

export default function CancelEventButton({
  eventId,
  status,
}: {
  eventId: string
  status: CancelableStatus
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const directCancel = status === 'proposed' || status === 'accepted'

  function onSubmit() {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        if (directCancel) {
          await cancelEventAsClient(eventId, reason)
          setShowConfirm(false)
          router.refresh()
          return
        }

        await requestCancellationViaChat(eventId, reason)
        setShowConfirm(false)
        setReason('')
        setSuccess('Cancellation request sent to your chef via chat.')
        router.refresh()
      } catch (err: any) {
        setError(err?.message || 'Unable to process cancellation')
      }
    })
  }

  return (
    <>
      {error && (
        <Alert variant="error" className="w-full sm:w-auto">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="w-full sm:w-auto">
          {success}
        </Alert>
      )}

      <Button
        variant="danger"
        size="lg"
        className="w-full sm:w-auto"
        onClick={() => setShowConfirm(true)}
      >
        {directCancel ? 'Cancel Event' : 'Request Cancellation'}
      </Button>

      <ConfirmModal
        open={showConfirm}
        title={directCancel ? 'Cancel This Event?' : 'Request Event Cancellation?'}
        description={
          directCancel
            ? 'This will cancel the event immediately.'
            : 'This will send a cancellation request message to your chef for review.'
        }
        confirmLabel={
          isPending
            ? directCancel
              ? 'Cancelling...'
              : 'Sending...'
            : directCancel
              ? 'Confirm Cancel'
              : 'Send Request'
        }
        cancelLabel="Keep Event"
        variant="danger"
        loading={isPending}
        confirmDisabled={!reason.trim()}
        onConfirm={onSubmit}
        onCancel={() => setShowConfirm(false)}
        maxWidth="max-w-lg"
      >
        <Textarea
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Please share why you need to cancel..."
        />
      </ConfirmModal>
    </>
  )
}
