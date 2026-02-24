'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-stone-900 rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-stone-100 mb-2">
              {directCancel ? 'Cancel This Event?' : 'Request Event Cancellation?'}
            </h3>
            <p className="text-stone-400 mb-4">
              {directCancel
                ? 'This will cancel the event immediately.'
                : 'This will send a cancellation request message to your chef for review.'}
            </p>

            <Textarea
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Please share why you need to cancel..."
            />

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2 border border-stone-600 rounded-lg text-stone-300 hover:bg-stone-800 transition disabled:opacity-50"
              >
                Keep Event
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={isPending || !reason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {isPending
                  ? directCancel
                    ? 'Cancelling...'
                    : 'Sending...'
                  : directCancel
                    ? 'Confirm Cancel'
                    : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
