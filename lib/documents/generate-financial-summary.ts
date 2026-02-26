// Financial Summary PDF Generator
// Renders the per-event P&L summary as a portable PDF — useful for accountants,
// tax prep, or archived event records.
// Mirrors the 7-section layout of FinancialSummaryView (screen component).
// Multi-page allowed: 7 sections with many data rows.

import { PDFLayout, MARGIN_X, CONTENT_WIDTH } from './pdf-layout'
import { format } from 'date-fns'
import type { EventFinancialSummaryData } from '@/lib/events/financial-summary-actions'

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatMinutes(minutes: number | null): string {
  if (!minutes || minutes === 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Right-aligned data row: label on left, value on right
function dataRow(pdf: PDFLayout, label: string, value: string, sub?: string) {
  const lh = 9 * 0.38
  if (pdf.wouldOverflow(lh + (sub ? lh * 0.8 : 0) + 1)) pdf.newPage()

  const doc = pdf.doc
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(label, MARGIN_X, pdf.y)
  const valueW = doc.getTextWidth(value)
  doc.setFont('helvetica', 'bold')
  doc.text(value, MARGIN_X + CONTENT_WIDTH - valueW, pdf.y)
  pdf.y += lh + 1

  if (sub) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(130, 130, 130)
    doc.text(sub, MARGIN_X + 2, pdf.y)
    doc.setTextColor(0, 0, 0)
    pdf.y += 7.5 * 0.38 + 0.5
  }

  // Thin separator line
  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.15)
  doc.line(MARGIN_X, pdf.y, MARGIN_X + CONTENT_WIDTH, pdf.y)
  pdf.y += 0.5
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderFinancialSummary(pdf: PDFLayout, data: EventFinancialSummaryData) {
  const { event, client, revenue, costs, margins, time, mileage, comparison, pendingItems } = data

  const isDraft = pendingItems.length > 0
  const statusLabel = event.financialClosed ? 'CLOSED' : isDraft ? `DRAFT` : 'FINAL'

  // ── HEADER ────────────────────────────────────────────────────────────────
  pdf.title('EVENT FINANCIAL SUMMARY', 13)
  pdf.space(1)

  const eventDate = format(new Date(event.eventDate), 'MMMM d, yyyy')
  pdf.headerBar([
    ['Client', client.displayName],
    ['Date', eventDate],
    ['Guests', String(event.guestCount)],
  ])
  if (event.occasion) {
    pdf.text(event.occasion, 8, 'italic')
  }
  pdf.space(1)

  // Status badge (text-based)
  const doc = pdf.doc
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const statusColor = event.financialClosed ? [22, 101, 52] : isDraft ? [146, 64, 14] : [28, 25, 23]
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
  doc.text(`● ${statusLabel}`, MARGIN_X, pdf.y)
  doc.setTextColor(0, 0, 0)
  if (isDraft) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(130, 130, 130)
    doc.text(`  Pending: ${pendingItems.join(' · ')}`, MARGIN_X + 6, pdf.y)
    doc.setTextColor(0, 0, 0)
  }
  pdf.y += 9 * 0.38 + 1
  pdf.space(2)

  // ── SECTION 2: REVENUE ────────────────────────────────────────────────────
  pdf.sectionHeader('REVENUE', 10, true)
  dataRow(pdf, 'Quoted price', formatCents(revenue.quotedPriceCents))
  dataRow(pdf, 'Service payment received', formatCents(revenue.basePaymentReceivedCents))
  dataRow(pdf, 'Tip / gratuity', revenue.tipCents > 0 ? formatCents(revenue.tipCents) : '—')
  dataRow(pdf, 'Total received', formatCents(revenue.totalReceivedCents))
  if (revenue.varianceCents !== 0) {
    const sign = revenue.varianceCents > 0 ? '+' : ''
    const note = revenue.varianceCents > 0 ? 'overpayment / gratuity' : 'underpaid'
    dataRow(pdf, 'Variance', `${sign}${formatCents(revenue.varianceCents)}`, note)
  }
  pdf.space(2)

  // ── SECTION 3: COSTS ─────────────────────────────────────────────────────
  if (pdf.wouldOverflow(40)) pdf.newPage()
  pdf.sectionHeader('COSTS', 10, true)
  dataRow(
    pdf,
    'Grocery & ingredient spend',
    costs.actualGrocerySpendCents > 0 ? formatCents(costs.actualGrocerySpendCents) : 'Pending'
  )
  if (costs.leftoverCreditInCents && costs.leftoverCreditInCents > 0) {
    dataRow(
      pdf,
      'Leftover credit received (from prior event)',
      `−${formatCents(costs.leftoverCreditInCents)}`,
      'ingredients carried in'
    )
  }
  if (costs.leftoverCreditOutCents && costs.leftoverCreditOutCents > 0) {
    dataRow(
      pdf,
      'Leftover carried to next event',
      `−${formatCents(costs.leftoverCreditOutCents)}`,
      'surplus applied forward'
    )
  }
  dataRow(pdf, 'Net food cost', formatCents(costs.netFoodCostCents))
  if (costs.additionalExpensesCents > 0) {
    dataRow(pdf, 'Additional expenses (gas, etc.)', formatCents(costs.additionalExpensesCents))
  }
  dataRow(pdf, 'Total cost', formatCents(costs.totalCostCents))
  pdf.space(2)

  // ── SECTION 4: MARGINS ────────────────────────────────────────────────────
  if (pdf.wouldOverflow(35)) pdf.newPage()
  pdf.sectionHeader('MARGINS', 10, true)
  dataRow(pdf, 'Food cost %', `${margins.foodCostPercent}%`, 'target: under 30%')
  dataRow(pdf, 'Gross profit', formatCents(margins.grossProfitCents))
  dataRow(pdf, 'Gross margin %', `${margins.grossMarginPercent}%`)
  dataRow(pdf, 'Net profit (with tip)', formatCents(margins.netProfitWithTipCents))
  pdf.space(2)

  // ── SECTION 5: TIME INVESTMENT ────────────────────────────────────────────
  if (pdf.wouldOverflow(40)) pdf.newPage()
  pdf.sectionHeader('TIME INVESTMENT', 10, true)
  if (time.totalMinutes) {
    dataRow(pdf, 'Shopping', formatMinutes(time.shoppingMinutes))
    dataRow(pdf, 'Prep', formatMinutes(time.prepMinutes))
    dataRow(pdf, 'Travel', formatMinutes(time.travelMinutes))
    dataRow(pdf, 'Service', formatMinutes(time.serviceMinutes))
    dataRow(pdf, 'Reset & cleanup', formatMinutes(time.resetMinutes))
    dataRow(pdf, 'Total', formatMinutes(time.totalMinutes))
    if (time.effectiveHourlyRateCents) {
      pdf.space(1)
      pdf.text(
        `Effective hourly rate: ${formatCents(time.effectiveHourlyRateCents)}/hr`,
        10,
        'bold'
      )
    }
  } else {
    pdf.text('Time not logged for this event.', 9, 'italic')
  }
  pdf.space(2)

  // ── SECTION 6: MILEAGE ────────────────────────────────────────────────────
  if (pdf.wouldOverflow(25)) pdf.newPage()
  const rateLabel = `$${(mileage.irsMileageRateCentsPerMile / 100).toFixed(2)}/mi IRS rate`
  pdf.sectionHeader(`MILEAGE  (${rateLabel})`, 10, true)
  if (mileage.miles) {
    dataRow(pdf, 'Miles driven', `${mileage.miles} mi`)
    if (mileage.deductionValueCents) {
      dataRow(
        pdf,
        'IRS deduction value',
        formatCents(mileage.deductionValueCents),
        `${mileage.miles} mi × $${(mileage.irsMileageRateCentsPerMile / 100).toFixed(2)}`
      )
    }
  } else {
    pdf.text('Mileage not entered.', 9, 'italic')
  }
  pdf.space(2)

  // ── SECTION 7: HISTORICAL COMPARISON ─────────────────────────────────────
  if (comparison) {
    if (pdf.wouldOverflow(25)) pdf.newPage()
    pdf.sectionHeader('VS. YOUR AVERAGE', 10, true)
    const fcSign =
      comparison.vsAverageFoodCostPercent !== null && comparison.vsAverageFoodCostPercent > 0
        ? '+'
        : ''
    const mgSign =
      comparison.vsAverageMarginPercent !== null && comparison.vsAverageMarginPercent > 0 ? '+' : ''
    dataRow(
      pdf,
      'Food cost vs. your average',
      `${fcSign}${comparison.vsAverageFoodCostPercent}%`,
      comparison.vsAverageFoodCostPercent !== null && comparison.vsAverageFoodCostPercent > 0
        ? 'higher than average'
        : 'lower than average'
    )
    dataRow(
      pdf,
      'Margin vs. your average',
      `${mgSign}${comparison.vsAverageMarginPercent}%`,
      comparison.vsAverageMarginPercent !== null && comparison.vsAverageMarginPercent > 0
        ? 'above average'
        : 'below average'
    )
  }

  // Footer
  const footerStatus =
    event.financialClosed && event.financialClosedAt
      ? `Closed ${format(new Date(event.financialClosedAt), 'MMM d, yyyy')}`
      : statusLabel
  pdf.footer(`${event.occasion ?? 'Event'} · ${eventDate} · ${footerStatus}`)
}

// ─── Generate ─────────────────────────────────────────────────────────────────

export function generateFinancialSummaryPDF(data: EventFinancialSummaryData): Buffer {
  const pdf = new PDFLayout()
  renderFinancialSummary(pdf, data)
  return pdf.toBuffer()
}
