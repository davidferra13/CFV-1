'use client'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { TaxPackage } from '@/lib/finance/tax-package'
import { formatCurrency } from '@/lib/utils/currency'

export function TaxPackageExport({
  taxData,
  taxYear,
}: {
  taxData: TaxPackage
  taxYear: number
}) {
  function handleExport() {
    const rows: string[][] = []

    const row = (...cols: string[]) => rows.push(cols)
    const blank = () => rows.push([])
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`

    // Header
    row(esc(`CHEFFLOW ${taxYear} ANNUAL TAX PACKAGE`))
    row(esc(`Generated: ${new Date().toLocaleDateString()}`))
    row(esc('For informational purposes only — consult a licensed tax professional'))
    blank()

    // Revenue
    row(esc('=== REVENUE (Schedule C, Part I) ==='))
    row(esc('Item'), esc('Amount'))
    row(esc('Gross Revenue (Line 1)'), esc(formatCurrency(taxData.grossRevenueCents)))
    row(esc('Tips Received (Line 1)'), esc(formatCurrency(taxData.tipsCents)))
    row(esc('Total Gross Income'), esc(formatCurrency(taxData.grossRevenueCents + taxData.tipsCents)))
    row(esc('Completed Events'), esc(String(taxData.completedEventCount)))
    blank()

    // Expenses
    row(esc('=== DEDUCTIBLE EXPENSES (Schedule C) ==='))
    row(esc('Category'), esc('IRS Line'), esc('Amount'), esc('Transactions'))
    for (const cat of taxData.expensesByCategory) {
      row(
        esc(cat.label),
        esc(cat.irsCategoryCode),
        esc(formatCurrency(cat.amountCents)),
        esc(String(cat.count))
      )
    }
    blank()

    // Mileage
    const mileageDeduction = taxData.mileage.totalDeductionCents
    row(
      esc('Mileage Deduction (Line 9)'),
      esc('Line 9'),
      esc(formatCurrency(mileageDeduction)),
      esc(`${taxData.mileage.totalMiles.toFixed(1)} miles @ $${(taxData.mileage.irsRateCentsPerMile / 100).toFixed(2)}/mi`)
    )
    blank()
    row(esc('TOTAL DEDUCTIBLE EXPENSES'), esc(''), esc(formatCurrency(taxData.totalDeductibleExpensesCents)), esc(''))
    blank()

    // Net Income
    const netIncome = taxData.grossRevenueCents + taxData.tipsCents - taxData.totalDeductibleExpensesCents
    row(esc('=== NET INCOME ==='))
    row(esc('Estimated Net Profit'), esc(''), esc(formatCurrency(Math.max(0, netIncome))), esc(''))
    blank()

    // Quarterly Estimates
    row(esc('=== QUARTERLY ESTIMATED TAX PAYMENTS ==='))
    row(esc('Quarter'), esc('Due Date'), esc('Estimated Tax'))
    for (const q of taxData.quarterlyEstimates) {
      row(esc(q.quarter), esc(q.dueDate), esc(formatCurrency(q.estimatedTaxCents)))
    }
    blank()
    row(esc('Mileage Detail'), esc(''))
    row(esc('Total Miles'), esc(String(taxData.mileage.totalMiles.toFixed(1))))
    row(esc('IRS Rate'), esc(`$${(taxData.mileage.irsRateCentsPerMile / 100).toFixed(2)}/mile`))
    row(esc('Total Mileage Deduction'), esc(formatCurrency(taxData.mileage.totalDeductionCents)))

    const csv = rows.map(r => r.join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chefflow-tax-package-${taxYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="secondary" onClick={handleExport}>
      <Download className="h-4 w-4 mr-2" />
      Download Tax Package (CSV)
    </Button>
  )
}
