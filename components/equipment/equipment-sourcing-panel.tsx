'use client'

import { useState, useEffect, useTransition } from 'react'
import { ExternalLink, Search, Loader2 } from 'lucide-react'
import {
  searchEquipmentOnline,
  type EquipmentSourcingResult,
} from '@/lib/equipment/equipment-sourcing-actions'
import { findProcurementOptions } from '@/lib/equipment/procurement-catalog'
import { Badge } from '@/components/ui/badge'

const TIER_LABELS = {
  budget: { label: 'Get It Done', color: 'text-stone-400' },
  mid: { label: 'Workhorse', color: 'text-amber-400' },
  premium: { label: 'Investment', color: 'text-emerald-400' },
} as const

interface Props {
  query: string
  className?: string
}

/**
 * Equipment sourcing panel.
 * Two layers: static catalog (instant) + DDG search (1-2s).
 * Same pattern as WebSourcingPanel for ingredients.
 */
export function EquipmentSourcingPanel({ query, className = '' }: Props) {
  const [results, setResults] = useState<EquipmentSourcingResult[]>([])
  const [isPending, startTransition] = useTransition()
  const [searched, setSearched] = useState(false)

  // Layer 1: Static catalog (instant)
  const catalogEntry = findProcurementOptions(query)

  // Layer 2: DDG search on mount
  useEffect(() => {
    if (!query.trim() || query.length < 2) return
    setSearched(false)

    startTransition(async () => {
      try {
        const res = await searchEquipmentOnline(query)
        if (res.source === 'live' || res.source === 'fallback') {
          setResults(res.results)
        }
      } catch {
        setResults([])
      }
      setSearched(true)
    })
  }, [query])

  if (!query.trim() || query.length < 2) return null

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Static catalog options */}
      {catalogEntry && (
        <div>
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
            Recommended Options
          </h4>
          <div className="space-y-2">
            {catalogEntry.options.map((opt) => {
              const tierConf = TIER_LABELS[opt.tier]
              return (
                <div
                  key={opt.tier}
                  className="flex items-center justify-between bg-stone-800/50 rounded-lg px-3 py-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${tierConf.color}`}>
                        {tierConf.label}
                      </span>
                      <span className="text-sm text-stone-200">{opt.brand_hint}</span>
                    </div>
                    <span className="text-xs text-stone-500">
                      ${(opt.price_range_cents[0] / 100).toFixed(0)}-$
                      {(opt.price_range_cents[1] / 100).toFixed(0)}
                    </span>
                  </div>
                  {opt.restaurant_depot && (
                    <Badge variant="info" className="text-[10px]">
                      Restaurant Depot
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Web search results */}
      <div>
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
          {isPending ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Searching suppliers...
            </span>
          ) : (
            'Where to Buy'
          )}
        </h4>
        {results.length > 0 && (
          <div className="space-y-1.5">
            {results.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-stone-800/30 hover:bg-stone-800/60 rounded-lg px-3 py-2 group transition"
              >
                <div className="min-w-0">
                  <p className="text-sm text-stone-200 truncate">{r.title}</p>
                  <p className="text-xs text-stone-500">{r.retailer}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-stone-600 group-hover:text-stone-400 shrink-0 ml-2" />
              </a>
            ))}
          </div>
        )}
        {searched && results.length === 0 && !catalogEntry && (
          <p className="text-xs text-stone-600">No results found. Try a different search term.</p>
        )}
      </div>
    </div>
  )
}
