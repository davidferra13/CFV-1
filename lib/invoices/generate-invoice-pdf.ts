// Invoice PDF Generator
// Produces a professional invoice PDF for a completed or in-progress event.
// Uses the shared PDFLayout system with the 'invoice' doc type (finance category).
// Data assembly is separated from rendering so it can be reused by actions.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout, MARGIN_X, CONTENT_WIDTH, LETTER_WIDTH } from '@/lib/documents/pdf-layout'
import { FONT, COLOR } from '@/lib/documents/pdf-design-tokens'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import type { jsPDF } from 'jspdf'

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceData = {
  invoiceNumber: string
  invoiceDate: string // ISO string
  chef: {
    businessName: string
    email: string
    phone: string | null
    invoicePaymentTerms: string | null
    invoiceTaxId: string | null
    invoiceFooterNote: string | null
  }
  client: {
    fullName: string
    email: string | null
    phone: string | null
    address: string | null
  }
  billTo: {
    company: string | null
    attention: string | null
    poNumber: string | null
  } | null
  event: {
    id: string
    eventDate: string
    occasion: string | null
    guestCount: number
    serviceStyle: string
    pricingModel: string | null
    quotedPriceCents: number | null
    depositAmountCents: number | null
    tipAmountCents: number
    locationCity: string | null
    locationState: string | null
  }
  ledger: Array<{
    entryType: string
    amountCents: number
    description: string
    paymentMethod: string
    receivedAt: string | null
    isRefund: boolean
  }>
  financial: {
    totalChargeCents: number
    totalPaidCents: number
    outstandingBalanceCents: number
    paymentStatus: string
  }
}

// ─── Data Assembly ────────────────────────────────────────────────────────────

export async function fetchInvoiceData(
  tenantId: string,
  eventId: string
): Promise<InvoiceData | null> {
  const db: any = createServerClient()

  // Parallel fetch: event + chef + ledger + financial summary
  const [eventResult, chefResult, ledgerResult, financialResult] = await Promise.all([
    db
      .from('events')
      .select(
        `id, event_date, occasion, guest_count, service_style, pricing_model,
         quoted_price_cents, deposit_amount_cents, tip_amount_cents,
         location_city, location_state, invoice_number, invoice_issued_at,
         bill_to_company, bill_to_attention, bill_to_po_number,
         client_id,
         client:clients(full_name, email, phone)`
      )
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('chefs')
      .select(
        'business_name, email, phone, invoice_payment_terms, invoice_tax_id, invoice_footer_note'
      )
      .eq('id', tenantId)
      .single(),
    db
      .from('ledger_entries')
      .select('entry_type, amount_cents, description, payment_method, received_at, is_refund')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true }),
    db
      .from('event_financial_summary')
      .select('total_paid_cents, outstanding_balance_cents, payment_status')
      .eq('event_id', eventId)
      .single(),
  ])

  const event = eventResult.data
  if (!event) return null

  const chef = chefResult.data
  if (!chef) return null

  const clientData = (event as any).client
  const ledgerEntries = ledgerResult.data ?? []
  const financial = financialResult.data

  // Generate or use existing invoice number
  const invoiceNumber = event.invoice_number || `INV-${eventId.slice(0, 8).toUpperCase()}`

  return {
    invoiceNumber,
    invoiceDate: event.invoice_issued_at || new Date().toISOString(),
    chef: {
      businessName: chef.business_name,
      email: chef.email,
      phone: chef.phone ?? null,
      invoicePaymentTerms: chef.invoice_payment_terms ?? null,
      invoiceTaxId: chef.invoice_tax_id ?? null,
      invoiceFooterNote: chef.invoice_footer_note ?? null,
    },
    client: {
      fullName: clientData?.full_name ?? 'Client',
      email: clientData?.email ?? null,
      phone: clientData?.phone ?? null,
      address: null, // clients table does not store address
    },
    billTo:
      event.bill_to_company || event.bill_to_attention || event.bill_to_po_number
        ? {
            company: event.bill_to_company ?? null,
            attention: event.bill_to_attention ?? null,
            poNumber: event.bill_to_po_number ?? null,
          }
        : null,
    event: {
      id: event.id,
      eventDate: event.event_date,
      occasion: event.occasion ?? null,
      guestCount: event.guest_count,
      serviceStyle: event.service_style,
      pricingModel: event.pricing_model ?? null,
      quotedPriceCents: event.quoted_price_cents ?? null,
      depositAmountCents: event.deposit_amount_cents ?? null,
      tipAmountCents: event.tip_amount_cents ?? 0,
      locationCity: event.location_city ?? null,
      locationState: event.location_state ?? null,
    },
    ledger: ledgerEntries.map((l: any) => ({
      entryType: l.entry_type,
      amountCents: l.amount_cents,
      description: l.description,
      paymentMethod: l.payment_method,
      receivedAt: l.received_at ?? null,
      isRefund: l.is_refund ?? false,
    })),
    financial: {
      totalChargeCents: event.quoted_price_cents ?? 0,
      totalPaidCents: financial?.total_paid_cents ?? 0,
      outstandingBalanceCents: financial?.outstanding_balance_cents ?? 0,
      paymentStatus: financial?.payment_status ?? 'unpaid',
    },
  }
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function cents(amount: number): string {
  return `$${(Math.abs(amount) / 100).toFixed(2)}`
}

function formatDate(iso: string): string {
  try {
    return format(parseISO(dateToDateString(iso)), 'MMMM d, yyyy')
  } catch {
    return iso
  }
}

// ─── PDF Rendering ────────────────────────────────────────────────────────────

function renderInvoice(pdf: PDFLayout, data: InvoiceData) {
  const doc = pdf.doc
  const leftX = MARGIN_X
  const rightX = LETTER_WIDTH / 2 + 5
  const colW = CONTENT_WIDTH / 2 - 5

  // ===== HEADER =====
  pdf.title(data.chef.businessName, 16)
  pdf.space(1)

  // Invoice number + date row
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR.textPrimary)
  doc.text(`Invoice #${data.invoiceNumber}`, leftX, pdf.y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLOR.textSecondary)
  doc.text(`Date: ${formatDate(data.invoiceDate)}`, LETTER_WIDTH - MARGIN_X, pdf.y, {
    align: 'right',
  })
  doc.setTextColor(...COLOR.textPrimary)
  pdf.y += 6

  // ===== FROM / TO SECTION =====
  pdf.hr()
  pdf.space(2)

  // Left column: From (chef)
  let leftY = pdf.y
  leftY = renderLabel(doc, leftX, leftY, 'FROM')
  leftY = renderLine(doc, leftX, leftY, data.chef.businessName, 'bold')
  if (data.chef.email) leftY = renderLine(doc, leftX, leftY, data.chef.email)
  if (data.chef.phone) leftY = renderLine(doc, leftX, leftY, data.chef.phone)
  if (data.chef.invoiceTaxId)
    leftY = renderLine(doc, leftX, leftY, `Tax ID: ${data.chef.invoiceTaxId}`)

  // Right column: Bill To / Client
  let rightY = pdf.y
  if (data.billTo?.company) {
    rightY = renderLabel(doc, rightX, rightY, 'BILL TO')
    rightY = renderLine(doc, rightX, rightY, data.billTo.company, 'bold')
    if (data.billTo.attention) rightY = renderLine(doc, rightX, rightY, data.billTo.attention)
    if (data.billTo.poNumber)
      rightY = renderLine(doc, rightX, rightY, `PO #${data.billTo.poNumber}`)
    rightY += 3
    rightY = renderLabel(doc, rightX, rightY, 'CLIENT')
  } else {
    rightY = renderLabel(doc, rightX, rightY, 'CLIENT')
  }
  rightY = renderLine(doc, rightX, rightY, data.client.fullName, 'bold')
  if (data.client.email) rightY = renderLine(doc, rightX, rightY, data.client.email)
  if (data.client.phone) rightY = renderLine(doc, rightX, rightY, data.client.phone)

  pdf.y = Math.max(leftY, rightY) + 4

  // ===== EVENT DETAILS =====
  pdf.sectionHeader('EVENT DETAILS', FONT.sectionHeader.size, true)
  pdf.space(1)

  const eventDate = formatDate(data.event.eventDate)
  const location = [data.event.locationCity, data.event.locationState].filter(Boolean).join(', ')

  renderKeyValue(doc, leftX, pdf.y, 'Event Date', eventDate)
  pdf.y += 5
  if (data.event.occasion) {
    renderKeyValue(doc, leftX, pdf.y, 'Occasion', data.event.occasion)
    pdf.y += 5
  }
  renderKeyValue(doc, leftX, pdf.y, 'Guests', String(data.event.guestCount))
  pdf.y += 5
  const styleLabel = data.event.serviceStyle.replace(/_/g, ' ')
  renderKeyValue(
    doc,
    leftX,
    pdf.y,
    'Service Style',
    styleLabel.charAt(0).toUpperCase() + styleLabel.slice(1)
  )
  pdf.y += 5
  if (location) {
    renderKeyValue(doc, leftX, pdf.y, 'Location', location)
    pdf.y += 5
  }
  pdf.space(2)

  // ===== CHARGES =====
  pdf.sectionHeader('CHARGES', FONT.sectionHeader.size, true)
  pdf.space(1)

  // Table header
  const colXDesc = leftX
  const colXAmt = LETTER_WIDTH - MARGIN_X

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR.textSecondary)
  doc.text('Description', colXDesc, pdf.y)
  doc.text('Amount', colXAmt, pdf.y, { align: 'right' })
  pdf.y += 2
  doc.setDrawColor(...COLOR.borderPrimary)
  doc.setLineWidth(0.3)
  doc.line(leftX, pdf.y, LETTER_WIDTH - MARGIN_X, pdf.y)
  pdf.y += 3

  // Main charge line
  doc.setTextColor(...COLOR.textPrimary)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const pricingDesc =
    data.event.pricingModel === 'per_person'
      ? `Private chef service (${data.event.guestCount} guests)`
      : 'Private chef service (flat rate)'
  doc.text(pricingDesc, colXDesc, pdf.y)
  doc.text(
    data.event.quotedPriceCents ? cents(data.event.quotedPriceCents) : 'TBD',
    colXAmt,
    pdf.y,
    { align: 'right' }
  )
  pdf.y += 5

  // Gratuity line (if any)
  if (data.event.tipAmountCents > 0) {
    doc.text('Gratuity', colXDesc, pdf.y)
    doc.text(cents(data.event.tipAmountCents), colXAmt, pdf.y, { align: 'right' })
    pdf.y += 5
  }

  // Total line
  doc.setLineWidth(0.3)
  doc.line(leftX, pdf.y, LETTER_WIDTH - MARGIN_X, pdf.y)
  pdf.y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  const totalCents = (data.event.quotedPriceCents ?? 0) + data.event.tipAmountCents
  doc.text('Total', colXDesc, pdf.y)
  doc.text(cents(totalCents), colXAmt, pdf.y, { align: 'right' })
  pdf.y += 6

  // ===== PAYMENTS RECEIVED =====
  const payments = data.ledger.filter((l) => !l.isRefund && l.amountCents > 0)
  const refunds = data.ledger.filter((l) => l.isRefund || l.amountCents < 0)

  if (payments.length > 0) {
    pdf.sectionHeader('PAYMENTS RECEIVED', FONT.sectionHeader.size, true)
    pdf.space(1)

    // Table header
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR.textSecondary)
    doc.text('Date', leftX, pdf.y)
    doc.text('Method', leftX + 45, pdf.y)
    doc.text('Description', leftX + 80, pdf.y)
    doc.text('Amount', colXAmt, pdf.y, { align: 'right' })
    pdf.y += 2
    doc.setDrawColor(...COLOR.borderPrimary)
    doc.line(leftX, pdf.y, LETTER_WIDTH - MARGIN_X, pdf.y)
    pdf.y += 3

    doc.setTextColor(...COLOR.textPrimary)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    for (const entry of payments) {
      if (pdf.wouldOverflow(6)) {
        pdf.newPage()
      }
      const dateStr = entry.receivedAt ? formatDate(entry.receivedAt) : 'N/A'
      const method = entry.paymentMethod.charAt(0).toUpperCase() + entry.paymentMethod.slice(1)

      // Truncate description to fit
      const desc =
        entry.description.length > 30 ? entry.description.slice(0, 28) + '..' : entry.description

      doc.text(dateStr, leftX, pdf.y)
      doc.text(method, leftX + 45, pdf.y)
      doc.text(desc, leftX + 80, pdf.y)
      doc.text(cents(entry.amountCents), colXAmt, pdf.y, { align: 'right' })
      pdf.y += 4.5
    }

    // Refund entries
    if (refunds.length > 0) {
      pdf.space(1)
      for (const entry of refunds) {
        if (pdf.wouldOverflow(6)) {
          pdf.newPage()
        }
        const dateStr = entry.receivedAt ? formatDate(entry.receivedAt) : 'N/A'
        doc.setTextColor(180, 0, 0) // red for refunds
        doc.text(dateStr, leftX, pdf.y)
        doc.text('Refund', leftX + 45, pdf.y)
        doc.text(entry.description.slice(0, 28), leftX + 80, pdf.y)
        doc.text(`-${cents(Math.abs(entry.amountCents))}`, colXAmt, pdf.y, { align: 'right' })
        doc.setTextColor(...COLOR.textPrimary)
        pdf.y += 4.5
      }
    }

    pdf.space(2)
  }

  // ===== BALANCE SUMMARY =====
  pdf.sectionHeader('BALANCE', FONT.sectionHeader.size, true)
  pdf.space(2)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  renderKeyValue(doc, leftX, pdf.y, 'Total Charges', cents(totalCents))
  pdf.y += 5
  renderKeyValue(doc, leftX, pdf.y, 'Total Paid', cents(data.financial.totalPaidCents))
  pdf.y += 5

  // Balance due line (bold, larger)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  const balanceDue = data.financial.outstandingBalanceCents
  const balanceLabel = balanceDue <= 0 ? 'PAID IN FULL' : `Balance Due: ${cents(balanceDue)}`

  if (balanceDue <= 0) {
    doc.setTextColor(0, 120, 0) // green
  } else {
    doc.setTextColor(180, 0, 0) // red
  }
  doc.text(balanceLabel, leftX, pdf.y)
  doc.setTextColor(...COLOR.textPrimary)
  pdf.y += 8

  // ===== TERMS & FOOTER =====
  if (data.chef.invoicePaymentTerms) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR.textSecondary)
    doc.text(`Payment Terms: ${data.chef.invoicePaymentTerms}`, leftX, pdf.y)
    pdf.y += 4
  }

  if (data.chef.invoiceFooterNote) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...COLOR.textMuted)
    const lines = doc.splitTextToSize(data.chef.invoiceFooterNote, CONTENT_WIDTH) as string[]
    for (const line of lines) {
      if (pdf.wouldOverflow(4)) break
      doc.text(line, leftX, pdf.y)
      pdf.y += 3.5
    }
  }

  doc.setTextColor(...COLOR.textPrimary)
}

// ─── Inline Render Helpers ────────────────────────────────────────────────────

function renderLabel(doc: jsPDF, x: number, y: number, label: string): number {
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR.textSecondary)
  doc.text(label, x, y)
  doc.setTextColor(...COLOR.textPrimary)
  return y + 4
}

function renderLine(
  doc: jsPDF,
  x: number,
  y: number,
  text: string,
  style: 'normal' | 'bold' = 'normal'
): number {
  doc.setFontSize(9)
  doc.setFont('helvetica', style)
  doc.setTextColor(...COLOR.textPrimary)
  doc.text(text, x, y)
  return y + 4
}

function renderKeyValue(doc: jsPDF, x: number, y: number, label: string, value: string) {
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLOR.textSecondary)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR.textPrimary)
  doc.text(value, x + 50, y)
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function generateInvoicePdf(tenantId: string, eventId: string): Promise<Buffer> {
  const data = await fetchInvoiceData(tenantId, eventId)
  if (!data) throw new Error('Cannot generate invoice: event not found or missing data')

  const eventDateStr = formatDate(data.event.eventDate)
  const pdf = new PDFLayout({
    docType: 'invoice',
    clientName: data.client.fullName,
    eventDate: eventDateStr,
  })

  renderInvoice(pdf, data)
  pdf.standardFooter('INVOICE')
  return pdf.toBuffer()
}
