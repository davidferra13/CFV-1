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
            <div className="text-center py-8 px-6">
              <svg
                className="h-8 w-8 mx-auto text-stone-600 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                />
              </svg>
              <p className="text-sm text-stone-400 font-medium">No remittances recorded yet</p>
              <p className="text-xs text-stone-600 mt-1">
                Track sales tax payments to your state here
              </p>
            </div>
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
