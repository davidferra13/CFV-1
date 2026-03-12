'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getYearEndTaxPackage, type TaxPackage } from './tax-package'
import { PDFLayout } from '@/lib/documents/pdf-layout'

function fmtCents(cents: number): string {
  return `$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function renderTaxSummaryPDF(pkg: TaxPackage): Buffer {
  const pdf = new PDFLayout()

  // Title
  pdf.title(`Tax Summary - ${pkg.taxYear}`)
  pdf.space(2)

  // Disclaimer
  pdf.warningBox(
    'This summary is for informational purposes only. Consult a qualified CPA or tax professional before filing.'
  )
  pdf.space(2)

  // Income Summary
  pdf.sectionHeader('Income Summary')
  pdf.keyValue('Gross Revenue', fmtCents(pkg.grossRevenueCents))
  pdf.keyValue('Tips Received', fmtCents(pkg.tipsCents))
  pdf.keyValue('Completed Events', String(pkg.completedEventCount))
  pdf.keyValue('Total Gross Income', fmtCents(pkg.grossRevenueCents + pkg.tipsCents))
  pdf.space(3)

  // Deductions
  pdf.sectionHeader('Business Deductions')
  for (const cat of pkg.expensesByCategory) {
    pdf.keyValue(
      `${cat.label} (${cat.irsCategoryCode})`,
      `${fmtCents(cat.amountCents)} (${cat.count} entries)`
    )
  }
  if (pkg.mileage.totalMiles > 0) {
    pdf.keyValue(
      `Vehicle (IRS $${(pkg.mileage.irsRateCentsPerMile / 100).toFixed(2)}/mi)`,
      `${fmtCents(pkg.mileage.totalDeductionCents)} (${pkg.mileage.totalMiles.toLocaleString()} miles)`
    )
  }
  pdf.space(1)
  pdf.keyValue('Total Deductions', fmtCents(pkg.totalDeductibleExpensesCents))
  pdf.space(3)

  // Net Income & SE Tax
  const netIncome = Math.max(
    0,
    pkg.grossRevenueCents + pkg.tipsCents - pkg.totalDeductibleExpensesCents
  )
  const seTaxableBase = Math.round(netIncome * 0.9235)
  const seTax = Math.round(seTaxableBase * 0.153)
  const seTaxDeduction = Math.round(seTax / 2)

  pdf.sectionHeader('Self-Employment Tax Worksheet')
  pdf.keyValue('Net Profit (Schedule C)', fmtCents(netIncome))
  pdf.keyValue('SE Tax Base (92.35%)', fmtCents(seTaxableBase))
  pdf.keyValue('SE Tax (15.3%)', fmtCents(seTax))
  pdf.keyValue('SE Tax Deduction (50%)', fmtCents(seTaxDeduction))
  pdf.space(3)

  // Quarterly Estimates
  pdf.sectionHeader('Quarterly Estimated Tax Payments')
  for (const q of pkg.quarterlyEstimates) {
    pdf.keyValue(`${q.quarter} (due ${q.dueDate})`, fmtCents(q.estimatedTaxCents))
  }
  const totalEstimated = pkg.quarterlyEstimates.reduce((s, q) => s + q.estimatedTaxCents, 0)
  pdf.keyValue('Total Annual Estimate', fmtCents(totalEstimated))
  pdf.space(4)

  // Footer
  pdf.generatedBy('ChefFlow', 'Tax Summary')
  pdf.footer('Not tax advice. Consult a CPA. Generated for informational purposes only.')

  return pdf.toBuffer()
}

/**
 * Generate a one-click tax summary PDF for a given tax year.
 * Returns base64-encoded PDF data.
 */
export async function generateTaxSummaryPDF(
  taxYear: number
): Promise<{ base64: string; filename: string }> {
  await requireChef()
  const pkg = await getYearEndTaxPackage(taxYear)
  const buffer = renderTaxSummaryPDF(pkg)
  return {
    base64: buffer.toString('base64'),
    filename: `tax-summary-${taxYear}.pdf`,
  }
}
