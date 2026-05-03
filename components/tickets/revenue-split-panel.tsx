'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { getRevenueSplit, type RevenueSplitConfig } from '@/lib/tickets/revenue-split-actions'

type Props = {
  eventId: string
}

export function RevenueSplitPanel({ eventId }: Props) {
  const [data, setData] = useState<RevenueSplitConfig | null>(null)

  useEffect(() => {
    getRevenueSplit(eventId)
      .then(setData)
      .catch(() => {})
  }, [eventId])

  if (!data || data.splits.length <= 1) return null
  if (data.totalRevenueCents === 0) return null

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-white mb-3">Revenue Split</h3>

      {/* Summary bar */}
      <div className="flex items-center gap-1 mb-4 h-3 rounded-full overflow-hidden bg-stone-700">
        {data.splits.map((split, idx) => (
          <div
            key={split.chefId}
            className={`h-full transition-all ${idx === 0 ? 'bg-emerald-500' : 'bg-purple-500'}`}
            style={{ width: `${split.percentage}%` }}
          />
        ))}
      </div>

      {/* Split details */}
      <div className="space-y-2">
        {data.splits.map((split, idx) => (
          <div
            key={split.chefId}
            className="flex items-center justify-between rounded-lg border border-stone-700/50 bg-stone-800/20 p-3"
          >
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${idx === 0 ? 'bg-emerald-500' : 'bg-purple-500'}`}
              />
              <div>
                <span className="text-sm font-medium text-white">{split.chefName}</span>
                <span className="text-xs text-stone-400 ml-2">
                  {split.role === 'primary' ? 'Host' : 'Co-Host'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">
                {formatCurrency(split.amountCents)}
              </p>
              <p className="text-xs text-stone-400">{split.percentage}%</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fee breakdown */}
      <div className="mt-3 pt-3 border-t border-stone-700/50 space-y-1">
        <div className="flex justify-between text-xs text-stone-400">
          <span>Gross revenue</span>
          <span>{formatCurrency(data.totalRevenueCents)}</span>
        </div>
        <div className="flex justify-between text-xs text-stone-400">
          <span>Processing fees (est.)</span>
          <span>-{formatCurrency(data.stripeFeesCents)}</span>
        </div>
        <div className="flex justify-between text-xs text-stone-300 font-medium">
          <span>Net to split</span>
          <span>{formatCurrency(data.netRevenueCents)}</span>
        </div>
      </div>
    </Card>
  )
}
