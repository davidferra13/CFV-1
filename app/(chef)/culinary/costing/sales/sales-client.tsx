'use client'

import { useState, useTransition } from 'react'
import { getCurrentSales, type SaleItem } from '@/lib/openclaw/sale-calendar-actions'

function groupByCategory(sales: SaleItem[]): Record<string, SaleItem[]> {
  const groups: Record<string, SaleItem[]> = {}
  for (const item of sales) {
    const cat = item.category || 'Other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  }
  return groups
}

function formatPrice(cents: number, unit: string): string {
  return `$${(cents / 100).toFixed(2)}/${unit}`
}

export function SalesPageClient({
  initialSales,
  initialError,
  storeNames,
}: {
  initialSales: SaleItem[]
  initialError: string | null
  storeNames: string[]
}) {
  const [sales, setSales] = useState(initialSales)
  const [error, setError] = useState(initialError)
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set(storeNames))
  const [isPending, startTransition] = useTransition()

  function toggleStore(store: string) {
    const next = new Set(selectedStores)
    if (next.has(store)) next.delete(store)
    else next.add(store)
    setSelectedStores(next)

    startTransition(async () => {
      try {
        const result = await getCurrentSales([...next])
        setSales(result.sales)
        setError(result.error)
      } catch {
        setError('Could not load sales data')
      }
    })
  }

  function handleRetry() {
    startTransition(async () => {
      try {
        const result = await getCurrentSales([...selectedStores])
        setSales(result.sales)
        setError(result.error)
      } catch {
        setError('Could not load sales data')
      }
    })
  }

  if (error && sales.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-8 text-center">
        <p className="text-stone-400">{error}</p>
        <button
          onClick={handleRetry}
          disabled={isPending}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    )
  }

  const grouped = groupByCategory(sales)
  const categories = Object.keys(grouped).sort()

  return (
    <div className="space-y-6">
      {/* Store filter chips */}
      {storeNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {storeNames.map((store) => (
            <button
              key={store}
              onClick={() => toggleStore(store)}
              disabled={isPending}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                selectedStores.has(store)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-stone-600 text-stone-400 hover:border-stone-500'
              }`}
            >
              {store}
            </button>
          ))}
        </div>
      )}

      {isPending && <div className="text-sm text-stone-500">Loading sales...</div>}

      {/* Sales grid by category */}
      {categories.length === 0 && !isPending && (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-8 text-center">
          <p className="text-stone-400">
            No current sales data. Sales refresh weekly on Wednesdays.
          </p>
        </div>
      )}

      {categories.map((category) => (
        <div key={category}>
          <h2 className="text-lg font-semibold capitalize mb-3">{category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[category].map((item, i) => (
              <div
                key={`${item.canonicalId}-${item.store}-${i}`}
                className="rounded-lg border border-stone-700 bg-stone-800/50 p-4"
              >
                <div className="font-medium text-sm">{item.ingredientName}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-green-400">
                    {formatPrice(item.salePriceCents, item.unit)}
                  </span>
                  {item.regularPriceCents && (
                    <span className="text-sm text-stone-500 line-through">
                      {formatPrice(item.regularPriceCents, item.unit)}
                    </span>
                  )}
                  {item.savingsPct && (
                    <span className="text-xs text-green-500 font-medium">
                      -{Math.round(item.savingsPct)}%
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-stone-500">
                  {item.store}
                  {item.validThrough && ` · until ${item.validThrough}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
