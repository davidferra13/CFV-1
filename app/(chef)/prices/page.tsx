import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getStoreCatalogStats, getChains } from '@/lib/openclaw/store-catalog-actions'
import { getOpenClawRefreshStatus } from '@/lib/openclaw/refresh-status-actions'
import { OpenClawRefreshStatus } from '@/components/pricing/openclaw-refresh-status'
import { PricesCatalogClient } from './prices-client'

export const metadata: Metadata = { title: 'Store Prices' }

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
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-3 min-w-[140px]">
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {pulse && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        )}
        <p className="text-xl font-bold text-stone-100 tabular-nums">{value}</p>
      </div>
      {sub && <p className="text-xs text-stone-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function PricesPage() {
  await requireChef()

  const [stats, chains, refreshStatus] = await Promise.all([
    getStoreCatalogStats(),
    getChains(),
    getOpenClawRefreshStatus(),
  ])

  const freshPct = stats.prices > 0 ? Math.round((stats.freshPrices / stats.prices) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Ingredient Price Engine</h1>
        <p className="text-stone-400 mt-1">
          Live grocery price database. Every product, every store, every price - updated regularly
          from local store data.
        </p>
      </div>

      {/* Engine stats dashboard */}
      <div className="flex flex-wrap gap-3">
        <StatCard
          label="Products Tracked"
          value={stats.foodProducts.toLocaleString()}
          sub={`${stats.products.toLocaleString()} total (incl. non-food)`}
          pulse={stats.foodProducts > 0}
        />
        <StatCard
          label="Price Observations"
          value={stats.prices.toLocaleString()}
          sub={`${freshPct}% updated within 7 days`}
          pulse={stats.freshPrices > 0}
        />
        <StatCard
          label="Ingredients Mapped"
          value={stats.ingredients.toLocaleString()}
          sub={`${stats.normMappings.toLocaleString()} product mappings`}
        />
        <StatCard
          label="Stores"
          value={stats.stores.toLocaleString()}
          sub={`across ${stats.chainsWithData.length} active chains`}
        />
        <StatCard
          label="USDA Baselines"
          value={stats.usdaBaselines.toLocaleString()}
          sub={`${stats.categories} food categories`}
        />
      </div>

      {/* Refresh status surface - shows truthful last-known mirror timing */}
      <OpenClawRefreshStatus status={refreshStatus} variant="local-mirror" />

      {/* Chain breakdown */}
      {stats.chainsWithData.length > 0 && (
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
          <p className="text-xs text-stone-500 mb-3 font-medium uppercase tracking-wider">
            Active Chains
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.chainsWithData.map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-1.5 text-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-stone-300">{c.name}</span>
                <span className="text-stone-500 text-xs">{c.prices.toLocaleString()}</span>
              </span>
            ))}
            {chains
              .filter((ch) => !stats.chainsWithData.find((d) => d.name === ch.name))
              .map((ch) => (
                <span
                  key={ch.slug}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-1.5 text-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-600" />
                  <span className="text-stone-600">{ch.name}</span>
                  <span className="text-stone-700 text-xs">pending</span>
                </span>
              ))}
          </div>
        </div>
      )}

      <PricesCatalogClient chains={chains} hasData={stats.stores > 0} />
    </div>
  )
}
