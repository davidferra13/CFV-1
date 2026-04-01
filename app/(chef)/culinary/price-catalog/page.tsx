import { requireChef } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { getStoreCatalogStats } from '@/lib/openclaw/store-catalog-actions'
import { CatalogBrowser } from './catalog-browser'

export const metadata = { title: 'Food Catalog' }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function PriceCatalogPage() {
  try {
    await requireChef()
  } catch {
    redirect('/sign-in')
  }

  const stats = await getStoreCatalogStats()
  const freshPct = stats.prices > 0 ? Math.round((stats.freshPrices / stats.prices) * 100) : 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-100">Food Catalog</h1>
        <p className="text-sm text-stone-500">
          Browse ingredients by store, compare prices, and build your shopping list
        </p>
      </div>

      {/* Engine pulse */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-2.5 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
          <span className="text-stone-400">Engine Live</span>
        </span>
        <span className="text-stone-300 font-medium tabular-nums">
          {stats.foodProducts.toLocaleString()}
          <span className="text-stone-500 font-normal"> products</span>
        </span>
        <span className="text-stone-300 font-medium tabular-nums">
          {stats.prices.toLocaleString()}
          <span className="text-stone-500 font-normal"> prices</span>
        </span>
        <span className="text-stone-300 font-medium tabular-nums">
          {stats.ingredients.toLocaleString()}
          <span className="text-stone-500 font-normal"> ingredients</span>
        </span>
        <span className="text-stone-300 font-medium tabular-nums">
          {stats.chainsWithData.length}
          <span className="text-stone-500 font-normal"> chains</span>
        </span>
        <span className="text-stone-300 font-medium tabular-nums">
          {freshPct}%<span className="text-stone-500 font-normal"> fresh</span>
        </span>
        {stats.lastSync && <span className="text-stone-500">synced {timeAgo(stats.lastSync)}</span>}
      </div>

      <CatalogBrowser />
    </div>
  )
}
