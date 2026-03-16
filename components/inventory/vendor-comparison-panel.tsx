'use client'

// VendorComparisonPanel - Compare prices across vendors for an ingredient.
// Shows all vendors sorted by price with best-price highlight.

import { useState, useEffect, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Store, Trophy, Clock, Package } from '@/components/ui/icons'
import {
  getVendorPricesForIngredient,
  type VendorIngredientPrice,
} from '@/lib/inventory/vendor-comparison-actions'

type VendorComparisonPanelProps = {
  ingredientName: string
  ingredientId?: string | null
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function VendorComparisonPanel({
  ingredientName,
  ingredientId,
}: VendorComparisonPanelProps) {
  const [prices, setPrices] = useState<VendorIngredientPrice[]>([])
  const [loading, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getVendorPricesForIngredient(ingredientName, ingredientId)
        setPrices(data)
      } catch {
        setPrices([])
      }
    })
  }, [ingredientName, ingredientId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse">
            <div className="h-4 w-40 bg-stone-700 rounded mx-auto mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-stone-800 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (prices.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Store className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">
            No vendor pricing for {ingredientName}. Add vendor prices from the vendor management
            page.
          </p>
        </CardContent>
      </Card>
    )
  }

  const withPrices = prices.filter((p) => p.unitPriceCents != null && p.unitPriceCents > 0)
  const bestPrice =
    withPrices.length > 0 ? Math.min(...withPrices.map((p) => p.unitPriceCents!)) : null
  const worstPrice =
    withPrices.length > 0 ? Math.max(...withPrices.map((p) => p.unitPriceCents!)) : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-stone-400" />
            Vendor Prices: {ingredientName}
          </CardTitle>
          <Badge variant="default">
            {prices.length} vendor{prices.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        {bestPrice && worstPrice && worstPrice > bestPrice && (
          <p className="text-xs text-stone-500 mt-1">
            Potential savings: {formatMoney(worstPrice - bestPrice)} per unit by switching vendors
          </p>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-stone-800">
          {prices.map((vendor, idx) => {
            const isBest = vendor.unitPriceCents != null && vendor.unitPriceCents === bestPrice
            return (
              <div
                key={vendor.id}
                className={`px-6 py-4 flex items-center justify-between ${isBest ? 'bg-emerald-950/20' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-stone-100 truncate">
                      {vendor.vendorName}
                    </p>
                    {isBest && (
                      <Badge variant="success">
                        <Trophy className="h-3 w-3 mr-1" />
                        Best Price
                      </Badge>
                    )}
                    {vendor.isPreferred && !isBest && <Badge variant="info">Preferred</Badge>}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-stone-500">
                    {vendor.leadTimeDays != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {vendor.leadTimeDays} day{vendor.leadTimeDays !== 1 ? 's' : ''} lead
                      </span>
                    )}
                    {vendor.minOrderQty != null && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        Min: {vendor.minOrderQty} {vendor.minOrderUnit || ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right ml-4">
                  {vendor.unitPriceCents != null ? (
                    <>
                      <p
                        className={`text-lg font-bold ${isBest ? 'text-emerald-500' : 'text-stone-100'}`}
                      >
                        {formatMoney(vendor.unitPriceCents)}
                      </p>
                      {vendor.priceUnit && (
                        <p className="text-xs text-stone-500">per {vendor.priceUnit}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-stone-500">No price set</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
