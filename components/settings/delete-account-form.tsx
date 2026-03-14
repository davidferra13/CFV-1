// Delete Account Form — Client Component
// Includes pre-deletion checklist, data export prompt, confirmation mechanism,
// and optional reason selector. Uses soft-delete with 30-day grace period.

'use client'

import { useState, useCallback, useTransition } from 'react'
import { deleteAccount } from '@/lib/auth/actions'
import { exportMyData } from '@/lib/compliance/data-export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { PreDeletionChecklist } from './pre-deletion-checklist'
import { Download } from '@/components/ui/icons'
import { toast } from 'sonner'

const DELETION_REASONS = [
  { value: '', label: 'Select a reason (optional)' },
  { value: 'found_alternative', label: 'Found a better solution' },
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'not_using', label: 'Not using it enough' },
  { value: 'privacy_concerns', label: 'Privacy concerns' },
  { value: 'closing_business', label: 'Closing my business' },
  { value: 'other', label: 'Other' },
]

type Props = {
  chefId: string
}

export function DeleteAccountForm({ chefId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isExporting, startExportTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasBlockers, setHasBlockers] = useState(true)

  const [confirmation, setConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')

  const isConfirmed = confirmation === 'DELETE'

  const handleCheckComplete = useCallback((blocked: boolean) => {
    setHasBlockers(blocked)
  }, [])

  const handleExport = () => {
    startExportTransition(async () => {
      try {
        const data = await exportMyData()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chefflow-data-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Data export downloaded')
      } catch (err: any) {
        toast.error(err.message || 'Export failed')
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (hasBlockers) {
      setError('Please resolve all checklist items before deleting your account.')
      return
    }

    if (!isConfirmed) {
      setError('Please type DELETE to confirm')
      return
    }

    if (!password) {
      setError('Please enter your password')
      return
    }

    startTransition(async () => {
      try {
        await deleteAccount(password, reason || undefined)
        setSuccess(true)
      } catch (err) {
        const error = err as Error
        setError(error.message)
      }
    })
  }

  if (success) {
    return (
      <Card>
        <CardContent className="py-8 space-y-4">
          <Alert variant="success">
            <strong>Deletion scheduled.</strong> Your account will be deleted in 30 days. You still
            have full access to your account during this time — export your data, wrap up any
            business, or cancel the deletion from this page.
          </Alert>
          <p className="text-sm text-stone-400">
            A reactivation link has been saved to your account. If you change your mind, visit
            Settings &gt; Delete Account to cancel.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pre-deletion checklist */}
      <PreDeletionChecklist chefId={chefId} onCheckComplete={handleCheckComplete} />

      {/* Data export prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data First
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-400">
            Download a copy of all your ChefFlow data before proceeding. After your account is
            deleted, your data cannot be recovered.
          </p>
          <Button onClick={handleExport} loading={isExporting} variant="secondary">
            Download My Data (JSON)
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation form */}
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Confirm Account Deletion</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            {hasBlockers && (
              <p className="text-sm text-stone-400">
                Resolve all checklist items above before you can proceed with deletion.
              </p>
            )}

            <div>
              <label
                htmlFor="deletion-reason"
                className="block text-sm font-medium text-stone-300 mb-1"
              >
                Why are you leaving?
              </label>
              <select
                id="deletion-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                disabled={hasBlockers}
              >
                {DELETION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-sm text-stone-300 mb-2">
                Type <strong>DELETE</strong> to confirm you want to delete your account:
              </p>
              <Input
                type="text"
                label="Confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Type DELETE"
                required
                autoComplete="off"
                disabled={hasBlockers}
              />
            </div>

            <Input
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helperText="Enter your password to verify your identity"
              autoComplete="current-password"
              disabled={hasBlockers}
            />

            <Button
              type="submit"
              variant="danger"
              loading={isPending}
              disabled={!isConfirmed || hasBlockers}
            >
              Request Account Deletion
            </Button>

            <p className="text-xs text-stone-500">
              Your account will be scheduled for deletion in 30 days. During this grace period, you
              can reactivate your account using the link we send to your email. Financial records
              are retained for 7 years per accounting regulations.
            </p>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
