import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getW2Summaries } from '@/lib/finance/payroll-actions'
import { W2Panel } from '@/components/finance/payroll/w2-panel'

export const metadata: Metadata = { title: 'W-2 Summaries' }

export default async function W2Page({ searchParams }: { searchParams: { year?: string } }) {
  await requireChef()

  const currentYear = new Date().getFullYear()
  const taxYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear - 1

  const summaries = await getW2Summaries(taxYear).catch(() => [])

  const availableYears = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/finance/payroll" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Payroll
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">W-2 Summaries - {taxYear}</h1>
          <p className="text-stone-500 mt-1">
            Annual W-2 data per employee. File with SSA by January 31.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-stone-500">Year:</span>
            {availableYears.map((y) => (
              <Link
                key={y}
                href={`/finance/payroll/w2?year=${y}`}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  y === taxYear
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'border-stone-600 text-stone-400 hover:border-brand-400 hover:text-brand-600'
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <W2Panel taxYear={taxYear} summaries={summaries} />
    </div>
  )
}
