// Admin Financials — Platform GMV, ledger entries, and payment issues

import { requireAdmin } from '@/lib/auth/admin'
import { getPlatformFinancialOverview, getPlatformLedgerEntries } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import { DollarSign } from 'lucide-react'
import { ProfitAndLossReport } from '@/components/finance/ProfitAndLossReport'
import {
  getDefaultProfitLossWindow,
  getProfitAndLossReport,
} from '@/lib/finance/profit-loss-report-actions'

function formatCents(cents: number): string {
  return (
    '$' +
    (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

const ENTRY_TYPE_COLORS: Record<string, string> = {
  payment: 'bg-green-900 text-green-700',
  deposit: 'bg-blue-900 text-blue-700',
  expense: 'bg-red-900 text-red-600',
  tip: 'bg-yellow-900 text-yellow-700',
  refund: 'bg-orange-900 text-orange-700',
}

export default async function AdminFinancialsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const window = await getDefaultProfitLossWindow()
  const [overview, ledger, pnl] = await Promise.allSettled([
    getPlatformFinancialOverview(),
    getPlatformLedgerEntries(200),
    getProfitAndLossReport(window.startDate, window.endDate),
  ])

  const fin = overview.status === 'fulfilled' ? overview.value : null
  const entries = ledger.status === 'fulfilled' ? ledger.value : []
  const pnlData =
    pnl.status === 'fulfilled'
      ? pnl.value
      : {
          startDate: window.startDate,
          endDate: window.endDate,
          revenue: {
            billingRevenueCents: 0,
            commerceRevenueCents: 0,
            salesRevenueCents: 0,
            totalRevenueCents: 0,
          },
          cogs: { purchaseOrdersCents: 0 },
          operatingExpenses: {
            expenseTableCents: 0,
            laborFromPayrollCents: 0,
            totalOperatingExpensesCents: 0,
          },
          totals: {
            grossProfitCents: 0,
            netProfitLossCents: 0,
            profitMarginPercent: 0,
          },
        }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-950 rounded-lg">
          <DollarSign size={18} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financials</h1>
          <p className="text-sm text-stone-500">Platform-wide revenue and expense overview</p>
        </div>
      </div>

      {fin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-stone-900 rounded-xl border border-slate-200 px-4 py-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">
              GMV All-Time
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCents(fin.totalGMV)}</p>
          </div>
          <div className="bg-stone-900 rounded-xl border border-slate-200 px-4 py-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">
              GMV This Month
            </p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCents(fin.gmvThisMonth)}
            </p>
          </div>
          <div className="bg-stone-900 rounded-xl border border-slate-200 px-4 py-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">
              Expenses All-Time
            </p>
            <p className="text-2xl font-bold text-red-500 mt-1">{formatCents(fin.totalExpenses)}</p>
          </div>
          <div className="bg-stone-900 rounded-xl border border-slate-200 px-4 py-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">
              Expenses This Month
            </p>
            <p className="text-2xl font-bold text-red-400 mt-1">
              {formatCents(fin.expensesThisMonth)}
            </p>
          </div>
        </div>
      )}

      <ProfitAndLossReport initialData={pnlData} />

      {/* Ledger entries */}
      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-stone-300">Ledger Entries (last 200)</h2>
        </div>
        {entries.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No ledger entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">
                    Description
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500">
                    Amount
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">
                    Tenant
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ENTRY_TYPE_COLORS[entry.entry_type] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-stone-400 text-xs max-w-[200px] truncate">
                      {entry.description ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                      {formatCents(entry.amount_cents ?? 0)}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-400">
                      {entry.tenant_id?.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
