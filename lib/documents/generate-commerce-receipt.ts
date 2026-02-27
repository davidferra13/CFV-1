// Commerce Engine V1 — PDF Receipt Generator
// Generates a professional receipt PDF for a commerce sale using PDFKit.
// Follows the same pattern as pdf-generator.ts for invoices.
// Brand color: terracotta orange #e88f47

import PDFDocument from 'pdfkit'

// ─── Types ────────────────────────────────────────────────────────

export type CommerceReceiptData = {
  saleNumber: string | null
  saleDate: string
  channel: string

  // Business info
  businessName: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string

  // Items
  items: {
    name: string
    quantity: number
    unitPriceCents: number
    lineTotalCents: number
  }[]

  // Totals
  subtotalCents: number
  taxCents: number
  discountCents: number
  tipCents: number
  totalCents: number

  // Payment
  payments: {
    method: string
    amountCents: number
    status: string
  }[]

  // Optional
  customerName?: string
  notes?: string
  taxRate?: number
  taxZipCode?: string
}

// ─── Constants ────────────────────────────────────────────────────

const PAGE_WIDTH = 226 // ~80mm thermal receipt width in points (3.15")
const MARGIN = 10
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const BRAND_ORANGE = '#e88f47'
const TEXT_PRIMARY = '#1a1a1a'
const TEXT_MUTED = '#666666'

// ─── Helpers ──────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function divider(doc: PDFKit.PDFDocument, y: number): number {
  doc
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .strokeColor('#cccccc')
    .lineWidth(0.5)
    .stroke()
  return y + 6
}

// ─── Main Generator ───────────────────────────────────────────────

export function generateCommerceReceiptPdf(data: CommerceReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    const doc = new PDFDocument({
      size: [PAGE_WIDTH, 800],
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
    })

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    let y = MARGIN

    // ─── Header ─────────────────────────────────────────────
    doc
      .fontSize(14)
      .fillColor(BRAND_ORANGE)
      .font('Helvetica-Bold')
      .text(data.businessName, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' })
    y = doc.y + 2

    if (data.businessAddress) {
      doc
        .fontSize(7)
        .fillColor(TEXT_MUTED)
        .font('Helvetica')
        .text(data.businessAddress, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' })
      y = doc.y + 1
    }

    if (data.businessPhone || data.businessEmail) {
      const contact = [data.businessPhone, data.businessEmail].filter(Boolean).join(' | ')
      doc
        .fontSize(7)
        .fillColor(TEXT_MUTED)
        .text(contact, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' })
      y = doc.y + 1
    }

    y = divider(doc, y + 4)

    // ─── Sale Info ──────────────────────────────────────────
    doc.fontSize(8).fillColor(TEXT_PRIMARY).font('Helvetica-Bold')

    if (data.saleNumber) {
      doc.text(`Receipt #${data.saleNumber}`, MARGIN, y, { width: CONTENT_WIDTH })
      y = doc.y + 1
    }

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(TEXT_MUTED)
      .text(
        new Date(data.saleDate).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        MARGIN,
        y,
        { width: CONTENT_WIDTH }
      )
    y = doc.y + 1

    if (data.customerName) {
      doc.text(`Customer: ${data.customerName}`, MARGIN, y, { width: CONTENT_WIDTH })
      y = doc.y + 1
    }

    y = divider(doc, y + 4)

    // ─── Items ──────────────────────────────────────────────
    for (const item of data.items) {
      doc
        .fontSize(8)
        .fillColor(TEXT_PRIMARY)
        .font('Helvetica')
        .text(item.name, MARGIN, y, { width: CONTENT_WIDTH - 50 })

      doc.fontSize(8).text(formatCents(item.lineTotalCents), PAGE_WIDTH - MARGIN - 50, y, {
        width: 50,
        align: 'right',
      })

      y = doc.y + 1

      if (item.quantity > 1) {
        doc
          .fontSize(6)
          .fillColor(TEXT_MUTED)
          .text(`  ${item.quantity} × ${formatCents(item.unitPriceCents)}`, MARGIN, y, {
            width: CONTENT_WIDTH,
          })
        y = doc.y + 1
      }

      y += 2
    }

    y = divider(doc, y + 2)

    // ─── Totals ─────────────────────────────────────────────
    const addTotalLine = (label: string, cents: number, bold = false, negative = false) => {
      doc
        .fontSize(8)
        .fillColor(TEXT_PRIMARY)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, MARGIN, y, { width: CONTENT_WIDTH - 50 })
      doc.text(
        `${negative ? '-' : ''}${formatCents(Math.abs(cents))}`,
        PAGE_WIDTH - MARGIN - 50,
        y,
        { width: 50, align: 'right' }
      )
      y = doc.y + 2
    }

    addTotalLine('Subtotal', data.subtotalCents)
    if (data.taxCents > 0) {
      const taxLabel = data.taxRate ? `Tax (${(data.taxRate * 100).toFixed(2)}%)` : 'Tax'
      addTotalLine(taxLabel, data.taxCents)
    }
    if (data.discountCents > 0) {
      addTotalLine('Discount', data.discountCents, false, true)
    }
    if (data.tipCents > 0) {
      addTotalLine('Tip', data.tipCents)
    }

    y = divider(doc, y + 2)
    addTotalLine('TOTAL', data.totalCents, true)
    y += 4

    // ─── Payment Method ─────────────────────────────────────
    for (const payment of data.payments) {
      doc
        .fontSize(7)
        .fillColor(TEXT_MUTED)
        .font('Helvetica')
        .text(`Paid: ${formatCents(payment.amountCents)} (${payment.method})`, MARGIN, y, {
          width: CONTENT_WIDTH,
        })
      y = doc.y + 1
    }

    // ─── Footer ─────────────────────────────────────────────
    y = divider(doc, y + 6)

    if (data.notes) {
      doc
        .fontSize(6)
        .fillColor(TEXT_MUTED)
        .text(data.notes, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' })
      y = doc.y + 4
    }

    doc
      .fontSize(7)
      .fillColor(TEXT_MUTED)
      .font('Helvetica')
      .text('Thank you!', MARGIN, y, { width: CONTENT_WIDTH, align: 'center' })
    y = doc.y + 2

    doc
      .fontSize(6)
      .text('Powered by ChefFlow', MARGIN, y, { width: CONTENT_WIDTH, align: 'center' })

    doc.end()
  })
}
