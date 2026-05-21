// Dashboard Financial Pulse - unified financial snapshot (MTD revenue, outstanding, profit margin)

import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'
import { formatCurrency } from '@/lib/utils/currency'
import { getMonthOverMonthRevenue } from '@/lib/dashboard/actions'
import { getUpcomingPaymentsDue } from '@/lib/dashboard/widget-actions'
import { getCurrentMonthExpenseSummary } from '@/lib/dashboard/actions'
import Link from 'next/link'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/FinancialPulse] ${label} failed:`, err)
    return fallback
  }
}

export async function FinancialPulse() {
  const [revenue, payments, expenses] = await Promise.all([
    safe('revenue', getMonthOverMonthRevenue, {
      currentMonthRevenueCents: 0,
      previousMonthRevenueCents: 0,
      currentMonthProfitCents: 0,
      changePercent: 0,
    }),
    safe('payments', () => getUpcomingPaymentsDue(50), []),
    safe('expenses', getCurrentMonthExpenseSummary, { totalCents: 0, businessCents: 0 }),
  ])

  const revenueCents = revenue.currentMonthRevenueCents
  const changePercent = revenue.changePercent
  const expenseCents = expenses.businessCents
  const outstandingCents = payments.reduce((sum, p) => sum + p.outstandingCents, 0)
  const invoiceCount = payments.length

  // Brand new account with no financial activity: hide entirely
  if (revenueCents === 0 && outstandingCents === 0 && expenseCents === 0) {
    return null
  }

  const netCents = revenueCents - expenseCents
  const marginPercent = revenueCents > 0 ? (netCents / revenueCents) * 100 : 0

  return (
    <WidgetCardShell widgetId="financial_pulse" title="Financial Pulse" size="md" href="/finance">
      <div className="space-y-3">
        {/* Row 1: MTD Revenue */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-500">MTD Revenue</p>
            <p className="text-xl font-bold text-stone-100">{formatCurrency(revenueCents)}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              changePercent > 0
                ? 'bg-emerald-950/60 text-emerald-400'
                : changePercent < 0
                  ? 'bg-red-950/60 text-red-400'
                  : 'bg-stone-800 text-stone-400'
            }`}
          >
            {changePercent > 0 ? '+' : ''}
            {changePercent.toFixed(1)}%
          </span>
        </div>

        {/* Row 2: Outstanding */}
        <div className="flex items-center justify-between gap-3 border-t border-stone-800 pt-2">
          <div className="min-w-0">
            <p className="text-xs text-stone-500">Outstanding</p>
            <p className="truncate text-sm font-semibold text-stone-200">
              {formatCurrency(outstandingCents)}
            </p>
          </div>
          <Link
            href="/finance/invoices"
            className={`shrink-0 text-xs font-medium ${
              invoiceCount > 0 ? 'text-amber-400 hover:text-amber-300' : 'text-stone-500'
            } transition-colors`}
          >
            {invoiceCount} {invoiceCount === 1 ? 'invoice' : 'invoices'}
          </Link>
        </div>

        {/* Row 3: Profit Margin */}
        <div className="flex items-center justify-between border-t border-stone-800 pt-2">
          <div>
            <p className="text-xs text-stone-500">Net (Revenue - Expenses)</p>
            <p
              className={`text-sm font-semibold ${
                netCents >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(Math.abs(netCents))}
              {netCents < 0 ? ' loss' : ''}
            </p>
          </div>
          <span
            className={`text-xs font-medium ${
              marginPercent >= 50
                ? 'text-emerald-400'
                : marginPercent >= 20
                  ? 'text-amber-400'
                  : marginPercent > 0
                    ? 'text-red-400'
                    : 'text-stone-500'
            }`}
          >
            {revenueCents > 0 ? `${marginPercent.toFixed(1)}% margin` : 'No revenue yet'}
          </span>
        </div>
      </div>
    </WidgetCardShell>
  )
}

// Skeleton for Suspense fallback
export function FinancialPulseSkeleton() {
  return (
    <div
      className="col-span-1 sm:col-span-2 rounded-2xl overflow-hidden animate-pulse"
      style={{
        border: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(120,113,108,0.06)',
      }}
    >
      <div className="px-4 pt-3.5 pb-1 flex items-center gap-2.5">
        <div className="w-4 h-4 loading-bone loading-bone-muted rounded" />
        <div className="h-3 w-28 loading-bone loading-bone-muted rounded" />
      </div>
      <div className="px-4 pb-4 pt-2 space-y-3">
        {/* Revenue row skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-3 w-16 loading-bone loading-bone-muted rounded" />
            <div className="h-7 w-24 loading-bone loading-bone-muted rounded" />
          </div>
          <div className="h-5 w-12 loading-bone loading-bone-muted rounded-full" />
        </div>
        {/* Outstanding row skeleton */}
        <div className="flex items-center justify-between border-t border-stone-800 pt-2">
          <div className="space-y-1.5">
            <div className="h-3 w-16 loading-bone loading-bone-muted rounded" />
            <div className="h-4 w-20 loading-bone loading-bone-muted rounded" />
          </div>
          <div className="h-3 w-14 loading-bone loading-bone-muted rounded" />
        </div>
        {/* Net row skeleton */}
        <div className="flex items-center justify-between border-t border-stone-800 pt-2">
          <div className="space-y-1.5">
            <div className="h-3 w-28 loading-bone loading-bone-muted rounded" />
            <div className="h-4 w-16 loading-bone loading-bone-muted rounded" />
          </div>
          <div className="h-3 w-20 loading-bone loading-bone-muted rounded" />
        </div>
      </div>
    </div>
  )
}
