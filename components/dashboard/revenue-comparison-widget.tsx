// Revenue This Month vs Last Month Widget
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from '@/components/ui/icons'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/currency'

interface Props {
  currentMonthRevenueCents: number
  previousMonthRevenueCents: number
  currentMonthProfitCents: number
  changePercent: number
  currentMonthName: string
  previousMonthName: string
}

export function RevenueComparisonWidget({
  currentMonthRevenueCents,
  previousMonthRevenueCents,
  currentMonthProfitCents,
  changePercent,
  currentMonthName,
  previousMonthName,
}: Props) {
  const isUp = changePercent >= 0
  const hasData = currentMonthRevenueCents > 0 || previousMonthRevenueCents > 0

  if (!hasData) {
    return (
      <Card className="p-5">
        <p className="text-sm text-stone-500">No revenue data yet this month.</p>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wide">
            {currentMonthName} Revenue
          </p>
          <p className="text-2xl font-bold text-stone-100 mt-1">
            {formatCurrency(currentMonthRevenueCents)}
          </p>
        </div>
        <div
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isUp ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
          }`}
        >
          {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {changePercent > 0 ? '+' : ''}
          {changePercent}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-stone-500">{previousMonthName}</p>
          <p className="font-medium text-stone-300">{formatCurrency(previousMonthRevenueCents)}</p>
        </div>
        <div>
          <p className="text-stone-500">Profit ({currentMonthName})</p>
          <p className="font-medium text-stone-300">{formatCurrency(currentMonthProfitCents)}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-stone-800">
        <Link
          href="/finance/reporting"
          className="text-xs text-brand-500 hover:text-brand-400 font-medium"
        >
          View full financials →
        </Link>
      </div>
    </Card>
  )
}
