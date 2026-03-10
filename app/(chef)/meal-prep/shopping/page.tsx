import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { BatchShoppingView } from './batch-shopping-client'

export const metadata: Metadata = { title: 'Batch Shopping - ChefFlow' }

export default async function BatchShoppingPage() {
  await requireChef()
  await requirePro('operations')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Batch Shopping</h1>
        <p className="text-sm text-stone-500 mt-1">
          Aggregate ingredients across all meal prep clients for one weekly shopping trip.
        </p>
      </div>
      <BatchShoppingView />
    </div>
  )
}
