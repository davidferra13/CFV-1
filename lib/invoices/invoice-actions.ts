// Invoice Actions
// Server actions for assembling invoice data, generating PDFs, and sending invoice emails.
// Auth-gated and tenant-scoped.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import type { InvoiceData } from './generate-invoice-pdf'

// ─── Get Invoice Data ─────────────────────────────────────────────────────────

/**
 * Assembles all invoice fields for an event. Auth-gated, tenant-scoped.
 * Returns null if event not found.
 */
export async function getInvoiceData(
  tenantId: string,
  eventId: string
): Promise<InvoiceData | null> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new Error('Tenant mismatch')
  }

  const { fetchInvoiceData } = await import('./generate-invoice-pdf')
  return fetchInvoiceData(tenantId, eventId)
}

// ─── Generate Invoice PDF ─────────────────────────────────────────────────────

/**
 * Generate invoice PDF buffer for an event. Auth-gated.
 * Returns base64-encoded PDF string for client consumption.
 */
export async function generateInvoice(eventId: string): Promise<{ pdf: string; filename: string }> {
  const user = await requireChef()
  const { generateInvoicePdf } = await import('./generate-invoice-pdf')

  const buffer = await generateInvoicePdf(user.tenantId!, eventId)
  const base64 = buffer.toString('base64')

  // Build filename from event data
  const { fetchInvoiceData } = await import('./generate-invoice-pdf')
  const data = await fetchInvoiceData(user.tenantId!, eventId)
  const filename = data
    ? `invoice-${data.invoiceNumber}-${data.client.fullName.replace(/\s+/g, '-').toLowerCase()}.pdf`
    : `invoice-${eventId.slice(0, 8)}.pdf`

  return { pdf: base64, filename }
}

// ─── Send Invoice Email ───────────────────────────────────────────────────────

type SendInvoiceResult = {
  success: boolean
  error?: string
}

/**
 * Send invoice PDF as email attachment to client (or specified recipient).
 * Records delivery in invoice_sends table.
 * Auth-gated, tenant-scoped.
 */
export async function sendInvoiceEmail(
  tenantId: string,
  eventId: string,
  recipientEmail?: string,
  ccEmail?: string
): Promise<SendInvoiceResult> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new Error('Tenant mismatch')
  }

  try {
    // Generate PDF
    const { generateInvoicePdf, fetchInvoiceData } = await import('./generate-invoice-pdf')
    const [pdfBuffer, data] = await Promise.all([
      generateInvoicePdf(tenantId, eventId),
      fetchInvoiceData(tenantId, eventId),
    ])

    if (!data) {
      return { success: false, error: 'Event not found' }
    }

    // Determine recipient
    const toEmail = recipientEmail || data.client.email
    if (!toEmail) {
      return { success: false, error: 'No recipient email address available' }
    }

    // Ensure invoice_number and invoice_issued_at are set on the event
    await ensureInvoiceNumberSet(tenantId, eventId, data.invoiceNumber)

    // Format values for email template
    const eventDate = formatDateSafe(data.event.eventDate)
    const totalCents = (data.event.quotedPriceCents ?? 0) + data.event.tipAmountCents
    const totalFormatted = `$${(totalCents / 100).toFixed(2)}`
    const balanceDueFormatted = `$${(data.financial.outstandingBalanceCents / 100).toFixed(2)}`
    const isPaidInFull = data.financial.outstandingBalanceCents <= 0

    // Build filename
    const filename = `invoice-${data.invoiceNumber}-${data.client.fullName.replace(/\s+/g, '-').toLowerCase()}.pdf`

    // Send email with PDF attachment
    const { sendEmail } = await import('@/lib/email/send')
    const { InvoiceDeliveryEmail } = await import('@/lib/email/templates/invoice-delivery')

    const recipients = ccEmail ? [toEmail, ccEmail] : toEmail

    const sent = await sendEmail({
      to: recipients,
      subject: `Invoice ${data.invoiceNumber} from ${data.chef.businessName}`,
      react: InvoiceDeliveryEmail({
        clientName: data.client.fullName,
        chefBusinessName: data.chef.businessName,
        invoiceNumber: data.invoiceNumber,
        occasion: data.event.occasion || 'your event',
        eventDate,
        totalFormatted,
        balanceDueFormatted,
        isPaidInFull,
      }),
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
      isTransactional: true,
    })

    if (!sent) {
      return { success: false, error: 'Email delivery failed (check logs)' }
    }

    // Record in invoice_sends audit table
    try {
      const db: any = createServerClient()
      await db.from('invoice_sends').insert({
        event_id: eventId,
        tenant_id: tenantId,
        sent_to: toEmail,
        cc_to: ccEmail || null,
        sent_by: 'chef',
      })
    } catch (auditErr) {
      // Non-blocking: email was sent, audit log failure is secondary
      console.error('[sendInvoiceEmail] Audit log failed (non-blocking):', auditErr)
    }

    revalidatePath(`/events/${eventId}`)
    return { success: true }
  } catch (err) {
    console.error('[sendInvoiceEmail] Error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error generating invoice',
    }
  }
}

// ─── Auto-Send Invoice (System Trigger) ───────────────────────────────────────

/**
 * Auto-send invoice after final payment. Called from payment recording flow.
 * Non-blocking: catches all errors internally.
 * Uses 'system' as sent_by in audit log.
 */
export async function autoSendInvoiceOnFinalPayment(
  tenantId: string,
  eventId: string
): Promise<void> {
  try {
    const { generateInvoicePdf, fetchInvoiceData } = await import('./generate-invoice-pdf')
    const [pdfBuffer, data] = await Promise.all([
      generateInvoicePdf(tenantId, eventId),
      fetchInvoiceData(tenantId, eventId),
    ])

    if (!data || !data.client.email) {
      console.info('[autoSendInvoice] Skipped: no data or no client email')
      return
    }

    // Only auto-send if actually paid in full
    if (data.financial.outstandingBalanceCents > 0) {
      console.info('[autoSendInvoice] Skipped: balance still outstanding')
      return
    }

    // Ensure invoice number is set
    await ensureInvoiceNumberSet(tenantId, eventId, data.invoiceNumber)

    const eventDate = formatDateSafe(data.event.eventDate)
    const totalCents = (data.event.quotedPriceCents ?? 0) + data.event.tipAmountCents
    const totalFormatted = `$${(totalCents / 100).toFixed(2)}`
    const filename = `invoice-${data.invoiceNumber}-${data.client.fullName.replace(/\s+/g, '-').toLowerCase()}.pdf`

    const { sendEmail } = await import('@/lib/email/send')
    const { InvoiceDeliveryEmail } = await import('@/lib/email/templates/invoice-delivery')

    await sendEmail({
      to: data.client.email,
      subject: `Invoice ${data.invoiceNumber} from ${data.chef.businessName} (Paid in Full)`,
      react: InvoiceDeliveryEmail({
        clientName: data.client.fullName,
        chefBusinessName: data.chef.businessName,
        invoiceNumber: data.invoiceNumber,
        occasion: data.event.occasion || 'your event',
        eventDate,
        totalFormatted,
        balanceDueFormatted: '$0.00',
        isPaidInFull: true,
      }),
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
      isTransactional: true,
    })

    // Audit log
    const db: any = createServerClient()
    await db.from('invoice_sends').insert({
      event_id: eventId,
      tenant_id: tenantId,
      sent_to: data.client.email,
      sent_by: 'system',
    })

    console.log(
      `[autoSendInvoice] Invoice ${data.invoiceNumber} sent to client for event ${eventId}`
    )
  } catch (err) {
    // Non-blocking: payment success must never fail because of invoice
    console.error('[autoSendInvoice] Failed (non-blocking):', err)
  }
}

// ─── Update Bill To Fields ────────────────────────────────────────────────────

type BillToInput = {
  eventId: string
  billToCompany?: string | null
  billToAttention?: string | null
  billToPoNumber?: string | null
}

/**
 * Update corporate billing fields on an event.
 */
export async function updateBillTo(input: BillToInput): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('events')
    .update({
      bill_to_company: input.billToCompany || null,
      bill_to_attention: input.billToAttention || null,
      bill_to_po_number: input.billToPoNumber || null,
    } as any)
    .eq('id', input.eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update billing info: ${error.message}`)

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Ensure invoice_number and invoice_issued_at are set on the event.
 * Idempotent: skips if already set.
 */
async function ensureInvoiceNumberSet(
  tenantId: string,
  eventId: string,
  invoiceNumber: string
): Promise<void> {
  const db: any = createServerClient()

  // Check if already set
  const { data: event } = await db
    .from('events')
    .select('invoice_number')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (event?.invoice_number) return

  await db
    .from('events')
    .update({
      invoice_number: invoiceNumber,
      invoice_issued_at: new Date().toISOString(),
    } as any)
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
}

function formatDateSafe(iso: string): string {
  try {
    return format(parseISO(dateToDateString(iso)), 'MMMM d, yyyy')
  } catch {
    return iso
  }
}
