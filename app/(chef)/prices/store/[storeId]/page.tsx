import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getStoreInventory } from '@/lib/openclaw/store-catalog-actions'
import { pgClient } from '@/lib/db'
import { ArrowLeft } from '@/components/ui/icons'
import { StoreInventoryBrowser } from './store-inventory-browser'

export const metadata: Metadata = { title: 'Store Inventory - ChefFlow' }

export default async function StoreInventoryPage({
  params,
}: {
  params: Promise<{ storeId: string }>
}) {
  await requireChef()
  const { storeId } = await params

  // Fetch store info
  const storeRows = await pgClient`
    SELECT s.*, c.name AS chain_name, c.slug AS chain_slug
    FROM openclaw.stores s
    JOIN openclaw.chains c ON c.id = s.chain_id
    WHERE s.id = ${storeId}
    LIMIT 1
  `
  const store = storeRows[0]

  if (!store) {
    return (
      <div className="space-y-4">
        <Link
          href="/prices"
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Store Prices
        </Link>
        <p className="text-stone-400">Store not found.</p>
      </div>
    )
  }

  const { products, total, departments } = await getStoreInventory({
    storeId,
    page: 1,
    limit: 50,
  })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/prices"
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Store Prices
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">{store.name}</h1>
        <p className="text-stone-400 mt-1">
          {store.chain_name} - {store.city}, {store.state} {store.zip}
        </p>
        {store.phone && <p className="text-xs text-stone-500 mt-1">{store.phone}</p>}
      </div>

      <StoreInventoryBrowser
        storeId={storeId}
        initialProducts={products}
        initialTotal={total}
        departments={departments}
      />
    </div>
  )
}
