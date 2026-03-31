import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getStoreCatalogStats, getChains } from '@/lib/openclaw/store-catalog-actions'
import { PricesCatalogClient } from './prices-client'

export const metadata: Metadata = { title: 'Store Prices' }

export default async function PricesPage() {
  await requireChef()

  const [stats, chains] = await Promise.all([getStoreCatalogStats(), getChains()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Store Prices</h1>
        <p className="text-stone-400 mt-1">
          Browse nearby store inventories with real prices. Enter a zip code to find stores.
        </p>
      </div>

      {/* Stats bar */}
      {(stats.stores > 0 || stats.products > 0) && (
        <div className="flex flex-wrap gap-4 text-xs text-stone-500">
          <span>{stats.chains} chains</span>
          <span>{stats.stores.toLocaleString()} stores</span>
          <span>{stats.products.toLocaleString()} products</span>
          <span>{stats.prices.toLocaleString()} prices tracked</span>
          {stats.lastSync && (
            <span>Last sync: {new Date(stats.lastSync).toLocaleDateString()}</span>
          )}
        </div>
      )}

      <PricesCatalogClient chains={chains} hasData={stats.stores > 0} />
    </div>
  )
}
