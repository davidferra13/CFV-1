'use client'

// Q57: Client-facing deletion form + data export download

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import type { ClientDeletionStatus } from '@/lib/clients/account-deletion-actions'
import {
  requestClientAccountDeletion,
  cancelClientAccountDeletion,
  exportClientData,
} from '@/lib/clients/account-deletion-actions'

export function ClientDeleteAccountForm({ status }: { status: ClientDeletionStatus }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmText, setConfirmText] = useState('')

  function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (confirmText !== 'DELETE') return
    setError(null)

    startTransition(async () => {
      try {
        const result = await requestClientAccountDeletion(reason || undefined)
        if (result.success) {
          setSuccess(
            'Your account has been scheduled for deletion. You have 30 days to change your mind.'
          )
          window.location.reload()
        } else {
          setError(result.error || 'Something went wrong.')
        }
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await cancelClientAccountDeletion()
        if (result.success) {
          setSuccess('Deletion cancelled. Your account is safe.')
          window.location.reload()
        } else {
          setError(result.error || 'Something went wrong.')
        }
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  function handleExport() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await exportClientData()
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chefflow-my-data-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        setError('Failed to export data. Please try again.')
      }
    })
  }

  if (status.isPending) {
    return (
      <>
        <Alert variant="warning">
          <strong>Deletion pending.</strong> Your account will be deleted on{' '}
          {new Date(status.scheduledFor!).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}{' '}
          ({status.daysRemaining} day{status.daysRemaining !== 1 ? 's' : ''} remaining). You have
          full access until then.
        </Alert>

        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-stone-300">
              Changed your mind? You can cancel the deletion request and keep your account.
            </p>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="bg-brand-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-700 transition text-sm disabled:opacity-60"
            >
              {isPending ? 'Cancelling...' : 'Cancel Deletion'}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-stone-100 mb-2">Export My Data</h2>
            <p className="text-sm text-stone-400 mb-4">
              Download a copy of all your personal data before deletion.
            </p>
            <button
              type="button"
              onClick={handleExport}
              disabled={isPending}
              className="border border-stone-600 text-stone-200 px-6 py-2 rounded-lg font-semibold hover:bg-stone-800 transition text-sm disabled:opacity-60"
            >
              {isPending ? 'Preparing...' : 'Download My Data'}
            </button>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <Alert variant="warning">
        <strong>Important:</strong> Account deletion includes a 30-day grace period. During this
        time you can change your mind. After 30 days, your personal data is permanently deleted.
        Financial records are retained for 7 years per accounting regulations.
      </Alert>

      {/* Data export first */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-stone-100 mb-2">Export My Data</h2>
          <p className="text-sm text-stone-400 mb-4">
            Download all your personal data (profile, events, messages, quotes) as a JSON file.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={isPending}
            className="border border-stone-600 text-stone-200 px-6 py-2 rounded-lg font-semibold hover:bg-stone-800 transition text-sm disabled:opacity-60"
          >
            {isPending ? 'Preparing...' : 'Download My Data'}
          </button>
        </CardContent>
      </Card>

      {/* Deletion form */}
      <Card className="border-red-900/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Delete Account</h2>
          <form onSubmit={handleDelete} className="space-y-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1">
                Why are you leaving? (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={2}
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="We'd appreciate your feedback..."
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">
                Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="DELETE"
              />
            </div>
            <button
              type="submit"
              disabled={isPending || confirmText !== 'DELETE'}
              className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition text-sm disabled:opacity-40"
            >
              {isPending ? 'Processing...' : 'Request Account Deletion'}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}
          </form>
        </CardContent>
      </Card>
    </>
  )
}
