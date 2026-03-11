'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  activateRetainer,
  pauseRetainer,
  resumeRetainer,
  cancelRetainer,
  completeRetainer,
} from '@/lib/retainers/actions'

type RetainerDetailActionsProps = {
  retainerId: string
  status: string
}

export function RetainerDetailActions({ retainerId, status }: RetainerDetailActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  async function handleAction(action: string) {
    if (action === 'cancel') {
      setShowCancelConfirm(true)
      return
    }
    setError(null)
    setLoading(action)
    try {
      switch (action) {
        case 'activate':
          await activateRetainer(retainerId)
          break
        case 'pause':
          await pauseRetainer(retainerId)
          break
        case 'resume':
          await resumeRetainer(retainerId)
          break
        case 'complete':
          await completeRetainer(retainerId)
          break
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Action failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleConfirmedCancel() {
    setShowCancelConfirm(false)
    setError(null)
    setLoading('cancel')
    try {
      await cancelRetainer(retainerId)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Action failed')
    } finally {
      setLoading(null)
    }
  }

  // No actions available for terminal statuses
  if (status === 'cancelled' || status === 'completed') {
    return null
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="p-3 bg-red-950 text-red-200 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        {status === 'draft' && (
          <>
            <Button
              variant="primary"
              loading={loading === 'activate'}
              onClick={() => handleAction('activate')}
            >
              Activate Retainer
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push(`/finance/retainers/${retainerId}/edit`)}
            >
              Edit
            </Button>
          </>
        )}

        {status === 'active' && (
          <>
            <Button
              variant="secondary"
              loading={loading === 'pause'}
              onClick={() => handleAction('pause')}
            >
              Pause
            </Button>
            <Button
              variant="primary"
              loading={loading === 'complete'}
              onClick={() => handleAction('complete')}
            >
              Complete
            </Button>
          </>
        )}

        {status === 'paused' && (
          <Button
            variant="primary"
            loading={loading === 'resume'}
            onClick={() => handleAction('resume')}
          >
            Resume
          </Button>
        )}

        {/* Cancel available for all non-terminal statuses */}
        <Button
          variant="danger"
          loading={loading === 'cancel'}
          onClick={() => handleAction('cancel')}
        >
          Cancel Retainer
        </Button>
      </div>

      <ConfirmModal
        open={showCancelConfirm}
        title="Cancel this retainer?"
        description="Are you sure you want to cancel this retainer? All pending periods will be voided."
        confirmLabel="Cancel Retainer"
        variant="danger"
        loading={loading === 'cancel'}
        onConfirm={handleConfirmedCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  )
}
