// Q57: Client Account Deletion + GDPR Data Export
// Soft-delete with 30-day grace period. Data export as JSON download.

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getClientDeletionStatus } from '@/lib/clients/account-deletion-actions'
import { ClientDeleteAccountForm } from './delete-account-form'

export const metadata: Metadata = { title: 'Delete Account' }

export default async function ClientDeleteAccountPage() {
  await requireClient()
  const status = await getClientDeletionStatus()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Delete My Account</h1>
        <p className="text-stone-400 mt-1">
          {status.isPending
            ? 'Your account is scheduled for deletion.'
            : 'Request deletion of your account and personal data.'}
        </p>
      </div>
      <ClientDeleteAccountForm status={status} />
    </div>
  )
}
