// Inquiry Transitions Component
// Shows action buttons for moving inquiries through the pipeline
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { ConfirmPolicyDialog } from '@/components/ui/confirm-policy-dialog'
import {
  transitionInquiry,
  convertInquiryToEvent,
  deleteInquiry,
  restoreInquiry,
} from '@/lib/inquiries/actions'
import { releaseToMarketplace } from '@/lib/contact/claim'
import { DeclineWithReasonModal } from '@/components/inquiries/decline-with-reason-modal'
import { showUndoToast } from '@/components/ui/undo-toast'
import { useUndoStack } from '@/lib/undo/use-undo-stack'
import { mapErrorToUI } from '@/lib/errors/map-error-to-ui'
import { confirmPolicy, type ConfirmPolicyInput } from '@/lib/confirm/confirm-policy'

type InquiryStatus =
  | 'new'
  | 'awaiting_client'
  | 'awaiting_chef'
  | 'quoted'
  | 'confirmed'
  | 'declined'
  | 'expired'

type Inquiry = {
  id: string
  status: InquiryStatus
  client_id: string | null
  confirmed_date: string | null
  converted_to_event_id: string | null
}

export function InquiryTransitions({
  inquiry,
  canRelease,
}: {
  inquiry: Inquiry
  canRelease?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
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

  const handleTransition = async (newStatus: InquiryStatus) => {
    setLoading(true)
    setError(null)

    try {
      const result = await transitionInquiry(inquiry.id, newStatus)
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

  const handleConvert = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await convertInquiryToEvent(inquiry.id)
      if (result.success && result.event) {
        router.push(`/events/${result.event.id}`)
      }
    } catch (err) {
      const uiError = mapErrorToUI(err)
      setError(uiError.message)
      setLoading(false)
    }
  }

  const handleRelease = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await releaseToMarketplace(inquiry.id)
      if (result.success) {
        router.push('/inquiries')
      }
    } catch (err) {
      const uiError = mapErrorToUI(err)
      setError(uiError.message)
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await deleteInquiry(inquiry.id)
      if (result.success) {
        undoStack.push(inquiry.id, inquiry.id)
        showUndoToast(
          'Inquiry deleted. You can undo this for the next 20 seconds.',
          () => {
            const deletedInquiryId = undoStack.undo()
            if (!deletedInquiryId) return
            void restoreInquiry(deletedInquiryId).then(() => router.refresh())
          },
          20000
        )
        router.push('/inquiries')
      }
    } catch (err) {
      const uiError = mapErrorToUI(err)
      setError(uiError.message)
      setLoading(false)
    }
  }

  // Terminal states with conversion
  if (inquiry.status === 'confirmed' && inquiry.converted_to_event_id) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <p className="text-stone-500">This inquiry has been converted to an event.</p>
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => router.push(`/events/${inquiry.converted_to_event_id}`)}
        >
          View Event
        </Button>
      </Card>
    )
  }

  if (inquiry.status === 'declined') {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <p className="text-stone-500 mb-3">This inquiry has been declined.</p>
        <Button
          variant="danger"
          size="sm"
          onClick={() =>
            requestPolicyConfirmation(
              {
                risk: 'low',
                reversible: true,
                entityName: inquiry.id,
                impactPreview:
                  'Inquiry will be soft-deleted and can be undone from toast for a short window.',
                actionLabel: 'Delete Inquiry',
              },
              handleDelete
            )
          }
          loading={loading}
          disabled={loading}
        >
          Delete Inquiry
        </Button>
      </Card>
    )
  }

  return (
    <>
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>

        {error && (
          <Alert variant="error" title="Error" className="mb-4">
            {error}
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {/* Status-specific primary actions */}
            {inquiry.status === 'new' && (
              <>
                <Button
                  onClick={() => handleTransition('awaiting_client')}
                  loading={loading}
                  disabled={loading}
                >
                  Mark Awaiting Client
                </Button>
                {canRelease && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      requestPolicyConfirmation(
                        {
                          risk: 'medium',
                          reversible: false,
                          entityName: inquiry.id,
                          impactPreview:
                            'Lead will be released to marketplace for other chefs to claim.',
                          actionLabel: 'Release Lead',
                        },
                        handleRelease
                      )
                    }
                    disabled={loading}
                  >
                    Release to Marketplace
                  </Button>
                )}
                <Button
                  variant="danger"
                  onClick={() => setShowDeclineModal(true)}
                  disabled={loading}
                >
                  Decline
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    requestPolicyConfirmation(
                      {
                        risk: 'low',
                        reversible: true,
                        entityName: inquiry.id,
                        impactPreview:
                          'Inquiry will be soft-deleted and can be undone from toast for a short window.',
                        actionLabel: 'Delete Inquiry',
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

            {inquiry.status === 'awaiting_client' && (
              <>
                <Button
                  onClick={() => handleTransition('awaiting_chef')}
                  loading={loading}
                  disabled={loading}
                >
                  Client Replied
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleTransition('expired')}
                  disabled={loading}
                >
                  Mark Expired
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowDeclineModal(true)}
                  disabled={loading}
                >
                  Decline
                </Button>
              </>
            )}

            {inquiry.status === 'awaiting_chef' && (
              <>
                <Button
                  onClick={() => handleTransition('quoted')}
                  loading={loading}
                  disabled={loading}
                >
                  Send Quote
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowDeclineModal(true)}
                  disabled={loading}
                >
                  Decline
                </Button>
              </>
            )}

            {inquiry.status === 'quoted' && (
              <>
                <Button
                  onClick={() => handleTransition('confirmed')}
                  loading={loading}
                  disabled={loading}
                >
                  Mark Confirmed
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleTransition('expired')}
                  disabled={loading}
                >
                  Mark Expired
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowDeclineModal(true)}
                  disabled={loading}
                >
                  Decline
                </Button>
              </>
            )}

            {inquiry.status === 'confirmed' && !inquiry.converted_to_event_id && (
              <Button onClick={handleConvert} loading={loading} disabled={loading}>
                Convert to Event
              </Button>
            )}

            {inquiry.status === 'expired' && (
              <Button onClick={() => handleTransition('new')} loading={loading} disabled={loading}>
                Reopen Inquiry
              </Button>
            )}
          </div>

          {/* Status-specific help text */}
          <div className="text-sm text-stone-400">
            {inquiry.status === 'new' && (
              <p>
                New inquiry needs a response. Mark as &ldquo;Awaiting Client&rdquo; once
                you&rsquo;ve reached out.
              </p>
            )}
            {inquiry.status === 'awaiting_client' && (
              <p>
                You&rsquo;ve responded. Waiting for the client to reply with details or
                confirmation.
              </p>
            )}
            {inquiry.status === 'awaiting_chef' && (
              <p>Client has replied. Review their details and send a quote when ready.</p>
            )}
            {inquiry.status === 'quoted' && (
              <p>Quote sent. Waiting for client to accept or decline.</p>
            )}
            {inquiry.status === 'confirmed' && (
              <p>
                Client confirmed! Convert to an event to start the booking lifecycle.
                {!inquiry.client_id && ' Note: Link a client first before converting.'}
                {!inquiry.confirmed_date &&
                  ' Note: Confirm the event date first before converting.'}
              </p>
            )}
            {inquiry.status === 'expired' && (
              <p>This inquiry expired without a response. You can reopen it to try again.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Decline with Reason Modal */}
      {showDeclineModal && (
        <DeclineWithReasonModal
          inquiryId={inquiry.id}
          onCancel={() => setShowDeclineModal(false)}
        />
      )}

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
    </>
  )
}
