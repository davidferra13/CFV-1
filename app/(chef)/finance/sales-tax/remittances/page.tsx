import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getSalesTaxRemittances, getSalesTaxSummary } from '@/lib/finance/sales-tax-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Sales Tax Remittances' }

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export default async function SalesTaxRemittancesPage() {
  await requireChef()

  const [remittances, summary] = await Promise.all([getSalesTaxRemittances(), getSalesTaxSummary()])

  const totalRemitted = remittances.reduce((s, r) => s + r.amountRemittedCents, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/sales-tax" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Sales Tax
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Remittance History</h1>
        <p className="text-stone-500 mt-1">
          Complete record of all sales tax remittances made to state authorities.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-stone-500 uppercase font-medium">Total Collected</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              {formatCurrency(summary.collectedCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-stone-500 uppercase font-medium">Total Remitted</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {formatCurrency(totalRemitted)}
            </p>
            <p className="text-xs text-stone-400 mt-1">{remittances.length} filings</p>
          </CardContent>
        </Card>
        <Card className={summary.outstandingCents > 0 ? 'border-amber-200 bg-amber-950' : ''}>
          <CardContent className="pt-4">
            <p className="text-xs text-stone-500 uppercase font-medium">Outstanding</p>
            <p
              className={`text-2xl font-bold mt-1 ${summary.outstandingCents > 0 ? 'text-amber-700' : 'text-stone-400'}`}
            >
              {formatCurrency(summary.outstandingCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Remittances</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {remittances.length === 0 ? (
            <p className="text-stone-400 text-sm px-6 py-8">No remittances recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Period
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Date Range
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Date Filed
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Confirmation #
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {remittances.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-800">
                    <td className="px-6 py-3 font-medium text-stone-100">{r.period}</td>
                    <td className="px-6 py-3 text-stone-400">
                      {r.periodStart} → {r.periodEnd}
                    </td>
                    <td className="px-6 py-3 text-stone-400">{r.remittedAt}</td>
                    <td className="px-6 py-3 text-right font-semibold text-stone-100">
                      {formatCurrency(r.amountRemittedCents)}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-stone-500">
                      {r.confirmationNumber || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-stone-700 bg-stone-800">
                  <td colSpan={3} className="px-6 py-3 font-bold text-stone-300">
                    Total
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-stone-100">
                    {formatCurrency(totalRemitted)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
