// Delete Account Page
// Soft-delete with 30-day grace period, pre-deletion checks, data export prompt
// Shows cancel option when deletion is already pending

import { requireChef } from '@/lib/auth/get-user'
import { getAccountDeletionStatus } from '@/lib/compliance/account-deletion-actions'
import { DeleteAccountForm } from '@/components/settings/delete-account-form'
import { CancelDeletionCard } from '@/components/settings/cancel-deletion-card'
import { Alert } from '@/components/ui/alert'

export default async function DeleteAccountPage() {
  const user = await requireChef()
  const status = await getAccountDeletionStatus()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Delete Account</h1>
        <p className="text-stone-400 mt-1">
          {status.isPending
            ? 'Your account is scheduled for deletion.'
            : 'Request deletion of your ChefFlow account and all associated data.'}
        </p>
      </div>

      {status.isPending ? (
        <>
          <Alert variant="warning">
            <strong>Deletion pending.</strong> Your account will be deleted on{' '}
            {new Date(status.scheduledFor!).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            ({status.daysRemaining} day{status.daysRemaining !== 1 ? 's' : ''} remaining). You have
            full access until then. Cancel anytime below.
          </Alert>
          <CancelDeletionCard chefId={user.entityId} />
        </>
      ) : (
        <>
          <Alert variant="warning">
            <strong>Important:</strong> Account deletion includes a 30-day grace period. During this
            time you can change your mind and reactivate your account. After 30 days, all personal
            data will be permanently deleted. Financial records are retained for 7 years per
            accounting regulations.
          </Alert>
          <DeleteAccountForm chefId={user.entityId} />
        </>
      )}
    </div>
  )
}
