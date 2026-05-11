import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { PriceTrendArrow } from './price-trend-arrow'
import type { IngredientComparison } from '@/lib/reports/vendor-comparison'

export function VendorMatrixTable({
  comparisons,
  vendorNames,
}: {
  comparisons: IngredientComparison[]
  vendorNames: string[]
}) {
  if (comparisons.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
          Price Comparison Matrix
        </h2>
        <p className="text-sm text-stone-500">
          No ingredient-vendor price data available. Add vendor items with ingredient links
          to see comparisons.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
        Price Comparison Matrix
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700">
              <th className="text-left py-2 pr-4 text-stone-400 font-medium">Ingredient</th>
              {vendorNames.map((name) => (
                <th key={name} className="text-right py-2 px-3 text-stone-400 font-medium whitespace-nowrap">
                  {name}
                </th>
              ))}
              <th className="text-right py-2 px-3 text-stone-400 font-medium">Best Price</th>
              <th className="text-center py-2 pl-3 text-stone-400 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((comp) => {
              // Build a map from vendor name to price for quick lookup
              const priceByVendor = new Map<string, { priceCents: number; isCheapest: boolean; unit: string }>()
              for (const vp of comp.vendorPrices) {
                priceByVendor.set(vp.vendorName, {
                  priceCents: vp.priceCents,
                  isCheapest: vp.isCheapest,
                  unit: vp.unit,
                })
              }

              return (
                <tr key={comp.ingredientId} className="border-b border-stone-800 hover:bg-stone-800/50">
                  <td className="py-2 pr-4 text-stone-200 font-medium capitalize">
                    {comp.ingredientName}
                  </td>
                  {vendorNames.map((vendorName) => {
                    const data = priceByVendor.get(vendorName)
                    if (!data || data.priceCents === 0) {
                      return (
                        <td key={vendorName} className="text-right py-2 px-3 text-stone-600">
                          -
                        </td>
                      )
                    }
                    return (
                      <td
                        key={vendorName}
                        className={`text-right py-2 px-3 ${
                          data.isCheapest
                            ? 'text-green-400 font-semibold bg-green-900/20'
                            : 'text-stone-300'
                        }`}
                      >
                        {formatCurrency(data.priceCents)}
                        <span className="text-xs text-stone-500 ml-1">/{data.unit}</span>
                      </td>
                    )
                  })}
                  <td className="text-right py-2 px-3 text-green-400 font-semibold whitespace-nowrap">
                    {comp.bestPriceCents > 0 ? formatCurrency(comp.bestPriceCents) : '-'}
                    {comp.bestVendorName && (
                      <span className="block text-xs text-stone-500 font-normal">
                        {comp.bestVendorName}
                      </span>
                    )}
                  </td>
                  <td className="text-center py-2 pl-3">
                    <PriceTrendArrow trend={comp.trend} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
