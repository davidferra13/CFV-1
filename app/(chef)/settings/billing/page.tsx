import { requireChef } from '@/lib/auth/get-user'
import { getSupportStatus } from '@/lib/monetization/status'
import { BillingClient } from './billing-client'

export const metadata = { title: 'Support ChefFlow' }

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { supported?: string }
}) {
  const user = await requireChef()
  const status = await getSupportStatus(user.entityId)
  const thankYou = searchParams.supported === '1'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" data-cf-surface="configuring">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
          Support ChefFlow
        </p>
        <h1 className="mt-2 text-2xl font-bold text-stone-100">ChefFlow is free to use.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
          If ChefFlow helps your business, you can support its development with a voluntary
          contribution. Every core feature remains available either way.
        </p>
      </div>

      <BillingClient status={status} thankYou={thankYou} />
    </div>
  )
}
