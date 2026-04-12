import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import YoyComparisonDashboard from '@/components/finance/yoy-comparison-dashboard'

export const metadata: Metadata = { title: 'Year-over-Year Comparison' }

export default async function YoyComparisonPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Reporting
        </Link>
        <div className="mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Year-over-Year Comparison</h1>
          <p className="text-stone-500 mt-1">Track growth and seasonal trends across years</p>
        </div>
      </div>

      <YoyComparisonDashboard />
    </div>
  )
}
