import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { VendorSavingsOpportunity } from '@/lib/reports/vendor-comparison'

export function SavingsSummary({
  opportunities,
  totalSavingsCents,
}: {
  opportunities: VendorSavingsOpportunity[]
  totalSavingsCents: number
}) {
  if (opportunities.length === 0) {
    return null
  }

  // Group savings by suggested vendor
  const byVendor = new Map<string, { count: number; totalCents: number }>()
  for (const opp of opportunities) {
    const existing = byVendor.get(opp.suggestedVendor) || { count: 0, totalCents: 0 }
    existing.count++
    existing.totalCents += opp.savingsCents
    byVendor.set(opp.suggestedVendor, existing)
  }

  const vendorSavings = Array.from(byVendor.entries())
    .map(([vendor, data]) => ({ vendor, ...data }))
    .sort((a, b) => b.totalCents - a.totalCents)

  return (
    <Card className="p-5 border-l-4 border-l-green-500">
      <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-1">
        Potential Savings
      </h2>
      <p className="text-3xl font-bold text-green-500 mb-1">
        {formatCurrency(totalSavingsCents)}
      </p>
      <p className="text-xs text-stone-500 mb-4">
        if you switch to the cheapest vendor for each item
      </p>

      <div className="space-y-2">
        {vendorSavings.map((vs) => (
          <div key={vs.vendor} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-300">
                Switch to <span className="font-semibold">{vs.vendor}</span> for{' '}
                {vs.count} item{vs.count !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-sm font-semibold text-green-400">
              Save {formatCurrency(vs.totalCents)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
