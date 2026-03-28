'use client'

import type { CatalogItemDetail } from '@/lib/openclaw/catalog-actions'

interface PriceComparisonBarsProps {
  prices: CatalogItemDetail[]
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-emerald-900 text-emerald-400',
  medium: 'bg-amber-900 text-amber-400',
  low: 'bg-stone-800 text-stone-400',
  exact_receipt: 'bg-emerald-900 text-emerald-400',
  direct_scrape: 'bg-emerald-900 text-emerald-400',
  instacart_adjusted: 'bg-amber-900 text-amber-400',
  flyer_scrape: 'bg-amber-900 text-amber-400',
  government_baseline: 'bg-stone-800 text-stone-400',
}

export function PriceComparisonBars({ prices }: PriceComparisonBarsProps) {
  if (prices.length === 0) return null

  const maxPrice = Math.max(...prices.map((p) => p.priceCents))
  const minPrice = Math.min(...prices.map((p) => p.priceCents))

  return (
    <div className="space-y-1.5">
      {prices.map((price, i) => {
        const widthPct = maxPrice > 0 ? (price.priceCents / maxPrice) * 100 : 100
        const isCheapest = price.priceCents === minPrice

        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-stone-400 w-36 truncate flex-shrink-0">
              {price.store}
            </span>
            <div className="flex-1 h-7 bg-stone-800 rounded overflow-hidden relative">
              <div
                className={`h-full rounded transition-all ${isCheapest ? 'bg-emerald-600' : 'bg-stone-600'}`}
                style={{ width: `${Math.max(widthPct, 8)}%` }}
              >
                <span className="absolute inset-y-0 left-2 flex items-center text-xs text-stone-100 font-medium">
                  ${(price.priceCents / 100).toFixed(2)}/{price.unit}
                </span>
              </div>
            </div>
            <span
              className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${CONFIDENCE_COLORS[price.confidence.toLowerCase()] || CONFIDENCE_COLORS.medium}`}
            >
              {price.confidence}
            </span>
            <span className="text-xs text-stone-500 w-16 text-right flex-shrink-0">
              {price.tier}
            </span>
            <span className="text-xs text-stone-500 w-20 text-right flex-shrink-0">
              {price.lastConfirmedAt ? new Date(price.lastConfirmedAt).toLocaleDateString() : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}
