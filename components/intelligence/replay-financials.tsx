'use client'

import type { EventReplayFinancials } from '@/lib/intelligence/event-replay'
import { TrendUp, TrendDown, CurrencyDollar, Users } from '@/components/ui/icons'

export function ReplayFinancials({ data }: { data: EventReplayFinancials }) {
  const marginColor =
    data.marginPercent >= 50
      ? 'text-emerald-400'
      : data.marginPercent >= 20
        ? 'text-amber-400'
        : 'text-red-400'

  const marginBg =
    data.marginPercent >= 50
      ? 'bg-emerald-950/30 border-emerald-800/40'
      : data.marginPercent >= 20
        ? 'bg-amber-950/30 border-amber-800/40'
        : 'bg-red-950/30 border-red-800/40'

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
      <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-4">
        Financial Summary
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <FinancialStat
          label="Quoted"
          value={formatCents(data.quotedCents)}
          icon={<CurrencyDollar className="h-4 w-4 text-stone-500" />}
        />
        <FinancialStat
          label="Collected"
          value={formatCents(data.paidCents)}
          icon={<TrendUp className="h-4 w-4 text-emerald-500" />}
        />
        <FinancialStat
          label="Expenses"
          value={formatCents(data.expensesCents)}
          icon={<TrendDown className="h-4 w-4 text-red-500" />}
        />
        <FinancialStat
          label="Profit"
          value={formatCents(data.profitCents)}
          valueColor={data.profitCents >= 0 ? 'text-emerald-400' : 'text-red-400'}
          icon={<CurrencyDollar className="h-4 w-4 text-stone-500" />}
        />
      </div>

      <div className="flex items-center gap-4 pt-3 border-t border-stone-800">
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${marginBg}`}>
          <span className={`text-sm font-bold ${marginColor}`}>{data.marginPercent}%</span>
          <span className="text-xs text-stone-500">margin</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <Users className="h-3.5 w-3.5" />
          <span>{formatCents(data.perGuestRevenueCents)}/guest revenue</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <CurrencyDollar className="h-3.5 w-3.5" />
          <span>{formatCents(data.perGuestProfitCents)}/guest profit</span>
        </div>
      </div>
    </div>
  )
}

function FinancialStat({
  label,
  value,
  icon,
  valueColor = 'text-stone-200',
}: {
  label: string
  value: string
  icon: React.ReactNode
  valueColor?: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-stone-500">{label}</span>
      </div>
      <span className={`text-lg font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}

function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  const formatted = `$${(abs / 100).toFixed(2)}`
  return cents < 0 ? `-${formatted}` : formatted
}
