import { getCashFlowProjection } from '@/lib/intelligence/cashflow-projections'
import { getEventProfitability } from '@/lib/intelligence/event-profitability'
import { getVendorPriceIntelligence } from '@/lib/intelligence/vendor-price-tracking'
import { formatCurrency } from '@/lib/utils/currency'

type FinanceSignal<T> =
  | {
      status: 'available'
      data: T
    }
  | {
      status: 'empty'
      data: null
    }
  | {
      status: 'unavailable'
      data: null
      label: string
    }

type UnavailableFinanceSignal = Extract<FinanceSignal<unknown>, { status: 'unavailable' }>

async function loadFinanceSignal<T>(
  label: string,
  loader: () => Promise<T | null>
): Promise<FinanceSignal<T>> {
  try {
    const data = await loader()
    return data === null ? { status: 'empty', data: null } : { status: 'available', data }
  } catch (error) {
    console.warn(`[finance-intelligence] ${label} unavailable`, error)
    return { status: 'unavailable', data: null, label }
  }
}

export async function FinanceHealthBar() {
  const [cashflowResult, profitabilityResult, vendorsResult] = await Promise.all([
    loadFinanceSignal('Cash flow', getCashFlowProjection),
    loadFinanceSignal('Event profitability', getEventProfitability),
    loadFinanceSignal('Vendor price intelligence', getVendorPriceIntelligence),
  ])

  const cashflow = cashflowResult.status === 'available' ? cashflowResult.data : null
  const profitability = profitabilityResult.status === 'available' ? profitabilityResult.data : null
  const vendors = vendorsResult.status === 'available' ? vendorsResult.data : null
  const unavailableSignals = [cashflowResult, profitabilityResult, vendorsResult].filter(
    (result): result is UnavailableFinanceSignal => result.status === 'unavailable'
  )

  if (!cashflow && !profitability && !vendors && unavailableSignals.length === 0) return null

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
      {unavailableSignals.length > 0 && (
        <div className="col-span-2 sm:col-span-4 rounded-lg border border-amber-700/60 bg-amber-950/60 px-3 py-2">
          <p className="text-xs font-medium text-amber-200">Finance intelligence is degraded.</p>
          <p className="text-xs text-amber-300/80">
            Unavailable signals: {unavailableSignals.map((signal) => signal.label).join(', ')}. Any
            loaded figures below remain available.
          </p>
        </div>
      )}

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
