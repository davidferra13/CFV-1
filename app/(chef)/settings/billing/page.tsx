// ChefFlow Billing / Upgrade Page
// Shows tier overview and upgrade CTA when a paid feature is accessed.
// Also handles voluntary supporter contributions from existing subscribers.
// Distinct from Stripe Connect (client payment routing).

import { requireChef } from '@/lib/auth/get-user'
import { getSubscriptionStatus } from '@/lib/stripe/subscription'
import { getFeature } from '@/lib/billing/feature-classification'
import { BillingClient } from './billing-client'

export const metadata = { title: 'Plans' }

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { upgraded?: string; feature?: string }
}) {
  const user = await requireChef()
  const status = await getSubscriptionStatus(user.entityId)
  const thankYou = searchParams.upgraded === '1'
  const feature = searchParams.feature ? (getFeature(searchParams.feature) ?? null) : null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100">Plans</h1>
        <p className="mt-1 text-sm text-stone-500">
          The core platform is free. Paid plans unlock automation, intelligence, and scale.
        </p>
      </div>

      <BillingClient status={status} thankYou={thankYou} requestedFeature={feature} />
    </div>
  )
}
