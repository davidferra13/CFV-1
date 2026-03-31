import type { Metadata } from 'next'
import Link from 'next/link'
import { generate1099NECReports, get1099NECFilingSummary } from '@/lib/finance/1099-actions'
import { Form1099NecPanel } from '@/components/finance/form-1099-nec-panel'

export const metadata: Metadata = { title: '1099-NEC Report' }

export default async function Form1099NECPage({
  searchParams,
}: {
  searchParams: { year?: string }
}) {
  const currentYear = new Date().getFullYear()
  const taxYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear

  const [reports, summary] = await Promise.all([
    generate1099NECReports(taxYear).catch(() => []),
    get1099NECFilingSummary(taxYear).catch(() => ({
      totalContractors: 0,
      requiresFilingCount: 0,
      missingW9Count: 0,
      totalNecCents: 0,
    })),
  ])

  const years = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/contractors" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; 1099 Contractors
        </Link>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">1099-NEC Report</h1>
            <p className="text-stone-500 mt-1">Nonemployee compensation summary for tax filing</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-stone-400">Tax Year:</label>
            <div className="flex gap-1">
              {years.map((y) => (
                <Link
                  key={y}
                  href={`/finance/tax/1099-nec?year=${y}`}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    y === taxYear
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Form1099NecPanel reports={reports} summary={summary} taxYear={taxYear} />
    </div>
  )
}
