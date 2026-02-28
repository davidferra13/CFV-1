// PDFKit-based Invoice PDF Generator
// Uses PDFKit (server-side only) for professional-quality PDF output.
// Reuses InvoiceData DTO from lib/events/invoice-actions.ts — no duplicate queries.
// Brand color: terracotta orange #e88f47
// All monetary amounts are in cents — divided by 100 for display.

import PDFDocument from 'pdfkit'
import type { InvoiceData } from '@/lib/events/invoice-actions'
import { formatTaxRate } from '@/lib/tax/api-ninjas'

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_WIDTH = 612 // US Letter in points (8.5")
const PAGE_HEIGHT = 792 // US Letter in points (11")
const MARGIN_LEFT = 50
const MARGIN_RIGHT = 50
const MARGIN_TOP = 50
const MARGIN_BOTTOM = 50
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

// Brand colors
const BRAND_ORANGE = '#e88f47'
const TEXT_PRIMARY = '#1a1a1a'
const TEXT_SECONDARY = '#4a4a4a'
const TEXT_MUTED = '#808080'
const BORDER_COLOR = '#d4d4d4'
const HEADER_BG = '#fef7f0' // light warm tint
const PAID_GREEN = '#16a34a'

// ─── Format helpers ─────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
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
    case 'payment':
      return 'Payment'
    case 'installment':
      return 'Installment'
    case 'final_payment':
      return 'Final Payment'
    case 'add_on':
      return 'Add-On'
    case 'credit':
      return 'Credit'
    default:
      return 'Payment'
  }
}

function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    cash: 'Cash',
    venmo: 'Venmo',
    paypal: 'PayPal',
    zelle: 'Zelle',
    card: 'Card',
    check: 'Check',
    other: 'Other',
  }
  return map[method] ?? method
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: {
        top: MARGIN_TOP,
        bottom: MARGIN_BOTTOM,
        left: MARGIN_LEFT,
        right: MARGIN_RIGHT,
      },
      info: {
        Title: `Invoice ${data.invoiceNumber ?? ''}`.trim(),
        Author: data.chef.businessName,
        Subject: 'Invoice',
        Creator: 'ChefFlow',
      },
      bufferPages: true,
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    let y = MARGIN_TOP

    // ── BRAND HEADER BAR ────────────────────────────────────────────────
    // Terracotta gradient bar at the top
    doc.rect(0, 0, PAGE_WIDTH, 8).fill(BRAND_ORANGE)

    // ── HEADER SECTION ──────────────────────────────────────────────────
    y = 30

    // Business name — left
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(TEXT_PRIMARY)
      .text(data.chef.businessName, MARGIN_LEFT, y, {
        width: CONTENT_WIDTH / 2,
      })

    // "INVOICE" — right aligned
    doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor(BRAND_ORANGE)
      .text('INVOICE', MARGIN_LEFT, y, {
        width: CONTENT_WIDTH,
        align: 'right',
      })

    y += 32

    // Chef contact info — left
    doc.font('Helvetica').fontSize(9).fillColor(TEXT_SECONDARY)
    doc.text(data.chef.email, MARGIN_LEFT, y)
    if (data.chef.phone) {
      doc.text(data.chef.phone, MARGIN_LEFT, y + 12)
    }

    // Invoice meta — right
    const metaX = PAGE_WIDTH - MARGIN_RIGHT - 160
    doc.font('Helvetica').fontSize(9).fillColor(TEXT_SECONDARY)

    let metaY = y
    if (data.invoiceNumber) {
      doc.font('Helvetica-Bold').text('Invoice #:', metaX, metaY, { continued: true, width: 160 })
      doc.font('Helvetica').text(` ${data.invoiceNumber}`)
      metaY += 14
    }
    if (data.invoiceIssuedAt) {
      const issuedDate = new Date(data.invoiceIssuedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      doc.font('Helvetica-Bold').text('Issued:', metaX, metaY, { continued: true, width: 160 })
      doc.font('Helvetica').text(` ${issuedDate}`)
      metaY += 14
    }

    y = Math.max(y + (data.chef.phone ? 28 : 16), metaY + 4)

    // ── DIVIDER ─────────────────────────────────────────────────────────
    doc
      .moveTo(MARGIN_LEFT, y)
      .lineTo(PAGE_WIDTH - MARGIN_RIGHT, y)
      .strokeColor(BORDER_COLOR)
      .lineWidth(1)
      .stroke()
    y += 16

    // ── BILLED TO / EVENT INFO ──────────────────────────────────────────
    const colWidth = CONTENT_WIDTH / 2 - 10

    // Bill To — left column
    doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED)
    doc.text('BILL TO', MARGIN_LEFT, y)
    y += 14

    doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_PRIMARY)
    doc.text(data.client.displayName, MARGIN_LEFT, y, { width: colWidth })
    const clientNameHeight = doc.heightOfString(data.client.displayName, { width: colWidth })

    doc.font('Helvetica').fontSize(9).fillColor(TEXT_SECONDARY)
    if (data.client.email) {
      doc.text(data.client.email, MARGIN_LEFT, y + clientNameHeight + 2, { width: colWidth })
    }
    if (data.loyalty) {
      const loyaltyParts = [
        `${data.loyalty.tier} member`,
        `${data.loyalty.pointsBalance.toLocaleString()} points`,
      ]
      if (data.loyalty.nextTierName && data.loyalty.pointsToNextTier > 0) {
        loyaltyParts.push(
          `${data.loyalty.pointsToNextTier.toLocaleString()} to ${data.loyalty.nextTierName}`
        )
      }
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(TEXT_MUTED)
        .text(`Loyalty: ${loyaltyParts.join(' | ')}`, MARGIN_LEFT, y + clientNameHeight + 14, {
          width: colWidth,
        })
    }

    // Event — right column
    const rightX = MARGIN_LEFT + colWidth + 20
    doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED)
    doc.text('EVENT', rightX, y - 14)

    doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_PRIMARY)
    doc.text(data.event.occasion || 'Private Dinner', rightX, y, { width: colWidth })

    doc.font('Helvetica').fontSize(9).fillColor(TEXT_SECONDARY)
    let eventDetailY = y + clientNameHeight + 2
    doc.text(data.event.formattedDate, rightX, eventDetailY, { width: colWidth })
    eventDetailY += 12

    const locationStr = [data.event.locationCity, data.event.locationState]
      .filter(Boolean)
      .join(', ')
    if (locationStr) {
      doc.text(locationStr, rightX, eventDetailY, { width: colWidth })
      eventDetailY += 12
    }
    doc.text(`${data.event.guestCount} guests`, rightX, eventDetailY, { width: colWidth })

    y = Math.max(y + clientNameHeight + 28, eventDetailY + 16)

    // ── SERVICES TABLE ──────────────────────────────────────────────────
    // Section header
    doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED)
    doc.text('SERVICES', MARGIN_LEFT, y)
    y += 14

    // Table header row
    const tableLeft = MARGIN_LEFT
    const tableRight = PAGE_WIDTH - MARGIN_RIGHT
    const amountColWidth = 100

    doc.rect(tableLeft, y - 4, CONTENT_WIDTH, 22).fill(HEADER_BG)

    doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_SECONDARY)
    doc.text('Description', tableLeft + 8, y + 2, { width: CONTENT_WIDTH - amountColWidth - 16 })
    doc.text('Amount', tableRight - amountColWidth, y + 2, {
      width: amountColWidth - 8,
      align: 'right',
    })
    y += 22

    // Thin separator
    doc.moveTo(tableLeft, y).lineTo(tableRight, y).strokeColor(BORDER_COLOR).lineWidth(0.5).stroke()
    y += 8

    // Service line item
    if (data.quotedPriceCents) {
      const desc = data.event.occasion
        ? `Private Chef Services - ${data.event.occasion}`
        : 'Private Chef Services'

      doc.font('Helvetica').fontSize(10).fillColor(TEXT_PRIMARY)
      doc.text(desc, tableLeft + 8, y, { width: CONTENT_WIDTH - amountColWidth - 16 })
      doc
        .font('Helvetica-Bold')
        .text(formatCents(data.quotedPriceCents), tableRight - amountColWidth, y, {
          width: amountColWidth - 8,
          align: 'right',
        })
      y += 16

      // Pricing breakdown
      if (data.pricePerPersonCents) {
        doc.font('Helvetica').fontSize(8).fillColor(TEXT_MUTED)
        doc.text(
          `${formatCents(data.pricePerPersonCents)} per person x ${data.event.guestCount} guests`,
          tableLeft + 16,
          y
        )
        y += 14
      }
    }

    // Deposit line
    if (data.depositAmountCents) {
      doc.font('Helvetica').fontSize(9).fillColor(TEXT_SECONDARY)
      doc.text('Deposit required', tableLeft + 16, y, {
        width: CONTENT_WIDTH - amountColWidth - 24,
      })
      doc.text(formatCents(data.depositAmountCents), tableRight - amountColWidth, y, {
        width: amountColWidth - 8,
        align: 'right',
      })
      y += 14
    }

    // Sales tax line
    if (data.salesTax && data.salesTax.taxAmountCents > 0) {
      doc.font('Helvetica').fontSize(9).fillColor(TEXT_SECONDARY)
      doc.text(`Sales Tax (${formatTaxRate(data.salesTax.taxRate)})`, tableLeft + 8, y, {
        width: CONTENT_WIDTH - amountColWidth - 16,
      })
      doc.text(formatCents(data.salesTax.taxAmountCents), tableRight - amountColWidth, y, {
        width: amountColWidth - 8,
        align: 'right',
      })
      y += 14

      if (data.salesTax.zipCode) {
        doc.font('Helvetica').fontSize(7).fillColor(TEXT_MUTED)
        doc.text(`Based on ZIP ${data.salesTax.zipCode}`, tableLeft + 16, y)
        y += 10
      }
    }

    // Gratuity line
    if (data.tipAmountCents > 0) {
      doc.font('Helvetica').fontSize(9).fillColor(TEXT_SECONDARY)
      doc.text('Gratuity', tableLeft + 8, y, {
        width: CONTENT_WIDTH - amountColWidth - 16,
      })
      doc.text(formatCents(data.tipAmountCents), tableRight - amountColWidth, y, {
        width: amountColWidth - 8,
        align: 'right',
      })
      y += 14
    }

    y += 8

    // ── PAYMENT HISTORY ─────────────────────────────────────────────────
    if (data.paymentEntries.length > 0) {
      // Check if we need a new page
      if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 120) {
        doc.addPage()
        y = MARGIN_TOP
      }

      doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED)
      doc.text('PAYMENT HISTORY', MARGIN_LEFT, y)
      y += 14

      // Table header
      doc.rect(tableLeft, y - 4, CONTENT_WIDTH, 20).fill(HEADER_BG)

      doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_SECONDARY)
      doc.text('Date', tableLeft + 8, y + 1, { width: 100 })
      doc.text('Type', tableLeft + 108, y + 1, { width: 120 })
      doc.text('Method', tableLeft + 228, y + 1, { width: 100 })
      doc.text('Amount', tableRight - amountColWidth, y + 1, {
        width: amountColWidth - 8,
        align: 'right',
      })
      y += 20

      doc
        .moveTo(tableLeft, y)
        .lineTo(tableRight, y)
        .strokeColor(BORDER_COLOR)
        .lineWidth(0.5)
        .stroke()
      y += 6

      for (const entry of data.paymentEntries) {
        // Page break check
        if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 40) {
          doc.addPage()
          y = MARGIN_TOP
        }

        const label = labelForEntryType(entry.entryType, entry.isRefund)
        const amount = entry.isRefund
          ? `(${formatCents(Math.abs(entry.amountCents))})`
          : formatCents(entry.amountCents)

        const textColor = entry.isRefund ? '#dc2626' : entry.isTip ? '#7c3aed' : TEXT_PRIMARY

        doc.font('Helvetica').fontSize(9).fillColor(TEXT_SECONDARY)
        doc.text(entry.date, tableLeft + 8, y, { width: 100 })

        doc.font('Helvetica').fontSize(9).fillColor(textColor)
        doc.text(label, tableLeft + 108, y, { width: 120 })

        doc.font('Helvetica').fontSize(9).fillColor(TEXT_SECONDARY)
        doc.text(paymentMethodLabel(entry.paymentMethod), tableLeft + 228, y, { width: 100 })

        doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor)
        doc.text(amount, tableRight - amountColWidth, y, {
          width: amountColWidth - 8,
          align: 'right',
        })
        y += 16

        // Transaction reference
        if (entry.transactionReference) {
          doc.font('Helvetica').fontSize(7).fillColor(TEXT_MUTED)
          doc.text(`Ref: ${entry.transactionReference}`, tableLeft + 108, y)
          y += 10
        }
      }

      y += 8
    }

    // ── BALANCE SUMMARY BOX ─────────────────────────────────────────────
    // Check if we need a new page for the summary
    if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 100) {
      doc.addPage()
      y = MARGIN_TOP
    }

    doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED)
    doc.text('SUMMARY', MARGIN_LEFT, y)
    y += 14

    // Summary box with border
    const summaryBoxTop = y - 4
    const summaryLines: Array<{ label: string; value: string; color?: string; bold?: boolean }> = []

    if (data.quotedPriceCents) {
      summaryLines.push({
        label: 'Service Total',
        value: formatCents(data.quotedPriceCents),
      })
    }
    if (data.salesTax && data.salesTax.taxAmountCents > 0) {
      summaryLines.push({
        label: `Sales Tax (${formatTaxRate(data.salesTax.taxRate)})`,
        value: formatCents(data.salesTax.taxAmountCents),
      })
    }
    if (data.totalPaidCents > 0) {
      summaryLines.push({
        label: 'Total Paid',
        value: formatCents(data.totalPaidCents),
        color: PAID_GREEN,
      })
    }
    if (data.totalRefundedCents > 0) {
      summaryLines.push({
        label: 'Total Refunded',
        value: `(${formatCents(data.totalRefundedCents)})`,
        color: '#dc2626',
      })
    }

    // Draw summary lines
    for (const line of summaryLines) {
      doc.font('Helvetica').fontSize(9).fillColor(TEXT_SECONDARY)
      doc.text(line.label, tableLeft + 8, y, { width: CONTENT_WIDTH - amountColWidth - 16 })

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(line.color ?? TEXT_PRIMARY)
      doc.text(line.value, tableRight - amountColWidth, y, {
        width: amountColWidth - 8,
        align: 'right',
      })
      y += 16
    }

    // Divider before balance due
    y += 4
    doc.moveTo(tableLeft, y).lineTo(tableRight, y).strokeColor(BRAND_ORANGE).lineWidth(1.5).stroke()
    y += 12

    // Balance due / Paid in full — larger, bold
    if (data.isPaidInFull) {
      doc.font('Helvetica-Bold').fontSize(14).fillColor(PAID_GREEN)
      doc.text('PAID IN FULL', MARGIN_LEFT, y, {
        width: CONTENT_WIDTH,
        align: 'right',
      })
    } else {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_SECONDARY)
      doc.text('BALANCE DUE', MARGIN_LEFT, y)

      doc.font('Helvetica-Bold').fontSize(16).fillColor(TEXT_PRIMARY)
      doc.text(formatCents(data.balanceDueCents), tableRight - 160, y - 2, {
        width: 160 - 8,
        align: 'right',
      })
    }
    y += 24

    // Summary box border
    const summaryBoxBottom = y
    doc
      .rect(tableLeft, summaryBoxTop, CONTENT_WIDTH, summaryBoxBottom - summaryBoxTop)
      .strokeColor(BORDER_COLOR)
      .lineWidth(0.5)
      .stroke()

    // ── FOOTER ──────────────────────────────────────────────────────────
    const footerY = PAGE_HEIGHT - MARGIN_BOTTOM - 10

    // Orange accent line
    doc
      .moveTo(MARGIN_LEFT + 80, footerY - 8)
      .lineTo(PAGE_WIDTH - MARGIN_RIGHT - 80, footerY - 8)
      .strokeColor(BRAND_ORANGE)
      .lineWidth(0.5)
      .stroke()

    const footerRef = data.invoiceNumber ?? data.chef.email
    doc.font('Helvetica').fontSize(8).fillColor(TEXT_MUTED)
    doc.text(
      `${footerRef}  |  ${data.chef.businessName}  |  Thank you for your business`,
      MARGIN_LEFT,
      footerY,
      {
        width: CONTENT_WIDTH,
        align: 'center',
      }
    )

    // ── BRAND FOOTER BAR ────────────────────────────────────────────────
    doc.rect(0, PAGE_HEIGHT - 4, PAGE_WIDTH, 4).fill(BRAND_ORANGE)

    doc.end()
  })
}
