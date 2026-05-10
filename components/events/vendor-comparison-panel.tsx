'use client'

/**
 * Vendor Comparison Panel
 *
 * Shows a comparison table for event procurement:
 * rows = ingredients, columns = top vendors/stores from Pi Bridge data.
 * Highlights cheapest per-ingredient and cheapest overall vendor.
 * Shows potential savings from switching vendors.
 */

import { useCallback, useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getVendorComparison,
  type VendorComparisonResult,
} from '@/lib/procurement/vendor-comparison-actions'

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
  eventId: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatQty(qty: number, unit: string): string {
  const rounded = Number.isInteger(qty) ? qty : parseFloat(qty.toFixed(2))
  return `${rounded} ${unit}`
}

// ── Main Component ───────────────────────────────────────────────────────────

export function VendorComparisonPanel({ eventId }: Props) {
  const [data, setData] = useState<VendorComparisonResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const loadComparison = useCallback(() => {
    setError(null)
    setIsOpen(true)
    startTransition(async () => {
      try {
        const result = await getVendorComparison(eventId)
        if (!result) {
          setError(
            'No ingredients found for comparison. Make sure this event has a menu with recipes.'
          )
          return
        }
        if (result.vendors.length === 0) {
          setError(
            'No vendor pricing data available. The Pi Bridge may be offline, or no stores carry these ingredients.'
          )
          return
        }
        setData(result)
      } catch {
        setError('Failed to load vendor comparison. Please try again.')
      }
    })
  }, [eventId])

  if (!isOpen) {
    return (
      <Button variant="secondary" onClick={loadComparison} loading={isPending}>
        Compare Vendors
      </Button>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Vendor Comparison</h2>
          <p className="mt-1 text-sm text-stone-500">
            Side-by-side pricing across stores for this event's ingredients.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={loadComparison} loading={isPending}>
            {data ? 'Refresh' : 'Load'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false)
              setData(null)
              setError(null)
            }}
          >
            Close
          </Button>
        </div>
      </div>

      {isPending && (
        <Card className="p-6">
          <div className="space-y-2">
            <div className="h-4 loading-bone loading-bone-muted" />
            <div className="h-4 loading-bone loading-bone-muted w-4/5" />
            <div className="h-4 loading-bone loading-bone-muted w-3/5" />
            <p className="text-xs text-stone-500 mt-3">
              Querying live store prices for each ingredient. This may take a moment for large
              menus...
            </p>
          </div>
        </Card>
      )}

      {error && !isPending && (
        <Card className="p-6">
          <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        </Card>
      )}

      {data && !isPending && <ComparisonTable data={data} />}
    </section>
  )
}

// ── Comparison Table ─────────────────────────────────────────────────────────

function ComparisonTable({ data }: { data: VendorComparisonResult }) {
  const { ingredients, vendors } = data

  // Find which vendor is cheapest for each ingredient
  const cheapestByIngredient = new Map<string, { vendor: string; cents: number }>()
  for (const row of ingredients) {
    let best: { vendor: string; cents: number } | null = null
    for (const vendor of vendors) {
      const vp = vendor.prices[row.ingredientId]
      if (vp?.totalCents != null) {
        if (!best || vp.totalCents < best.cents) {
          best = { vendor: vendor.name, cents: vp.totalCents }
        }
      }
    }
    if (best) cheapestByIngredient.set(row.ingredientId, best)
  }

  return (
    <div className="space-y-4">
      {/* Savings banner */}
      {data.maxSavingsCents > 0 && vendors.length >= 2 && (
        <Card className="p-4 border-emerald-800 bg-emerald-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-900 flex items-center justify-center text-emerald-400 text-lg font-bold shrink-0">
              $
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                Potential savings: {formatCurrency(data.maxSavingsCents)}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                Switching from {vendors[vendors.length - 1]?.name} to {data.cheapestOverallVendor}{' '}
                for all ingredients where both have pricing.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Main comparison table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="text-left py-2 pr-4 font-medium text-stone-300 sticky left-0 bg-stone-900 z-10">
                  Ingredient
                </th>
                <th className="text-left py-2 pr-4 font-medium text-stone-500 whitespace-nowrap">
                  Qty
                </th>
                {vendors.map((vendor, i) => (
                  <th
                    key={vendor.name}
                    className={`text-right py-2 px-3 font-medium whitespace-nowrap ${
                      i === 0 && data.cheapestOverallVendor === vendor.name
                        ? 'text-emerald-400'
                        : 'text-stone-300'
                    }`}
                  >
                    <div>{vendor.name}</div>
                    <div className="text-xs font-normal text-stone-500">
                      {vendor.coverageCount}/{ingredients.length} items
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ingredients.map((row) => {
                const cheapest = cheapestByIngredient.get(row.ingredientId)
                return (
                  <tr key={row.ingredientId} className="border-b border-stone-800 last:border-0">
                    <td className="py-2 pr-4 text-stone-100 sticky left-0 bg-stone-900 z-10">
                      {row.ingredientName}
                    </td>
                    <td className="py-2 pr-4 text-stone-500 whitespace-nowrap">
                      {formatQty(row.quantity, row.unit)}
                    </td>
                    {vendors.map((vendor) => {
                      const vp = vendor.prices[row.ingredientId]
                      const hasCost = vp?.totalCents != null
                      const isCheapest = hasCost && cheapest?.vendor === vendor.name

                      return (
                        <td
                          key={vendor.name}
                          className={`py-2 px-3 text-right whitespace-nowrap ${
                            isCheapest
                              ? 'text-emerald-400 font-semibold'
                              : hasCost
                                ? 'text-stone-100'
                                : 'text-stone-600'
                          }`}
                        >
                          {hasCost ? (
                            <div>
                              <span>{formatCurrency(vp.totalCents!)}</span>
                              {vp.priceCents != null && (
                                <span className="block text-xs text-stone-500 font-normal">
                                  {formatCurrency(vp.priceCents)}/{vp.unit || 'ea'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs">--</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-600">
                <td
                  colSpan={2}
                  className="py-3 font-semibold text-stone-100 sticky left-0 bg-stone-900 z-10"
                >
                  Total
                </td>
                {vendors.map((vendor, i) => {
                  const isOverallCheapest = data.cheapestOverallVendor === vendor.name
                  return (
                    <td
                      key={vendor.name}
                      className={`py-3 px-3 text-right font-bold ${
                        isOverallCheapest ? 'text-emerald-400 text-lg' : 'text-stone-100'
                      }`}
                    >
                      {vendor.totalCents > 0 ? formatCurrency(vendor.totalCents) : '--'}
                      {isOverallCheapest && vendor.totalCents > 0 && (
                        <span className="block text-xs font-normal text-emerald-600">
                          Best value
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
              {/* Coverage row */}
              <tr>
                <td
                  colSpan={2}
                  className="py-1 text-xs text-stone-500 sticky left-0 bg-stone-900 z-10"
                >
                  Coverage
                </td>
                {vendors.map((vendor) => {
                  const pct =
                    ingredients.length > 0
                      ? Math.round((vendor.coverageCount / ingredients.length) * 100)
                      : 0
                  return (
                    <td key={vendor.name} className="py-1 px-3 text-right text-xs text-stone-500">
                      {pct}%
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-stone-500 border-t border-stone-800 pt-4">
          <span>
            <span className="font-medium text-emerald-400">Green</span> = cheapest option for that
            ingredient or overall
          </span>
          <span>
            <span className="font-medium text-stone-300">Coverage</span> = percentage of ingredients
            this store has pricing for
          </span>
          <span>
            Prices from Pi Bridge (live store data). Totals only include ingredients where the store
            has data.
          </span>
        </div>
      </Card>
    </div>
  )
}
