import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { TaxPrepIncomeSource } from '@/lib/reports/tax-prep'

export function IncomeSummary({
  totalIncomeCents,
  incomeSources,
}: {
  totalIncomeCents: number
  incomeSources: TaxPrepIncomeSource[]
}) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
        Income Summary
      </h2>
      <div className="mb-4">
        <p className="text-3xl font-bold text-green-500">{formatCurrency(totalIncomeCents)}</p>
        <p className="text-sm text-stone-500 mt-1">Total gross income</p>
      </div>
      {incomeSources.length > 0 ? (
        <div className="space-y-3">
          {incomeSources.map((source) => (
            <div key={source.source} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-300">{source.source}</p>
                <p className="text-xs text-stone-500">{source.count} transactions</p>
              </div>
              <p className="text-sm font-semibold text-stone-100">
                {formatCurrency(source.totalCents)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-500">No income recorded for this year</p>
      )}
    </Card>
  )
}
