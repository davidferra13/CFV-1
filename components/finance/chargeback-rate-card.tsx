'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { ChargebackRate } from '@/lib/finance/chargeback-rate'

interface ChargebackRateCardProps {
  rate: ChargebackRate | null
}

export function ChargebackRateCard({ rate }: ChargebackRateCardProps) {
  if (!rate) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-stone-300">No payment data available.</p>
        </CardContent>
      </Card>
    )
  }

  const rateConfig = {
    green: {
      bg: 'bg-emerald-950 border-emerald-200',
      labelColor: 'text-emerald-200',
      dot: 'bg-emerald-500',
    },
    amber: {
      bg: 'bg-amber-950 border-amber-200',
      labelColor: 'text-amber-200',
      dot: 'bg-amber-500',
    },
    red: {
      bg: 'bg-red-950 border-red-200',
      labelColor: 'text-red-200',
      dot: 'bg-red-500',
    },
  }

  const config = rateConfig[rate.riskLevel]
  const ratePercent = (rate.rate * 100).toFixed(2)

  return (
    <div className={`rounded-xl border p-4 ${config.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
        <h4 className={`text-sm font-semibold ${config.labelColor}`}>
          Chargeback Rate: {ratePercent}%
        </h4>
      </div>

      <div className="space-y-0.5 text-xs text-stone-600">
        <p>
          {rate.disputeCount} dispute{rate.disputeCount !== 1 ? 's' : ''} out of{' '}
          {rate.totalTransactions} transactions (last 12 months)
        </p>
        <p className="text-stone-500 italic">Industry safe zone is under 0.5%</p>
      </div>

      {rate.riskLevel === 'amber' && (
        <p className="text-xs text-amber-200 mt-2 font-medium">
          Approaching the danger threshold. Review disputed transactions.
        </p>
      )}
      {rate.riskLevel === 'red' && (
        <p className="text-xs text-red-200 mt-2 font-medium">
          Chargeback rate exceeds safe zone. Payment processors may flag your account.
        </p>
      )}
    </div>
  )
}
