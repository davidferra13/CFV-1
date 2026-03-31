// ChefFlow Support Page
// All features are free. This page lets chefs who love ChefFlow
// voluntarily contribute to support ongoing development.
// Distinct from Stripe Connect (client payment routing).

import { requireChef } from '@/lib/auth/get-user'
import { getSubscriptionStatus } from '@/lib/stripe/subscription'
import { SupportClient } from './billing-client'

export const metadata = { title: 'Support ChefFlow' }

export default async function SupportPage({
  searchParams,
}: {
  searchParams: { upgraded?: string }
}) {
  const user = await requireChef()
  const status = await getSubscriptionStatus(user.entityId)
  const thankYou = searchParams.upgraded === '1'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100">Support ChefFlow</h1>
        <p className="mt-1 text-sm text-stone-500">
          Every feature is free. If ChefFlow helps your business, consider supporting its
          development.
        </p>
      </div>

      <SupportClient status={status} thankYou={thankYou} />
    </div>
  )
}
