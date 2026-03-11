import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { PayrollCalculator } from '@/components/finance/payroll-calculator'

export const metadata: Metadata = { title: 'Payroll Calculator - ChefFlow' }

export default async function PayrollCalculatorPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payroll" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Payroll
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Payroll Calculator</h1>
        <p className="text-stone-500 mt-1">
          Compute gross pay from clock entries, overtime at 1.5x, and tip income for any pay period.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3 text-sm text-amber-200">
        <strong>Reference tool only.</strong> This calculator uses staff clock entries and tip
        distributions to estimate gross pay. It does not account for tax withholdings, deductions,
        or benefits. Use your payroll provider for official calculations.
      </div>

      <PayrollCalculator />
    </div>
  )
}
