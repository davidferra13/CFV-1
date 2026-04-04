import { requireChef } from '@/lib/auth/get-user'
import { getCatalogStats } from '@/lib/openclaw/catalog-actions'
import { getStoreCatalogStats } from '@/lib/openclaw/store-catalog-actions'
import { getOpenClawRefreshStatus } from '@/lib/openclaw/refresh-status-actions'
import { OpenClawRefreshStatus } from '@/components/pricing/openclaw-refresh-status'
import { CatalogBrowser } from './catalog-browser'

export const metadata = { title: 'Food Catalog' }

function StatCard({
  label,
  value,
  sub,
  pulse,
}: {
  label: string
  value: string
  sub?: string
  pulse?: boolean
}) {
  return (
    <div className="min-w-[150px] rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-3">
      <p className="mb-1 text-xs text-stone-500">{label}</p>
      <div className="flex items-center gap-2">
        {pulse ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        ) : null}
        <p className="tabular-nums text-xl font-bold text-stone-100">{value}</p>
      </div>
      {sub ? <p className="mt-0.5 text-xs text-stone-500">{sub}</p> : null}
    </div>
  )
}

export default async function FoodCatalogPage() {
  await requireChef()

  const [catalogStats, storeStats, refreshStatus] = await Promise.all([
    getCatalogStats(),
    getStoreCatalogStats(),
    getOpenClawRefreshStatus(),
  ])

  const freshPct =
    storeStats.prices > 0 ? Math.round((storeStats.freshPrices / storeStats.prices) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Food Catalog</h1>
        <p className="mt-1 max-w-3xl text-stone-400">
          Browse the synced local catalog mirror stored with ChefFlow. Searches and price detail
          reads stay on the machine running the site instead of reaching upstream at request time.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard
          label="Ingredients"
          value={catalogStats.total.toLocaleString()}
          sub={`${catalogStats.priced.toLocaleString()} with mirrored pricing`}
          pulse={catalogStats.total > 0}
        />
        <StatCard
          label="Active Stores"
          value={storeStats.stores.toLocaleString()}
          sub={`${storeStats.chains.toLocaleString()} chains mirrored locally`}
          pulse={storeStats.stores > 0}
        />
        <StatCard
          label="Price Records"
          value={storeStats.prices.toLocaleString()}
          sub={`${freshPct}% seen within 7 days`}
        />
        <StatCard
          label="Food Products"
          value={storeStats.foodProducts.toLocaleString()}
          sub={`${storeStats.products.toLocaleString()} total mirrored products`}
        />
      </div>

      <OpenClawRefreshStatus status={refreshStatus} variant="local-mirror" />

      <CatalogBrowser />
    </div>
  )
}
