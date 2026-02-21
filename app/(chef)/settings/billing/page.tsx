// ChefFlow Subscription & Billing Settings Page
// Shows current subscription status (grandfathered / trialing / active / expired),
// plan features, and upgrade / manage CTAs.
//
// This page is the canonical place for chefs to understand and manage their
// ChefFlow subscription — distinct from Stripe Connect (client payment routing).

import { requireChef } from '@/lib/auth/get-user'
import { getSubscriptionStatus } from '@/lib/stripe/subscription'
import { BillingClient } from './billing-client'

export const metadata = { title: 'Subscription & Billing — ChefFlow' }

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { upgraded?: string }
}) {
  const user = await requireChef()
  const status = await getSubscriptionStatus(user.entityId)
  const upgraded = searchParams.upgraded === '1'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Subscription & Billing</h1>
        <p className="mt-1 text-sm text-stone-500">Manage your ChefFlow Professional plan.</p>
      </div>

      <BillingClient status={status} upgraded={upgraded} />
    </div>
  )
}
