import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { getExpenses } from '@/lib/expenses/actions'
import { getEvents } from '@/lib/events/actions'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { startOfYear, format } from 'date-fns'

export const metadata: Metadata = { title: 'Year-to-Date Summary - ChefFlow' }

export default async function YearToDateSummaryPage() {
  await requireChef()

  const currentYear = new Date().getFullYear()
  const yearStart = startOfYear(new Date()).toISOString().split('T')[0]

  const [summary, ytdEntries, ytdExpenses, events] = await Promise.all([
    getTenantFinancialSummary(),
    getLedgerEntries({ startDate: startOfYear(new Date()).toISOString() }),
    getExpenses({ start_date: yearStart }),
    getEvents(),
  ])

  // YTD revenue from ledger entries (non-refund)
  const ytdRevenue = ytdEntries
    .filter(e => !e.is_refund)
    .reduce((s, e) => s + e.amount_cents, 0)

  const ytdRefunds = ytdEntries
    .filter(e => e.is_refund)
    .reduce((s, e) => s + e.amount_cents, 0)

  const ytdNetRevenue = ytdRevenue - ytdRefunds
  const ytdTotalExpenses = ytdExpenses.reduce((s, e) => s + e.amount_cents, 0)
  const ytdProfit = ytdNetRevenue - ytdTotalExpenses

  // YTD events
  const ytdEvents = events.filter(e => new Date(e.event_date) >= startOfYear(new Date()))
  const completedYtd = ytdEvents.filter(e => e.status === 'completed').length
  const upcomingYtd = ytdEvents.filter(e => new Date(e.event_date) > new Date() && !['cancelled'].includes(e.status)).length

  // Tips from YTD entries
  const ytdTips = ytdEntries
    .filter(e => e.entry_type === 'tip')
    .reduce((s, e) => s + e.amount_cents, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-700">← Reporting</Link>
        <h1 className="text-3xl font-bold text-stone-900 mt-1">Year-to-Date Summary</h1>
        <p className="text-stone-500 mt-1">Financial overview for {currentYear} — Jan 1 through today ({format(new Date(), 'MMM d, yyyy')})</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-3 uppercase tracking-wide">Revenue</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-stone-600">Gross revenue</span>
              <span className="text-sm font-semibold text-green-700">{formatCurrency(ytdRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-600">Refunds</span>
              <span className="text-sm font-semibold text-red-600">−{formatCurrency(ytdRefunds)}</span>
            </div>
            {ytdTips > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-stone-600">Tips</span>
                <span className="text-sm font-semibold text-emerald-700">+{formatCurrency(ytdTips)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-stone-100">
              <span className="text-sm font-semibold text-stone-700">Net revenue</span>
              <span className="text-sm font-bold text-stone-900">{formatCurrency(ytdNetRevenue)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-3 uppercase tracking-wide">Expenses</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-stone-600">Total expenses</span>
              <span className="text-sm font-semibold text-red-600">{formatCurrency(ytdTotalExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-600">Expense entries</span>
              <span className="text-sm text-stone-700">{ytdExpenses.length}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-stone-100">
              <span className="text-sm font-semibold text-stone-700">Est. net profit</span>
              <span className={`text-sm font-bold ${ytdProfit >= 0 ? 'text-stone-900' : 'text-red-600'}`}>
                {formatCurrency(ytdProfit)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">{ytdEvents.length}</p>
          <p className="text-sm text-stone-500 mt-1">Events in {currentYear}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-600">{completedYtd}</p>
          <p className="text-sm text-stone-500 mt-1">Completed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-brand-600">{upcomingYtd}</p>
          <p className="text-sm text-stone-500 mt-1">Upcoming</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(ytdTips)}</p>
          <p className="text-sm text-stone-500 mt-1">Tips received</p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-stone-700 mb-3 uppercase tracking-wide">All-Time Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xl font-bold text-green-700">{formatCurrency(summary.totalRevenueCents)}</p>
            <p className="text-xs text-stone-500 mt-0.5">Gross revenue (lifetime)</p>
          </div>
          <div>
            <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalRefundsCents)}</p>
            <p className="text-xs text-stone-500 mt-0.5">Total refunds (lifetime)</p>
          </div>
          <div>
            <p className="text-xl font-bold text-stone-900">{formatCurrency(summary.netRevenueCents)}</p>
            <p className="text-xs text-stone-500 mt-0.5">Net revenue (lifetime)</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
