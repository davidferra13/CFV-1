// Price Comparison Page
// Compare ingredient prices across all vendors side-by-side.
// Lowest price is highlighted and best-value guidance is generated automatically.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPriceComparisonAll } from '@/lib/vendors/vendor-item-actions'
import { PriceComparison } from '@/components/vendors/price-comparison'
import { VendorPriceInsights } from '@/components/vendors/vendor-price-insights'
import { getVendorPriceInsights } from '@/lib/vendors/price-insights-actions'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Price Comparison - ChefFlow' }

export default async function PriceComparisonPage() {
  await requireChef()
  const [data, insights] = await Promise.all([
    getPriceComparisonAll(),
    getVendorPriceInsights({
      limit: 20,
      trendItems: 10,
      pointsPerTrend: 8,
      lookbackDays: 180,
    }),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/vendors" className="text-sm text-stone-500 hover:text-stone-300">
        &larr; Back to Vendor Directory
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Price Comparison</h1>
          <p className="mt-1 text-sm text-stone-500">
            Compare prices across vendors for the same ingredients. Best price is highlighted
            automatically, with best-value guidance generated when enough pricing data is available.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/vendors">
            <Button variant="primary" size="sm">
              + Add Vendor Items
            </Button>
          </Link>
          <Link href="/food-cost">
            <Button variant="secondary" size="sm">
              Food Cost Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <PriceComparison data={data as any} />
      <VendorPriceInsights
        alerts={insights.alerts}
        trends={insights.trends}
        thresholdPercent={insights.thresholdPercent}
      />

      {data.length === 0 && (
        <div className="text-center py-12">
          <p className="text-stone-400">No vendor items mapped yet.</p>
          <p className="text-sm text-stone-500 mt-2">
            Go to a vendor&apos;s profile and add their items to start comparing prices.
          </p>
          <Link href="/vendors" className="mt-4 inline-block">
            <Button variant="secondary">Go to Vendors</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
