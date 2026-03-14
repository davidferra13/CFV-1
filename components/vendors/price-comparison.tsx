'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ComparisonItem {
  id: string
  vendor_item_name: string
  unit_price_cents: number
  unit_size: number | string | null
  unit_measure: string | null
  ingredient_id: string | null
  vendors: { name: string; status: string } | null
}

interface PriceComparisonProps {
  data: { ingredientId: string; items: ComparisonItem[] }[]
}

export function PriceComparison({ data }: PriceComparisonProps) {
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

  // Collect all unique vendor names
  const vendorNames = new Set<string>()
  for (const group of data) {
    for (const item of group.items) {
      if (item.vendors?.name) {
        vendorNames.add(item.vendors.name)
      }
    }
  }
  const vendors = Array.from(vendorNames).sort()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Price Comparison by Ingredient</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-left text-stone-400">
                <th className="pb-2 pr-4">Ingredient</th>
                {vendors.map((v) => (
                  <th key={v} className="pb-2 pr-4">
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((group) => {
                // Find cheapest price in this group
                const cheapestCents = Math.min(...group.items.map((i) => i.unit_price_cents))

                // Build a map of vendor name -> item for this ingredient
                const vendorPriceMap = new Map<string, ComparisonItem>()
                for (const item of group.items) {
                  if (item.vendors?.name) {
                    vendorPriceMap.set(item.vendors.name, item)
                  }
                }

                // Use the first item's name as the ingredient display name
                const ingredientName = group.items[0]?.vendor_item_name ?? 'Unknown'

                return (
                  <tr key={group.ingredientId} className="border-b border-stone-800">
                    <td className="py-2 pr-4 text-stone-200 font-medium">{ingredientName}</td>
                    {vendors.map((v) => {
                      const item = vendorPriceMap.get(v)
                      if (!item) {
                        return (
                          <td key={v} className="py-2 pr-4 text-stone-600">
                            —
                          </td>
                        )
                      }
                      const isCheapest = item.unit_price_cents === cheapestCents
                      return (
                        <td
                          key={v}
                          className={`py-2 pr-4 ${
                            isCheapest ? 'text-emerald-400 font-semibold' : 'text-stone-300'
                          }`}
                        >
                          ${(item.unit_price_cents / 100).toFixed(2)}
                          {item.unit_size && item.unit_measure && (
                            <span className="text-stone-500 text-xs ml-1">
                              /{item.unit_size}
                              {item.unit_measure}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
