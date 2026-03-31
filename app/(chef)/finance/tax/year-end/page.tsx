import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getYearEndTaxPackage } from '@/lib/finance/tax-package'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { TaxPackageExport } from '@/components/finance/tax-package-export'

export const metadata: Metadata = { title: 'Year-End Tax Package' }

export default async function YearEndTaxPage({
  searchParams,
}: {
  searchParams: { year?: string }
}) {
  await requireChef()
  const currentYear = new Date().getFullYear()
  const taxYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear - 1
  const taxData = await getYearEndTaxPackage(taxYear)

  const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]
  const netIncome = Math.max(
    0,
    taxData.grossRevenueCents + taxData.tipsCents - taxData.totalDeductibleExpensesCents
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">{taxYear} Tax Package</h1>
          <p className="text-stone-400 mt-1">
            Comprehensive year-end financial summary for your accountant
          </p>
          {/* Year Selector */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-stone-500">Year:</span>
            {availableYears.map((y) => (
              <Link
                key={y}
                href={`/finance/tax/year-end?year=${y}`}
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
        <TaxPackageExport taxData={taxData} taxYear={taxYear} />
      </div>

      {/* Revenue Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Gross Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-stone-500">Total Gross Revenue</p>
              <p className="text-2xl font-bold text-stone-100">
                {formatCurrency(taxData.grossRevenueCents)}
              </p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Total Events Completed</p>
              <p className="text-2xl font-bold text-stone-100">{taxData.completedEventCount}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Tips Received</p>
              <p className="text-2xl font-bold text-stone-100">
                {formatCurrency(taxData.tipsCents)}
              </p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Net Income (Est.)</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(netIncome)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Deductible Expenses (Schedule C)</CardTitle>
        </CardHeader>
        <CardContent>
          {taxData.expensesByCategory.length === 0 ? (
            <p className="text-stone-500 text-sm py-4">No expenses recorded for {taxYear}.</p>
          ) : (
            <div className="space-y-2">
              {taxData.expensesByCategory.map((cat) => (
                <div
                  key={cat.category}
                  className="flex justify-between items-center py-2 border-b border-stone-800"
                >
                  <div>
                    <p className="font-medium text-stone-200">{cat.label}</p>
                    <p className="text-xs text-stone-500">{cat.irsCategoryCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(cat.amountCents)}</p>
                    <p className="text-xs text-stone-400">{cat.count} transactions</p>
                  </div>
                </div>
              ))}
              {/* Mileage deduction as a line item */}
              {taxData.mileage.totalMiles > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-stone-800">
                  <div>
                    <p className="font-medium text-stone-200">Mileage Deduction</p>
                    <p className="text-xs text-stone-500">
                      Line 9 - {taxData.mileage.totalMiles.toFixed(1)} mi × $
                      {(taxData.mileage.irsRateCentsPerMile / 100).toFixed(2)}/mi
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(taxData.mileage.totalDeductionCents)}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 font-bold">
                <span>Total Deductible Expenses</span>
                <span className="text-red-700">
                  {formatCurrency(taxData.totalDeductibleExpensesCents)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mileage Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Mileage Deduction (Schedule C, Line 9)</CardTitle>
        </CardHeader>
        <CardContent>
          {taxData.mileage.totalMiles === 0 ? (
            <div className="space-y-3">
              <p className="text-stone-500 text-sm">No mileage logged for {taxYear}.</p>
              <Link href="/finance/tax" className="text-sm text-brand-600 hover:underline">
                Log mileage in the Tax Center →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-stone-500">Total Miles Driven</p>
                <p className="text-2xl font-bold text-stone-100">
                  {taxData.mileage.totalMiles.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-stone-500">IRS Rate ({taxYear})</p>
                <p className="text-2xl font-bold text-stone-100">
                  ${(taxData.mileage.irsRateCentsPerMile / 100).toFixed(2)}/mi
                </p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Total Mileage Deduction</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(taxData.mileage.totalDeductionCents)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quarterly Estimates */}
      <Card>
        <CardHeader>
          <CardTitle>Estimated Quarterly Tax Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500 mb-4">
            Estimates based on 25% effective tax rate. Consult your accountant for exact amounts.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {taxData.quarterlyEstimates.map((q) => (
              <div key={q.quarter} className="bg-amber-950 rounded-lg p-3">
                <p className="text-sm text-stone-400 font-medium">{q.quarter}</p>
                <p className="text-lg font-bold text-amber-800">
                  {formatCurrency(q.estimatedTaxCents)}
                </p>
                <p className="text-xs text-stone-500">Due: {q.dueDate}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Badge variant="warning">Estimates only - consult a licensed tax professional</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
