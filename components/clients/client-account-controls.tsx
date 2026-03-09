'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Textarea } from '@/components/ui/textarea'
import {
  cancelAccountDeletion,
  exportMyClientData,
  requestAccountDeletion,
  type ClientDeletionStatus,
} from '@/lib/clients/self-service-actions'

type ClientAccountControlsProps = {
  deletionStatus: ClientDeletionStatus
}

export function ClientAccountControls({ deletionStatus }: ClientAccountControlsProps) {
  const router = useRouter()
  const [isExporting, startExportTransition] = useTransition()
  const [isMutating, startMutationTransition] = useTransition()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  function handleExport() {
    setError(null)

    startExportTransition(async () => {
      try {
        const data = await exportMyClientData()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `chefflow-client-data-${new Date().toISOString().slice(0, 10)}.json`
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Data export downloaded')
      } catch (exportError) {
        const message =
          exportError instanceof Error ? exportError.message : 'Failed to export your data'
        setError(message)
        toast.error(message)
      }
    })
  }

  function confirmDeletionRequest() {
    setError(null)

    startMutationTransition(async () => {
      try {
        await requestAccountDeletion(reason)
        setShowDeleteConfirm(false)
        toast.success('Account deletion scheduled')
        router.refresh()
      } catch (mutationError) {
        const message =
          mutationError instanceof Error
            ? mutationError.message
            : 'Failed to request account deletion'
        setError(message)
        toast.error(message)
      }
    })
  }

  function confirmDeletionCancel() {
    setError(null)

    startMutationTransition(async () => {
      try {
        await cancelAccountDeletion()
        setShowCancelConfirm(false)
        toast.success('Account deletion cancelled')
        router.refresh()
      } catch (mutationError) {
        const message =
          mutationError instanceof Error
            ? mutationError.message
            : 'Failed to cancel account deletion'
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy & Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-xl border border-stone-700 bg-stone-900/70 p-4">
          <div className="space-y-1">
            <p className="font-medium text-stone-100">Export my data</p>
            <p className="text-sm text-stone-400">
              Download your profile, events, payments, messages, dietary information, and saved
              preferences as a JSON export.
            </p>
          </div>
          <Button variant="secondary" onClick={handleExport} loading={isExporting}>
            Download My Data
          </Button>
        </div>

        <div className="space-y-4 rounded-xl border border-red-900/70 bg-red-950/20 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium text-stone-100">Account deletion</p>
              <p className="text-sm text-stone-400">
                Request deletion with a 30-day grace period. You can cancel any time before the
                scheduled date.
              </p>
            </div>
            {deletionStatus.isPending ? (
              <Badge variant="warning">Deletion Pending</Badge>
            ) : (
              <Badge variant="default">Active</Badge>
            )}
          </div>

          {deletionStatus.isPending ? (
            <Alert variant="warning">
              <div className="space-y-2">
                <p className="font-medium">Your deletion request is active.</p>
                <p>
                  Scheduled for{' '}
                  {deletionStatus.scheduledFor
                    ? format(new Date(deletionStatus.scheduledFor), 'PPP')
                    : 'an upcoming date'}
                  {typeof deletionStatus.daysRemaining === 'number'
                    ? ` (${deletionStatus.daysRemaining} day${deletionStatus.daysRemaining === 1 ? '' : 's'} remaining)`
                    : ''}
                  .
                </p>
                {deletionStatus.reason && (
                  <p className="text-sm">Reason submitted: {deletionStatus.reason}</p>
                )}
              </div>
            </Alert>
          ) : (
            <Textarea
              label="Reason for leaving (optional)"
              placeholder="Tell us what led to your decision."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
            />
          )}

          {error && <Alert variant="error">{error}</Alert>}

          <div className="flex flex-col gap-3 sm:flex-row">
            {deletionStatus.isPending ? (
              <Button
                variant="secondary"
                onClick={() => setShowCancelConfirm(true)}
                disabled={isMutating}
              >
                Cancel Deletion Request
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isMutating}
              >
                Request Account Deletion
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Schedule account deletion?"
        description="Your account will remain accessible for 30 days, then your client profile will be queued for deletion. Export your data first if you need a copy."
        confirmLabel="Schedule Deletion"
        variant="danger"
        loading={isMutating}
        onConfirm={confirmDeletionRequest}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        open={showCancelConfirm}
        title="Cancel deletion request?"
        description="This will keep your client account active and remove the pending deletion schedule."
        confirmLabel="Keep My Account"
        variant="primary"
        loading={isMutating}
        onConfirm={confirmDeletionCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </Card>
  )
}
