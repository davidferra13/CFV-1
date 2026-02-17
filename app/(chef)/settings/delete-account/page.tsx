// Delete Account Page
// Server component that verifies chef access, shows warning, renders client form

import { requireChef } from '@/lib/auth/get-user'
import { DeleteAccountForm } from '@/components/settings/delete-account-form'
import { Alert } from '@/components/ui/alert'

export default async function DeleteAccountPage() {
  await requireChef()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Delete Account</h1>
        <p className="text-stone-600 mt-1">
          Permanently delete your ChefFlow account and all associated data.
        </p>
      </div>

      <Alert variant="error">
        <strong>Warning:</strong> This action is permanent and cannot be undone.
        All your events, clients, recipes, menus, financial records, and other data
        will be permanently deleted. Make sure you have exported any data you need
        before proceeding.
      </Alert>

      <DeleteAccountForm />
    </div>
  )
}
