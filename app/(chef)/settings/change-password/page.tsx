// Change Password Page
// Server component that verifies chef access, renders client form

import { requireChef } from '@/lib/auth/get-user'
import { ChangePasswordForm } from '@/components/settings/change-password-form'

export default async function ChangePasswordPage() {
  await requireChef()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Change Password</h1>
        <p className="text-stone-400 mt-1">
          Update your account password. You will need to enter your current password for
          verification.
        </p>
      </div>

      <ChangePasswordForm />
    </div>
  )
}
