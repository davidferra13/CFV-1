import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { get941Summaries } from '@/lib/finance/payroll-actions'
import { Form941Panel } from '@/components/finance/payroll/form-941-panel'

export const metadata: Metadata = { title: 'Form 941 — ChefFlow' }

export default async function Form941Page({ searchParams }: { searchParams: { year?: string } }) {
  await requireChef()

  const currentYear = new Date().getFullYear()
  const taxYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear

  const summaries = await get941Summaries(taxYear).catch(() => [])

  const availableYears = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/finance/payroll" className="text-sm text-stone-500 hover:text-stone-700">
            &larr; Payroll
          </Link>
          <h1 className="text-3xl font-bold text-stone-900 mt-1">Form 941 — {taxYear}</h1>
          <p className="text-stone-500 mt-1">
            Quarterly payroll tax summary. File via IRS-approved software.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-stone-500">Year:</span>
            {availableYears.map((y) => (
              <Link
                key={y}
                href={`/finance/payroll/941?year=${y}`}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  y === taxYear
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'border-stone-300 text-stone-600 hover:border-brand-400 hover:text-brand-600'
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Form941Panel taxYear={taxYear} summaries={summaries} />
    </div>
  )
}
