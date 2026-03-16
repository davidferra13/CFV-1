import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { exportRevenueByMonthCSV } from '@/lib/finance/export-actions'
import { CSVDownloadButton } from '@/components/exports/csv-download-button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { format, subMonths, startOfMonth } from 'date-fns'

export const metadata: Metadata = { title: 'Revenue by Month - ChefFlow' }

export default async function RevenueByMonthPage() {
  await requireChef()

  const now = new Date()
  const startDate = subMonths(startOfMonth(now), 11).toISOString()

  const entries = await getLedgerEntries({ startDate })

  // Build 12 monthly buckets
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i)
    return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy'), revenue: 0, refunds: 0 }
  })

  for (const entry of entries) {
    const key = format(new Date(entry.created_at), 'yyyy-MM')
    const bucket = months.find((m) => m.key === key)
    if (!bucket) continue
    if (entry.is_refund) {
      bucket.refunds += entry.amount_cents
    } else {
      bucket.revenue += entry.amount_cents
    }
  }

  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0)
  const totalRefunds = months.reduce((s, m) => s + m.refunds, 0)
  const bestMonth = months.reduce(
    (best, m) => (m.revenue - m.refunds > best.revenue - best.refunds ? m : best),
    months[0]
  )

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          ← Reporting
        </Link>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Revenue by Month</h1>
            <p className="text-stone-500 mt-1">12-month rolling revenue trend</p>
          </div>
          <CSVDownloadButton action={exportRevenueByMonthCSV} label="Export CSV" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">12-month gross revenue</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">
            {formatCurrency(totalRevenue - totalRefunds)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Net revenue</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-semibold text-stone-300">{bestMonth.label}</p>
          <p className="text-xl font-bold text-stone-100 mt-0.5">
            {formatCurrency(bestMonth.revenue - bestMonth.refunds)}
          </p>
          <p className="text-sm text-stone-500 mt-0.5">Best month (net)</p>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Gross Revenue</TableHead>
              <TableHead>Refunds</TableHead>
              <TableHead>Net Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...months].reverse().map((month) => (
              <TableRow key={month.key}>
                <TableCell className="font-medium text-stone-100">{month.label}</TableCell>
                <TableCell className="text-green-700 font-semibold text-sm">
                  {formatCurrency(month.revenue)}
                </TableCell>
                <TableCell className="text-red-600 text-sm">
                  {month.refunds > 0 ? `−${formatCurrency(month.refunds)}` : '-'}
                </TableCell>
                <TableCell
                  className={`font-semibold text-sm ${month.revenue - month.refunds > 0 ? 'text-stone-100' : 'text-stone-400'}`}
                >
                  {formatCurrency(month.revenue - month.refunds)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
