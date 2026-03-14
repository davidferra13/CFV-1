import { getCashFlowProjection } from '@/lib/intelligence/cashflow-projections'
import { getEventProfitability } from '@/lib/intelligence/event-profitability'
import { getVendorPriceIntelligence } from '@/lib/intelligence/vendor-price-tracking'
import { formatCurrency } from '@/lib/utils/currency'

export async function FinanceHealthBar() {
  const [cashflow, profitability, vendors] = await Promise.all([
    getCashFlowProjection().catch(() => null),
    getEventProfitability().catch(() => null),
    getVendorPriceIntelligence().catch(() => null),
  ])

  if (!cashflow && !profitability && !vendors) return null

  const trendColor =
    cashflow?.trend === 'improving'
      ? 'text-emerald-400'
      : cashflow?.trend === 'declining'
        ? 'text-red-400'
        : 'text-stone-100'

  const trendLabel =
    cashflow?.trend === 'improving'
      ? '↑ Improving'
      : cashflow?.trend === 'declining'
        ? '↓ Declining'
        : '→ Stable'

  const vendorAlertCount = vendors?.alerts?.length ?? 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Cash Flow Trend */}
      {cashflow && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Cash Flow Trend</p>
          <p className={`text-lg font-bold ${trendColor}`}>{trendLabel}</p>
          <p className="text-xs text-stone-500">
            Avg {formatCurrency(cashflow.avgMonthlyNetCents)}/mo net
          </p>
        </div>
      )}

      {/* Gross Margin */}
      {cashflow && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Gross Margin</p>
          <p
            className={`text-lg font-bold ${
              cashflow.grossMarginPercent >= 40
                ? 'text-emerald-400'
                : cashflow.grossMarginPercent >= 20
                  ? 'text-amber-400'
                  : 'text-red-400'
            }`}
          >
            {cashflow.grossMarginPercent}%
          </p>
          <p className="text-xs text-stone-500">Best: {cashflow.bestMonth.month}</p>
        </div>
      )}

      {/* Avg Profit/Event */}
      {profitability && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Avg Margin/Event</p>
          <p
            className={`text-lg font-bold ${
              profitability.avgMarginPercent >= 40
                ? 'text-emerald-400'
                : profitability.avgMarginPercent >= 20
                  ? 'text-amber-400'
                  : 'text-red-400'
            }`}
          >
            {profitability.avgMarginPercent}%
          </p>
          {profitability.mostProfitableOccasion && (
            <p className="text-xs text-stone-500">Best: {profitability.mostProfitableOccasion}</p>
          )}
        </div>
      )}

      {/* Vendor Alerts */}
      {vendors && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Vendor Alerts</p>
          <p
            className={`text-lg font-bold ${
              vendorAlertCount > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {vendorAlertCount > 0 ? vendorAlertCount : 'None'}
          </p>
          {vendorAlertCount > 0 && (
            <p className="text-xs text-amber-400/70">{vendors.alerts[0].title}</p>
          )}
        </div>
      )}
    </div>
  )
}
