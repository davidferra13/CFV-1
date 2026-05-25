import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getTaxPrepReport } from '@/lib/reports/tax-prep-actions'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { TaxYearSelector } from '@/components/reports/tax-prep/tax-year-selector'
import { IncomeSummary } from '@/components/reports/tax-prep/income-summary'
import { ExpenseCategoryTable } from '@/components/reports/tax-prep/expense-category-table'
import { ContractorList } from '@/components/reports/tax-prep/contractor-list'
import { ReceiptIndex } from '@/components/reports/tax-prep/receipt-index'
import { PrintButton } from './tax-prep-client'
import { EmailTaxPackageExitLink } from '@/components/finance/finance-exit-links'

export const metadata: Metadata = { title: 'Tax Prep Package' }

export default async function TaxPrepPage({ searchParams }: { searchParams: { year?: string } }) {
  await requireChef()

  const currentYear = new Date().getFullYear()
  const selectedYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear
  const year = isNaN(selectedYear) ? currentYear : selectedYear

  let report
  let error: string | null = null

  try {
    report = await getTaxPrepReport(year)
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to generate tax prep report'
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="print:hidden">
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          Back to Finance
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100 print:text-black">Tax Prep Package</h1>
          <p className="text-stone-500 mt-1 print:text-gray-600">
            Year-end tax preparation summary for {year}
          </p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <EmailTaxPackageExitLink accountantEmail="" year={year} />
          <TaxYearSelector currentYear={year} />
          <PrintButton />
        </div>
      </div>

      {error && (
        <Card className="p-5 border-l-4 border-l-red-600">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {report && (
        <>
          {/* Disclaimer */}
          <Card className="p-4 border-l-4 border-l-amber-400 print:border-l-amber-600">
            <p className="text-xs text-amber-400 print:text-amber-700">
              This report is for reference only. All figures should be verified by a licensed tax
              professional before filing. Generated{' '}
              {new Date(report.generatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              .
            </p>
          </Card>

          {/* Deductions Summary (top-level overview) */}
          <Card className="p-5 print:border print:border-gray-300">
            <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4 print:text-black">
              Tax Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-bold text-green-500 print:text-green-700">
                  {formatCurrency(report.totalIncomeCents)}
                </p>
                <p className="text-sm text-stone-500 mt-0.5">Gross Income</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400 print:text-red-700">
                  {formatCurrency(report.deductions.totalDeductionsCents)}
                </p>
                <p className="text-sm text-stone-500 mt-0.5">Total Deductions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-100 print:text-black">
                  {formatCurrency(report.estimatedTaxableIncomeCents)}
                </p>
                <p className="text-sm text-stone-500 mt-0.5">Est. Taxable Income</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-300 print:text-gray-700">
                  {report.totalMiles.toFixed(1)} mi
                </p>
                <p className="text-sm text-stone-500 mt-0.5">Business Miles</p>
              </div>
            </div>

            {/* Deductions breakdown */}
            <div className="mt-5 pt-4 border-t border-stone-800 print:border-gray-300 space-y-2 max-w-md">
              <div className="flex justify-between text-sm">
                <span className="text-stone-400 print:text-gray-600">
                  Business expenses (deductible)
                </span>
                <span className="text-stone-200 print:text-black font-medium">
                  {formatCurrency(report.deductions.totalDeductibleCents)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-400 print:text-gray-600">
                  Mileage deduction ({report.totalMiles.toFixed(1)} mi x $
                  {(report.irsRateCentsPerMile / 100).toFixed(3)})
                </span>
                <span className="text-stone-200 print:text-black font-medium">
                  {formatCurrency(report.mileageDeductionCents)}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-stone-700 print:border-gray-300">
                <span className="font-bold text-stone-100 print:text-black">Total deductions</span>
                <span className="font-bold text-stone-100 print:text-black">
                  {formatCurrency(report.deductions.totalDeductionsCents)}
                </span>
              </div>
            </div>
          </Card>

          {/* Income */}
          <IncomeSummary
            totalIncomeCents={report.totalIncomeCents}
            incomeSources={report.incomeSources}
          />

          {/* Expenses by category */}
          <ExpenseCategoryTable
            categories={report.expensesByCategory}
            totalExpensesCents={report.totalExpensesCents}
            totalIncomeCents={report.totalIncomeCents}
          />

          {/* Mileage Log */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4 print:text-black">
              Mileage / Travel Log
            </h2>
            {report.mileageLog.length === 0 ? (
              <p className="text-sm text-stone-500">No mileage recorded for {year}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xl font-bold text-stone-100 print:text-black">
                      {report.totalMiles.toFixed(1)}
                    </p>
                    <p className="text-xs text-stone-500">Total miles</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-stone-100 print:text-black">
                      {report.mileageLog.length}
                    </p>
                    <p className="text-xs text-stone-500">Trips</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-500 print:text-green-700">
                      {formatCurrency(report.mileageDeductionCents)}
                    </p>
                    <p className="text-xs text-stone-500">Deduction</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead className="text-right">Miles</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead className="text-right">Deduction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.mileageLog.map((entry, i) => (
                        <TableRow key={`${entry.tripDate}-${i}`}>
                          <TableCell className="text-sm text-stone-400 whitespace-nowrap">
                            {entry.tripDate}
                          </TableCell>
                          <TableCell className="text-sm text-stone-300">
                            {entry.fromLocation || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-stone-300">
                            {entry.toLocation || '-'}
                          </TableCell>
                          <TableCell className="text-right text-sm text-stone-200 font-medium">
                            {entry.miles.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-sm text-stone-400 capitalize">
                            {entry.purpose.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right text-sm text-green-400">
                            {formatCurrency(entry.deductionCents)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </Card>

          {/* 1099 Contractors */}
          <ContractorList
            contractors={report.contractors}
            contractorsRequiring1099={report.contractorsRequiring1099}
          />

          {/* Receipt Index */}
          <ReceiptIndex
            receipts={report.receipts}
            receiptsWithProof={report.receiptsWithProof}
            receiptsWithoutProof={report.receiptsWithoutProof}
          />
        </>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; color: black; }
          nav, header, footer, [data-radix-popper-content-wrapper] { display: none !important; }
          .print\\:hidden { display: none !important; }
          .print\\:text-black { color: black !important; }
          .print\\:text-gray-600 { color: #4b5563 !important; }
          .print\\:text-gray-700 { color: #374151 !important; }
          .print\\:text-green-700 { color: #15803d !important; }
          .print\\:text-red-700 { color: #b91c1c !important; }
          .print\\:text-amber-700 { color: #b45309 !important; }
          .print\\:border { border: 1px solid #d1d5db !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          .print\\:border-l-amber-600 { border-left-color: #d97706 !important; }
        }
      `}</style>
    </div>
  )
}
