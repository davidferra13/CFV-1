// Public account reactivation page
// Accepts a reactivation token from the URL and allows the chef to cancel deletion

import { ReactivateAccountClient } from './reactivate-client'

export const metadata = { title: 'Reactivate Account | ChefFlow' }

export default function ReactivateAccountPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-100">Reactivate Your Account</h1>
          <p className="text-stone-300 mt-2">
            Cancel your deletion request and restore access to your ChefFlow account.
          </p>
        </div>
        <ReactivateAccountClient />
      </div>
    </div>
  )
}
