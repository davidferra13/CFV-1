import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Reporting - ChefFlow' }

const REPORTS = [
  { href: '/finance/reporting/year-to-date-summary', label: 'Year-to-Date Summary', icon: '📊', description: 'Revenue, expenses, and profit for the current year' },
  { href: '/finance/reporting/revenue-by-month', label: 'Revenue by Month', icon: '📅', description: '12-month rolling revenue trend' },
  { href: '/finance/reporting/revenue-by-event', label: 'Revenue by Event', icon: '🍽️', description: 'All events ranked by invoice value' },
  { href: '/finance/reporting/revenue-by-client', label: 'Revenue by Client', icon: '👤', description: 'Lifetime value and revenue per client' },
  { href: '/finance/reporting/profit-by-event', label: 'Profit by Event', icon: '💰', description: 'Event revenue minus direct expenses' },
  { href: '/finance/reporting/expense-by-category', label: 'Expense by Category', icon: '📂', description: 'Spend breakdown across all expense categories' },
  { href: '/finance/reporting/tax-summary', label: 'Tax Summary', icon: '🧾', description: 'Business expense totals and income summary for tax prep' },
  { href: '/finance/reporting/profit-loss', label: 'Profit & Loss Statement', icon: '📈', description: 'Full P&L with revenue, expenses, and net profit' },
  { href: '/finance/year-end', label: 'Year-End Summary', icon: '🎯', description: 'Complete annual summary for tax preparation' },
]

export default async function ReportingPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-700">← Finance</Link>
        <h1 className="text-3xl font-bold text-stone-900 mt-1">Reporting</h1>
        <p className="text-stone-500 mt-1">Financial reports and summaries — export-ready insights for your business</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {REPORTS.map(report => (
          <Link key={report.href} href={report.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{report.icon}</span>
                <h2 className="font-semibold text-stone-900">{report.label}</h2>
              </div>
              <p className="text-sm text-stone-500">{report.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
