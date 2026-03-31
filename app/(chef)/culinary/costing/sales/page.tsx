import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getCurrentSales } from '@/lib/openclaw/sale-calendar-actions'
import { getPreferredStores } from '@/lib/grocery/store-shopping-actions'
import { getAvailableOpenClawStores } from '@/lib/openclaw/store-preference-actions'
import { SalesPageClient } from './sales-client'

export const metadata: Metadata = { title: 'On Sale This Week' }

export default async function SalesPage() {
  await requireChef()

  const [salesResult, preferredStores, allStores] = await Promise.all([
    getCurrentSales().catch(() => ({
      sales: [],
      error: 'Could not load sales data' as string | null,
    })),
    getPreferredStores().catch(() => []),
    getAvailableOpenClawStores().catch(() => []),
  ])

  const storeNames =
    preferredStores.length > 0 ? preferredStores.map((s) => s.store_name) : allStores

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">On Sale This Week</h1>
        <p className="text-stone-400 mt-1">
          Current deals across your preferred stores. Updated weekly.
        </p>
      </div>

      <SalesPageClient
        initialSales={salesResult.sales}
        initialError={salesResult.error}
        storeNames={storeNames}
      />
    </div>
  )
}
