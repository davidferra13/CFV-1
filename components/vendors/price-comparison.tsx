'use client'

import { Fragment, useMemo, useState } from 'react'
import {
  buildVendorRecommendation,
  type VendorComparisonRecommendation,
} from '@/lib/vendors/deterministic-comparison'
import {
  deriveComparableUnitPrice,
  normalizeIngredientName,
  type ComparablePrice,
} from '@/lib/vendors/price-normalization'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface ComparisonItem {
  id: string
  vendor_item_name: string
  unit_price_cents: number
  unit_size: number | string | null
  unit_measure: string | null
  notes?: string | null
  updated_at?: string | null
  ingredient_id: string | null
  vendors: { name: string; status: string } | null
}

interface ComparisonGroup {
  ingredientId: string
  items: ComparisonItem[]
}

interface ComputedVendorOption {
  item: ComparisonItem
  comparable: ComparablePrice
}

interface PriceComparisonProps {
  data: ComparisonGroup[]
}

type SortMode = 'savings_desc' | 'name_asc' | 'best_price_asc'

interface PreparedGroup {
  ingredientId: string
  ingredientName: string
  normalizedIngredientName: string
  vendorPriceMap: Map<string, ComputedVendorOption>
  vendorCount: number
  cheapestCents: number | null
  secondCheapestCents: number | null
  highestCents: number | null
  bestVendor: string | null
  savingsVsSecondCents: number | null
  savingsVsHighestCents: number | null
  recommendation: VendorComparisonRecommendation | null
}

function formatMoney(cents: number | null): string {
  if (cents === null || Number.isNaN(cents)) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

function buildVendorPriceMap(group: ComparisonGroup): Map<string, ComparisonItem> {
  const byVendor = new Map<string, ComparisonItem>()

  for (const item of group.items) {
    const vendorName = item.vendors?.name
    if (!vendorName) continue

    const existing = byVendor.get(vendorName)
    if (!existing || item.unit_price_cents < existing.unit_price_cents) {
      byVendor.set(vendorName, item)
    }
  }

  return byVendor
}

function buildComparableOption(item: ComparisonItem): ComputedVendorOption {
  return {
    item,
    comparable: deriveComparableUnitPrice({
      priceCents: item.unit_price_cents,
      itemName: item.vendor_item_name,
      unitSize: item.unit_size,
      unitMeasure: item.unit_measure,
    }),
  }
}

function buildPreparedGroup(group: ComparisonGroup): PreparedGroup {
  const rawVendorMap = buildVendorPriceMap(group)
  const vendorPriceMap = new Map<string, ComputedVendorOption>()
  for (const [vendorName, item] of rawVendorMap) {
    vendorPriceMap.set(vendorName, buildComparableOption(item))
  }

  const comparableUnits = new Set(
    Array.from(vendorPriceMap.values()).map((option) => option.comparable.displayUnit)
  )
  if (comparableUnits.size > 1) {
    for (const option of vendorPriceMap.values()) {
      option.comparable = {
        comparableCents: option.item.unit_price_cents,
        displayUnit: 'item',
        usedNormalization: false,
        baseUnit: null,
        normalizedQuantity: null,
        packCount: option.comparable.packCount,
      }
    }
  }

  const vendorRows = Array.from(vendorPriceMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  const sortedPrices = vendorRows
    .map(([vendorName, option]) => ({ vendorName, cents: option.comparable.comparableCents }))
    .sort((a, b) => a.cents - b.cents)

  const cheapest = sortedPrices[0] ?? null
  const secondCheapest = sortedPrices[1] ?? null
  const highest = sortedPrices[sortedPrices.length - 1] ?? null

  const ingredientName = group.items[0]?.vendor_item_name ?? 'Unknown'
  const normalizedIngredientName = normalizeIngredientName(ingredientName)
  const recommendation = buildVendorRecommendation(
    vendorRows.map(([vendorName, option]) => ({
      vendorName,
      priceCents: Math.round(option.comparable.comparableCents),
      unit: option.comparable.displayUnit,
    }))
  )

  return {
    ingredientId: group.ingredientId,
    ingredientName,
    normalizedIngredientName,
    vendorPriceMap,
    vendorCount: vendorRows.length,
    cheapestCents: cheapest?.cents ?? null,
    secondCheapestCents: secondCheapest?.cents ?? null,
    highestCents: highest?.cents ?? null,
    bestVendor: cheapest?.vendorName ?? null,
    savingsVsSecondCents:
      cheapest && secondCheapest ? Math.max(0, secondCheapest.cents - cheapest.cents) : null,
    savingsVsHighestCents: cheapest && highest ? Math.max(0, highest.cents - cheapest.cents) : null,
    recommendation,
  }
}

function sortGroups(groups: PreparedGroup[], sortMode: SortMode): PreparedGroup[] {
  const sorted = [...groups]

  if (sortMode === 'name_asc') {
    sorted.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
    return sorted
  }

  if (sortMode === 'best_price_asc') {
    sorted.sort((a, b) => {
      const left = a.cheapestCents ?? Number.POSITIVE_INFINITY
      const right = b.cheapestCents ?? Number.POSITIVE_INFINITY
      return left - right || a.ingredientName.localeCompare(b.ingredientName)
    })
    return sorted
  }

  sorted.sort((a, b) => {
    const left = a.savingsVsHighestCents ?? -1
    const right = b.savingsVsHighestCents ?? -1
    return right - left || a.ingredientName.localeCompare(b.ingredientName)
  })
  return sorted
}

export function PriceComparison({ data }: PriceComparisonProps) {
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('savings_desc')

  const preparedGroups = useMemo(() => data.map(buildPreparedGroup), [data])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredAndSortedGroups = useMemo(() => {
    const filtered = preparedGroups.filter((group) => {
      if (!normalizedQuery) return true

      if (group.ingredientName.toLowerCase().includes(normalizedQuery)) return true
      if (group.normalizedIngredientName.includes(normalizedQuery)) return true

      for (const vendorName of group.vendorPriceMap.keys()) {
        if (vendorName.toLowerCase().includes(normalizedQuery)) return true
      }

      return false
    })

    return sortGroups(filtered, sortMode)
  }, [preparedGroups, normalizedQuery, sortMode])

  const vendors = useMemo(() => {
    const vendorNames = new Set<string>()
    for (const group of filteredAndSortedGroups) {
      for (const vendorName of group.vendorPriceMap.keys()) {
        vendorNames.add(vendorName)
      }
    }
    return Array.from(vendorNames).sort()
  }, [filteredAndSortedGroups])

  const summary = useMemo(() => {
    const comparable = filteredAndSortedGroups.filter((group) => group.vendorCount >= 2)

    const totalSpread = comparable.reduce(
      (sum, group) => sum + (group.savingsVsHighestCents ?? 0),
      0
    )

    const biggestSpreadGroup = comparable.reduce<PreparedGroup | null>((current, candidate) => {
      if (!candidate.savingsVsHighestCents) return current
      if (
        !current ||
        (candidate.savingsVsHighestCents ?? 0) > (current.savingsVsHighestCents ?? 0)
      ) {
        return candidate
      }
      return current
    }, null)

    return {
      totalIngredients: filteredAndSortedGroups.length,
      comparableCount: comparable.length,
      totalSpread,
      biggestSpreadGroup,
    }
  }, [filteredAndSortedGroups])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Price Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">
            No ingredient-linked vendor items yet. Link vendor items to ingredients to see price
            comparisons across vendors.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Price Comparison by Ingredient</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-stone-500">Ingredients</p>
            <p className="text-base font-semibold text-stone-100">{summary.totalIngredients}</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-stone-500">Ready to Compare</p>
            <p className="text-base font-semibold text-stone-100">{summary.comparableCount}</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-stone-500">Total Price Spread</p>
            <p className="text-base font-semibold text-emerald-400">
              {formatMoney(summary.totalSpread)}
            </p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-stone-500">Largest Gap</p>
            <p className="text-sm font-semibold text-stone-100 truncate">
              {summary.biggestSpreadGroup?.ingredientName ?? '-'}
            </p>
            <p className="text-xs text-stone-400">
              {formatMoney(summary.biggestSpreadGroup?.savingsVsHighestCents ?? null)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ingredient or vendor"
            aria-label="Search ingredient or vendor"
          />
          <Select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            aria-label="Sort comparison"
            options={[
              { value: 'savings_desc', label: 'Sort: Largest Savings' },
              { value: 'name_asc', label: 'Sort: Ingredient A-Z' },
              { value: 'best_price_asc', label: 'Sort: Best Price Low-High' },
            ]}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-left text-stone-400">
                <th className="pb-2 pr-4">Ingredient</th>
                {vendors.map((vendorName) => (
                  <th key={vendorName} className="pb-2 pr-4">
                    {vendorName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedGroups.map((group) => {
                const recommendation = group.recommendation

                return (
                  <Fragment key={group.ingredientId}>
                    <tr className="border-b border-stone-800">
                      <td className="py-2 pr-4 align-top">
                        <div className="space-y-1">
                          <p className="text-stone-200 font-medium">{group.ingredientName}</p>
                          {group.bestVendor && group.cheapestCents !== null && (
                            <p className="text-[11px] text-emerald-400">
                              Best normalized: {group.bestVendor} at{' '}
                              {formatMoney(group.cheapestCents)}
                            </p>
                          )}
                          {group.savingsVsSecondCents !== null &&
                            group.savingsVsSecondCents > 0 && (
                              <p className="text-[11px] text-stone-400">
                                Saves {formatMoney(group.savingsVsSecondCents)} vs next option
                              </p>
                            )}
                          {group.savingsVsHighestCents !== null &&
                            group.savingsVsHighestCents > 0 && (
                              <p className="text-[11px] text-stone-400">
                                Spread: {formatMoney(group.savingsVsHighestCents)} from best to
                                highest
                              </p>
                            )}
                          {group.vendorCount < 2 && (
                            <p className="text-[11px] text-stone-500">
                              Need at least 2 vendor prices to compare.
                            </p>
                          )}
                        </div>
                      </td>

                      {vendors.map((vendorName) => {
                        const option = group.vendorPriceMap.get(vendorName)
                        if (!option) {
                          return (
                            <td key={vendorName} className="py-2 pr-4 text-stone-600">
                              -
                            </td>
                          )
                        }

                        const item = option.item
                        const comparableCents = option.comparable.comparableCents
                        const isCheapest =
                          Math.abs(comparableCents - (group.cheapestCents ?? -1)) < 0.0001

                        return (
                          <td
                            key={vendorName}
                            className={`py-2 pr-4 align-top ${
                              isCheapest ? 'text-emerald-400 font-semibold' : 'text-stone-300'
                            }`}
                          >
                            <p>{formatMoney(Math.round(comparableCents))}</p>
                            <p className="text-[11px] text-stone-500">
                              /{option.comparable.displayUnit}
                              {option.comparable.usedNormalization
                                ? ` (from ${formatMoney(item.unit_price_cents)} item price)`
                                : ''}
                            </p>
                          </td>
                        )
                      })}
                    </tr>

                    {recommendation && (
                      <tr className="border-b border-stone-800">
                        <td colSpan={vendors.length + 1} className="py-2 pr-4">
                          <div className="rounded-lg border border-brand-700/40 bg-brand-950/20 px-3 py-2 space-y-1.5">
                            <p className="text-xs text-brand-300 uppercase tracking-wide">
                              Best Value Suggestion
                            </p>
                            <p className="text-sm text-stone-200">
                              <span className="font-semibold">
                                {recommendation.bestValueVendor}:{' '}
                              </span>
                              {recommendation.bestValueRationale}
                            </p>
                            <p className="text-xs text-stone-400">
                              {recommendation.priceDifferenceNote}
                            </p>
                            <p className="text-xs text-stone-300">
                              Recommendation: {recommendation.recommendation}
                            </p>
                            {recommendation.vendorRankings.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {recommendation.vendorRankings.slice(0, 4).map((ranking) => (
                                  <span
                                    key={`${group.ingredientId}-${ranking.rank}-${ranking.vendorName}`}
                                    className="rounded border border-stone-700 bg-stone-900 px-2 py-1 text-[11px] text-stone-300"
                                  >
                                    {ranking.rank}. {ranking.vendorName} (
                                    {Math.round(ranking.valueScore)}
                                    /100)
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-[11px] text-stone-500">
                              Suggestion only. Final purchasing decision is yours.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedGroups.length === 0 && (
          <div className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-400">
            No ingredients match your search.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
