// Invoice PDF Generator
// Converts the computed InvoiceData DTO into a formal PDF.
// Reuses the data fetchers from lib/events/invoice-actions.ts — no duplicate queries.
// Multi-page allowed: invoices with many ledger entries may need more than one page.

import { PDFLayout, MARGIN_X, CONTENT_WIDTH } from './pdf-layout'
import { format } from 'date-fns'
import type { InvoiceData } from '@/lib/events/invoice-actions'
import { formatTaxRate } from '@/lib/tax/api-ninjas'

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function labelForEntryType(entryType: string, isRefund: boolean): string {
  if (isRefund) return 'Refund'
  switch (entryType) {
    case 'deposit':
      return 'Deposit'
    case 'balance':
      return 'Balance Payment'
    case 'tip':
      return 'Gratuity'
    case 'adjustment':
      return 'Adjustment'
    default:
      return 'Payment'
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderInvoice(pdf: PDFLayout, data: InvoiceData) {
  const {
    chef,
    client,
    event,
    paymentEntries,
    quotedPriceCents,
    depositAmountCents,
    totalPaidCents,
    totalRefundedCents,
    tipAmountCents,
    balanceDueCents,
    isPaidInFull,
    invoiceNumber,
    invoiceIssuedAt,
    pricePerPersonCents,
    salesTax,
  } = data

  // ── HEADER ────────────────────────────────────────────────────────────────
  pdf.title(chef.businessName, 13)
  pdf.title('INVOICE', 11)
  pdf.space(1)

  const metaPairs: Array<[string, string]> = []
  if (invoiceNumber) metaPairs.push(['Invoice', invoiceNumber])
  if (invoiceIssuedAt) metaPairs.push(['Issued', format(new Date(invoiceIssuedAt), 'MMM d, yyyy')])
  if (metaPairs.length > 0) pdf.headerBar(metaPairs)

  pdf.space(3)

  // ── PARTIES ───────────────────────────────────────────────────────────────
  pdf.sectionHeader('BILLED TO / FROM', 10, true)

  const doc = pdf.doc
  const halfWidth = CONTENT_WIDTH / 2 - 4

  // From (Chef) — left
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('FROM', MARGIN_X, pdf.y)
  doc.setFont('helvetica', 'normal')
  doc.text(chef.businessName, MARGIN_X, pdf.y + 4)
  doc.text(chef.email, MARGIN_X, pdf.y + 8)
  if (chef.phone) doc.text(chef.phone, MARGIN_X, pdf.y + 12)

  // To (Client) — right
  doc.setFont('helvetica', 'bold')
  doc.text('TO', MARGIN_X + halfWidth + 4, pdf.y)
  doc.setFont('helvetica', 'normal')
  doc.text(client.displayName, MARGIN_X + halfWidth + 4, pdf.y + 4)
  if (client.email) doc.text(client.email, MARGIN_X + halfWidth + 4, pdf.y + 8)
  if (data.loyalty) {
    const loyaltyLine = `${data.loyalty.tier} member | ${data.loyalty.pointsBalance.toLocaleString()} points`
    doc.setFontSize(7.5)
    doc.setTextColor(110, 110, 110)
    doc.text(loyaltyLine, MARGIN_X + halfWidth + 4, pdf.y + 12)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
  }

  pdf.y += chef.phone ? 18 : 16
  pdf.space(3)

  // ── EVENT DETAILS ─────────────────────────────────────────────────────────
  pdf.sectionHeader('EVENT DETAILS', 10, true)

  const eventPairs: Array<[string, string]> = [
    ['Date', event.formattedDate],
    ['Guests', String(event.guestCount)],
  ]
  if (event.occasion) eventPairs.push(['Occasion', event.occasion])
  if (event.locationCity) {
    const loc = [event.locationCity, event.locationState].filter(Boolean).join(', ')
    eventPairs.push(['Location', loc])
  }
  pdf.headerBar(eventPairs)

  pdf.space(3)

  // ── LINE ITEMS ────────────────────────────────────────────────────────────
  pdf.sectionHeader('SERVICES', 10, true)

  if (quotedPriceCents) {
    const desc = event.occasion
      ? `Private Chef Services — ${event.occasion}`
      : 'Private Chef Services'
    const priceNote = pricePerPersonCents
      ? ` (${formatCents(pricePerPersonCents)} × ${event.guestCount} guests)`
      : ''
    pdf.keyValue(desc + priceNote, formatCents(quotedPriceCents), 9)
  }

  if (depositAmountCents) {
    pdf.keyValue('  Deposit required', formatCents(depositAmountCents), 9)
  }

  if (salesTax && salesTax.taxAmountCents > 0) {
    pdf.keyValue(
      `Sales Tax (${formatTaxRate(salesTax.taxRate)})`,
      formatCents(salesTax.taxAmountCents),
      9
    )
  }

  if (tipAmountCents > 0) {
    pdf.keyValue('Gratuity', formatCents(tipAmountCents), 9)
  }

  pdf.space(2)

  // ── PAYMENT HISTORY ───────────────────────────────────────────────────────
  if (paymentEntries.length > 0) {
    pdf.sectionHeader('PAYMENT HISTORY', 10, true)

    for (const entry of paymentEntries) {
      if (pdf.wouldOverflow(6)) pdf.newPage()

      const label = labelForEntryType(entry.entryType, entry.isRefund)
      const methodLabel = entry.paymentMethod ? ` (${entry.paymentMethod})` : ''
      const left = `${entry.date} — ${label}${methodLabel}`
      const right = entry.isRefund
        ? `(${formatCents(Math.abs(entry.amountCents))})`
        : formatCents(entry.amountCents)

      // Left text + right-aligned amount
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(left, MARGIN_X, pdf.y)
      const rightW = doc.getTextWidth(right)
      doc.text(right, MARGIN_X + CONTENT_WIDTH - rightW, pdf.y)
      pdf.y += 9 * 0.38 + 0.5

      // Transaction reference in gray
      if (entry.transactionReference) {
        doc.setFontSize(7.5)
        doc.setTextColor(120, 120, 120)
        doc.text(`  Ref: ${entry.transactionReference}`, MARGIN_X, pdf.y)
        doc.setTextColor(0, 0, 0)
        pdf.y += 7.5 * 0.38
      }
    }

    pdf.space(2)
  }

  // ── BALANCE SUMMARY ───────────────────────────────────────────────────────
  if (pdf.wouldOverflow(30)) pdf.newPage()

  pdf.sectionHeader('SUMMARY', 10, true)

  if (quotedPriceCents) {
    pdf.keyValue('Service Total', formatCents(quotedPriceCents), 9)
  }
  if (salesTax && salesTax.taxAmountCents > 0) {
    pdf.keyValue(
      `Sales Tax (${formatTaxRate(salesTax.taxRate)})`,
      formatCents(salesTax.taxAmountCents),
      9
    )
  }
  if (totalPaidCents > 0) {
    pdf.keyValue('Total Paid', formatCents(totalPaidCents), 9)
  }
  if (totalRefundedCents > 0) {
    pdf.keyValue('Total Refunded', `(${formatCents(totalRefundedCents)})`, 9)
  }

  pdf.space(1)
  pdf.hr()

  // Balance due — larger, bold
  const balanceLabel = isPaidInFull
    ? 'PAID IN FULL'
    : `BALANCE DUE: ${formatCents(balanceDueCents)}`
  pdf.text(balanceLabel, 10, 'bold')

  // Footer
  const footerRef = invoiceNumber ?? chef.email
  pdf.footer(`${footerRef}  ·  ${chef.businessName}  ·  Thank you`)
}

// ─── Generate ─────────────────────────────────────────────────────────────────

export function generateInvoicePDF(data: InvoiceData): Buffer {
  const pdf = new PDFLayout()
  renderInvoice(pdf, data)
  return pdf.toBuffer()
}
