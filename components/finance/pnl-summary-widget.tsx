'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { generatePnL, type PnLStatement } from '@/lib/finance/pnl-actions'

type Props = {
  initialData?: {
    revenueCents: number
    cogsCents: number
    netIncomeCents: number
    netMarginPercent: number
    prevNetIncomeCents: number
  }
}

export function PnLSummaryWidget({ initialData }: Props) {
  const [data, setData] = useState(initialData || null)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (data) return
    startTransition(async () => {
      try {
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        const [current, previous] = await Promise.all([
          generatePnL('monthly', currentYear, currentMonth),
          generatePnL(
            'monthly',
            currentMonth === 1 ? currentYear - 1 : currentYear,
            currentMonth === 1 ? 12 : currentMonth - 1
          ),
        ])

        setData({
          revenueCents: current.revenue.totalCents,
          cogsCents: current.cogs.totalCents,
          netIncomeCents: current.netIncomeCents,
          netMarginPercent: current.netMarginPercent,
          prevNetIncomeCents: previous.netIncomeCents,
        })
      } catch {
        setError(true)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">P&amp;L Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">Could not load P&amp;L data</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">P&amp;L Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-stone-800 rounded w-24" />
            <div className="h-4 bg-stone-800 rounded w-32" />
            <div className="h-4 bg-stone-800 rounded w-20" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const netChange = data.netIncomeCents - data.prevNetIncomeCents
  const changeIsPositive = netChange > 0
  const changePercent =
    data.prevNetIncomeCents !== 0
      ? Math.round((netChange / Math.abs(data.prevNetIncomeCents)) * 1000) / 10
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">P&amp;L Summary (This Month)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-stone-500">Revenue</p>
            <p className="text-lg font-semibold text-emerald-500">
              {formatCurrency(data.revenueCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">COGS</p>
            <p className="text-lg font-semibold text-red-500">{formatCurrency(data.cogsCents)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Net Income</p>
            <p
              className={`text-lg font-semibold ${
                data.netIncomeCents >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(data.netIncomeCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Net Margin</p>
            <p
              className={`text-lg font-semibold ${
                data.netMarginPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {data.netMarginPercent}%
            </p>
          </div>
        </div>

        {/* Month-over-month change */}
        {netChange !== 0 && (
          <div className="mt-3 pt-3 border-t border-stone-800">
            <p className="text-xs text-stone-500">vs. Last Month</p>
            <p
              className={`text-sm font-medium ${
                changeIsPositive ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {changeIsPositive ? '\u2191' : '\u2193'} {changeIsPositive ? '+' : ''}
              {formatCurrency(netChange)}
              {changePercent !== 0 && ` (${changeIsPositive ? '+' : ''}${changePercent}%)`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
