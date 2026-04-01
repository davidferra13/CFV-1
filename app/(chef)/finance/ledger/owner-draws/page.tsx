// Owner Draws Page
// Records and reviews equity draws from the business.
// Draws are excluded from revenue, expenses, and net profit.
// They appear in the CPA export detail as equity movements only.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getOwnerDraws } from '@/lib/finance/owner-draw-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Card } from '@/components/ui/card'
import { OwnerDrawsClient } from './owner-draws-client'

export const metadata: Metadata = { title: 'Owner Draws' }

export default async function OwnerDrawsPage({
  searchParams,
}: {
  searchParams: { year?: string }
}) {
  await requireChef()

  const currentYear = new Date().getFullYear()
  const selectedYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear
  const validYear = isNaN(selectedYear) ? currentYear : selectedYear

  const draws = await getOwnerDraws(validYear)

  const totalCents = draws.reduce((s, d) => s + d.amountCents, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/ledger" className="text-sm text-stone-500 hover:text-stone-300">
          Back to Ledger
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Owner Draws</h1>
            <p className="text-stone-500 mt-1">
              Record equity draws from your business. These are excluded from profit and loss.
            </p>
          </div>
          <select
            defaultValue={validYear}
            onChange={undefined}
            className="text-sm border border-stone-600 rounded-md px-3 py-2 text-stone-300 bg-stone-900"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{draws.length}</p>
          <p className="text-sm text-stone-500 mt-1">Draws recorded in {validYear}</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(totalCents)}</p>
          <p className="text-sm text-stone-500 mt-1">Total drawn in {validYear}</p>
        </Card>
      </div>

      <Card className="p-4 border-l-4 border-l-amber-400">
        <p className="text-xs text-amber-700">
          Owner draws are equity movements, not business expenses. They do not reduce your taxable
          income and are not included in your Schedule C. Record them here so your CPA export
          accounts for every dollar that left the business.
        </p>
      </Card>

      <OwnerDrawsClient draws={draws} year={validYear} />
    </div>
  )
}
