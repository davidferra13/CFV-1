import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { DeductionTrackerDashboard } from '@/components/finance/deduction-tracker-dashboard'

export const metadata: Metadata = { title: 'Tax Summary - ChefFlow' }

export default async function TaxSummaryPage() {
  await requireChef()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Reporting
        </Link>
        <h1 className="text-2xl font-bold text-stone-100 mt-1">Tax Summary & Deductions</h1>
        <p className="text-stone-500 mt-1">
          All deductions in one place: expenses, mileage, home office, depreciation. Download a
          one-click PDF for your accountant.
        </p>
      </div>

      <DeductionTrackerDashboard />
    </div>
  )
}
