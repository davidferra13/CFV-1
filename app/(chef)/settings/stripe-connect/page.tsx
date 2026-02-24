// Stripe Connect Settings Page
// Shows current connection status, Connect CTA, and payout history.

import { requireChef } from '@/lib/auth/get-user'
import { getConnectAccountStatus } from '@/lib/stripe/connect'
import { StripeConnectClient } from './stripe-connect-client'

export default async function StripeConnectPage() {
  await requireChef()
  const status = await getConnectAccountStatus()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100">Stripe Payouts</h1>
        <p className="mt-1 text-stone-500">
          Connect your Stripe account to receive client payments directly to your bank account.
        </p>
      </div>

      <StripeConnectClient status={status} />
    </div>
  )
}
