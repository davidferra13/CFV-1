'use client'

import { ExternalLink, ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ProcurementCatalogEntry, ProcurementTier } from '@/lib/equipment/types'

const TIER_STYLE: Record<ProcurementTier, { bg: string; text: string; label: string }> = {
  budget: { bg: 'bg-stone-800/50', text: 'text-stone-300', label: 'Get It Done' },
  mid: { bg: 'bg-amber-900/20', text: 'text-amber-400', label: 'Workhorse' },
  premium: { bg: 'bg-emerald-900/20', text: 'text-emerald-400', label: 'Investment' },
}

interface Props {
  entry: ProcurementCatalogEntry
  onPurchased?: (tier: ProcurementTier) => void
  className?: string
}

/**
 * Tiered procurement card for a single equipment item.
 * Shows budget/mid/premium options with brand hints and price ranges.
 */
export function ProcurementCard({ entry, onPurchased, className = '' }: Props) {
  return (
    <div className={`border border-stone-800 rounded-lg overflow-hidden ${className}`}>
      <div className="px-4 py-2 bg-stone-900/50 border-b border-stone-800">
        <span className="text-sm font-medium text-stone-200">{entry.canonical_name}</span>
      </div>
      <div className="divide-y divide-stone-800/50">
        {entry.options.map((opt) => {
          const style = TIER_STYLE[opt.tier]
          return (
            <div
              key={opt.tier}
              className={`px-4 py-3 flex items-center justify-between gap-3 ${style.bg}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
                  <span className="text-sm text-stone-200">{opt.brand_hint}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <span>
                    ${(opt.price_range_cents[0] / 100).toFixed(0)}-$
                    {(opt.price_range_cents[1] / 100).toFixed(0)}
                  </span>
                  {opt.restaurant_depot && (
                    <Badge variant="info" className="text-[10px] py-0">
                      R.D.
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(opt.search_terms[0])}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded hover:bg-stone-700/50 text-stone-500 hover:text-stone-300 transition"
                  title="Search online"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {onPurchased && (
                  <button
                    onClick={() => onPurchased(opt.tier)}
                    className="p-1.5 rounded hover:bg-emerald-900/50 text-stone-500 hover:text-emerald-400 transition"
                    title="Mark as purchased"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
