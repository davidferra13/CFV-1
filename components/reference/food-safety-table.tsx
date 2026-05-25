'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from '@/components/ui/external-link'
import {
  searchFoodSafety,
  filterByCategory,
  CATEGORY_LABELS,
  getFoodSafetyCategories,
  getSousVideEntries,
} from '@/lib/reference/food-safety'
import type { FoodSafetyCategory, FoodSafetyEntry } from '@/lib/reference/types'
import { Search, Thermometer, ShieldCheck } from '@/components/ui/icons'

export function FoodSafetyTable() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<FoodSafetyCategory | 'all' | 'sous-vide'>(
    'all'
  )
  const categories = getFoodSafetyCategories()

  const results = useMemo(() => {
    if (activeCategory === 'sous-vide') {
      const svEntries = getSousVideEntries()
      if (!query.trim()) return svEntries
      const q = query.toLowerCase()
      return svEntries.filter(
        (e) =>
          e.item.toLowerCase().includes(q) || e.keywords.some((k) => k.toLowerCase().includes(q))
      )
    }
    if (activeCategory === 'all') return searchFoodSafety(query)
    const catEntries = filterByCategory(activeCategory)
    if (!query.trim()) return catEntries
    const q = query.toLowerCase()
    return catEntries.filter(
      (e) => e.item.toLowerCase().includes(q) || e.keywords.some((k) => k.toLowerCase().includes(q))
    )
  }, [query, activeCategory])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by food name (chicken, salmon, rice...)"
          className="w-full rounded-lg border border-stone-600 bg-stone-900 pl-10 pr-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-stone-400 focus:outline-none"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-brand-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:text-stone-200'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
        <button
          onClick={() => setActiveCategory('sous-vide')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeCategory === 'sous-vide'
              ? 'bg-brand-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:text-stone-200'
          }`}
        >
          Sous Vide
        </button>
      </div>

      <p className="text-xs text-stone-500">{results.length} entries</p>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500 text-sm">
              No food safety entries found for &quot;{query}&quot;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((entry) => (
            <FoodSafetyRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

function FoodSafetyRow({ entry }: { entry: FoodSafetyEntry }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-6 py-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Thermometer className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-stone-100 truncate">{entry.item}</h3>
              <p className="text-xs text-stone-500">{CATEGORY_LABELS[entry.category]}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {entry.internalTempF != null && (
              <div className="text-right">
                <span className="text-lg font-bold text-orange-400">
                  {entry.internalTempF}\u00b0F
                </span>
                <span className="text-xs text-stone-500 ml-1">({entry.internalTempC}\u00b0C)</span>
              </div>
            )}
            {entry.restTimeMinutes != null && (
              <Badge variant="info">+ {entry.restTimeMinutes} min rest</Badge>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-4 border-t border-stone-800 pt-4 space-y-3">
          {entry.holdTempMinF != null && (
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-stone-300">Hot Hold / Cold Hold</p>
                <p className="text-xs text-stone-400">
                  Hot hold: {entry.holdTempMinF}\u00b0F minimum | Cold hold: {entry.holdTempMaxF}
                  \u00b0F maximum
                </p>
              </div>
            </div>
          )}

          {entry.dangerZoneNotes && (
            <div>
              <p className="text-xs font-medium text-red-400">Danger Zone</p>
              <p className="text-xs text-stone-400">{entry.dangerZoneNotes}</p>
            </div>
          )}

          {entry.coolingProtocol && (
            <div>
              <p className="text-xs font-medium text-stone-300">Cooling Protocol</p>
              <p className="text-xs text-stone-400">{entry.coolingProtocol}</p>
            </div>
          )}

          {entry.thawingMethods.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stone-300">Thawing Methods</p>
              <ul className="text-xs text-stone-400 list-disc list-inside">
                {entry.thawingMethods.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {entry.storageFridge && (
              <div>
                <p className="text-xs font-medium text-stone-300">Refrigerator Storage</p>
                <p className="text-xs text-stone-400">{entry.storageFridge}</p>
              </div>
            )}
            {entry.storageFreezer && (
              <div>
                <p className="text-xs font-medium text-stone-300">Freezer Storage</p>
                <p className="text-xs text-stone-400">{entry.storageFreezer}</p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
            <ExternalLink
              href={entry.sourceUrl}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              {entry.sourceLabel}
            </ExternalLink>
            <span className="text-xs text-stone-600">Verified: {entry.lastVerified}</span>
          </div>
        </div>
      )}
    </Card>
  )
}
