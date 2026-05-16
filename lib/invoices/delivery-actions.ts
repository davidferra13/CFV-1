'use server'

// Invoice Delivery Actions
// Send/resend professional invoice PDFs via email.
// Supports: manual chef send, auto-send on final payment, client portal request.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/send'
import { getInvoiceData, getInvoiceDataByTenant } from '@/lib/events/invoice-actions'
import { generateInvoicePdf } from '@/lib/documents/pdf-generator'
import { InvoiceDeliveryEmail } from '@/lib/email/templates/invoice-delivery'
import { getClientPortalAccess } from '@/lib/client-portal/actions'
import { format } from 'date-fns'

// ─── Types ──────────────────────────────────────────────────────────────────

export type InvoiceDeliveryResult =
  | { status: 'sent'; sentTo: string; record: InvoiceSendHistory }
  | { status: 'error'; message: string }

export type InvoiceSendHistory = {
  id: string
  sentAt: string
  sentTo: string
  ccTo: string | null
  sentBy: 'chef' | 'system' | 'client_request'
}

// ─── Send Invoice (Chef Action) ─────────────────────────────────────────────

/**
 * Chef sends/resends an invoice PDF to the client via email.
 * Optionally CC an accounting address.
 */
export async function sendInvoiceToClient(
  eventId: string,
  options?: { ccEmail?: string }
): Promise<InvoiceDeliveryResult> {
  const user = await requireChef()

  const invoiceData = await getInvoiceData(eventId)
  if (!invoiceData) {
    return { status: 'error', message: 'Invoice not found for this event' }
  }

  if (!invoiceData.client.email) {
    return { status: 'error', message: 'Client has no email address on file' }
  }

  try {
    const pdfBuffer = await generateInvoicePdf(invoiceData)
    const invoiceRef = invoiceData.invoiceNumber ?? 'invoice'
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')

    const recipients: string[] = [invoiceData.client.email]
    if (options?.ccEmail) {
      recipients.push(options.ccEmail)
    }

    await sendEmail({
      to: recipients,
      subject: `Invoice ${invoiceRef} from ${invoiceData.chef.businessName}`,
      react: InvoiceDeliveryEmail({
        clientName: invoiceData.client.displayName,
        chefBusinessName: invoiceData.chef.businessName,
        invoiceNumber: invoiceRef,
        occasion: invoiceData.event.occasion ?? 'your event',
        eventDate: invoiceData.event.formattedDate,
        totalFormatted: formatCents(invoiceData.quotedPriceCents ?? 0),
        balanceDueFormatted: formatCents(invoiceData.balanceDueCents),
        isPaidInFull: invoiceData.isPaidInFull,
      }),
      attachments: [
        {
          filename: `${invoiceRef}-${dateSuffix}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
      isTransactional: true,
    })

    // Record the send in invoice_sends table
    const db: any = createServerClient()
    const { data: inserted } = await db
      .from('invoice_sends')
      .insert({
        event_id: eventId,
        tenant_id: user.tenantId!,
        sent_to: invoiceData.client.email,
        cc_to: options?.ccEmail ?? null,
        sent_by: 'chef',
      })
      .select('id, created_at, sent_to, cc_to, sent_by')
      .single()

    revalidatePath(`/events/${eventId}/invoice`)
    return {
      status: 'sent',
      sentTo: invoiceData.client.email,
      record: {
        id: inserted?.id ?? crypto.randomUUID(),
        sentAt: inserted?.created_at ?? new Date().toISOString(),
        sentTo: inserted?.sent_to ?? invoiceData.client.email,
        ccTo: inserted?.cc_to ?? null,
        sentBy: inserted?.sent_by ?? 'chef',
      },
    }
  } catch (err) {
    console.error('[invoice-delivery] Failed to send invoice', err)
    return { status: 'error', message: 'Failed to send invoice email' }
  }
}

// ─── Auto-Send on Final Payment ─────────────────────────────────────────────

/**
 * Triggered after final payment is confirmed (call from payment webhook/action).
 * Sends the complete invoice PDF automatically.
 * Non-blocking: errors are logged, never thrown.
 */
export async function autoSendInvoiceOnFinalPayment(
  eventId: string,
  tenantId: string
): Promise<void> {
  try {
    const invoiceData = await getInvoiceDataByTenant(eventId, tenantId)
    if (!invoiceData) return
    if (!invoiceData.isPaidInFull) return
    if (!invoiceData.client.email) return

    const pdfBuffer = await generateInvoicePdf(invoiceData)
    const invoiceRef = invoiceData.invoiceNumber ?? 'invoice'
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')

    await sendEmail({
      to: invoiceData.client.email,
      subject: `Invoice ${invoiceRef} - Paid in Full`,
      react: InvoiceDeliveryEmail({
        clientName: invoiceData.client.displayName,
        chefBusinessName: invoiceData.chef.businessName,
        invoiceNumber: invoiceRef,
        occasion: invoiceData.event.occasion ?? 'your event',
        eventDate: invoiceData.event.formattedDate,
        totalFormatted: formatCents(invoiceData.quotedPriceCents ?? 0),
        balanceDueFormatted: '$0.00',
        isPaidInFull: true,
      }),
      attachments: [
        {
          filename: `${invoiceRef}-${dateSuffix}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
      isTransactional: true,
    })

    // Record auto-send
    const db: any = createServerClient({ admin: true })
    await db.from('invoice_sends').insert({
      event_id: eventId,
      tenant_id: tenantId,
      sent_to: invoiceData.client.email,
      cc_to: null,
      sent_by: 'system',
    })
  } catch (err) {
    console.error('[invoice-delivery] Auto-send failed (non-blocking)', err)
  }
}

// ─── Client Portal Invoice Email Request ────────────────────────────────────

/**
 * Client requests their invoice be emailed (from token-based portal).
 * No auth session required; uses portal token for access control.
 */
export async function requestInvoiceEmailFromPortal(
  token: string,
  eventId: string,
  ccEmail?: string
): Promise<InvoiceDeliveryResult> {
  const access = await getClientPortalAccess(token)
  if (!access) {
    return { status: 'error', message: 'Invalid portal access' }
  }

  const db: any = createServerClient({ admin: true })

  // Verify event belongs to this client and tenant
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, client_id')
    .eq('id', eventId)
    .eq('tenant_id', access.tenantId)
    .eq('client_id', access.clientId)
    .single()

  if (!event) {
    return { status: 'error', message: 'Event not found' }
  }

  const invoiceData = await getInvoiceDataByTenant(eventId, access.tenantId)
  if (!invoiceData) {
    return { status: 'error', message: 'Invoice data not available' }
  }

  if (!invoiceData.client.email) {
    return { status: 'error', message: 'No email address on file' }
  }

  try {
    const pdfBuffer = await generateInvoicePdf(invoiceData)
    const invoiceRef = invoiceData.invoiceNumber ?? 'invoice'
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')

    const recipients: string[] = [invoiceData.client.email]
    if (ccEmail) {
      recipients.push(ccEmail)
    }

    await sendEmail({
      to: recipients,
      subject: `Invoice ${invoiceRef} from ${invoiceData.chef.businessName}`,
      react: InvoiceDeliveryEmail({
        clientName: invoiceData.client.displayName,
        chefBusinessName: invoiceData.chef.businessName,
        invoiceNumber: invoiceRef,
        occasion: invoiceData.event.occasion ?? 'your event',
        eventDate: invoiceData.event.formattedDate,
        totalFormatted: formatCents(invoiceData.quotedPriceCents ?? 0),
        balanceDueFormatted: formatCents(invoiceData.balanceDueCents),
        isPaidInFull: invoiceData.isPaidInFull,
      }),
      attachments: [
        {
          filename: `${invoiceRef}-${dateSuffix}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
      isTransactional: true,
    })

    const { data: inserted } = await db
      .from('invoice_sends')
      .insert({
        event_id: eventId,
        tenant_id: access.tenantId,
        sent_to: invoiceData.client.email,
        cc_to: ccEmail ?? null,
        sent_by: 'client_request',
      })
      .select('id, created_at, sent_to, cc_to, sent_by')
      .single()

    return {
      status: 'sent',
      sentTo: invoiceData.client.email,
      record: {
        id: inserted?.id ?? crypto.randomUUID(),
        sentAt: inserted?.created_at ?? new Date().toISOString(),
        sentTo: inserted?.sent_to ?? invoiceData.client.email,
        ccTo: inserted?.cc_to ?? null,
        sentBy: inserted?.sent_by ?? 'client_request',
      },
    }
  } catch (err) {
    console.error('[invoice-delivery] Portal email request failed', err)
    return { status: 'error', message: 'Failed to send invoice email' }
  }
}

// ─── Get Send History ───────────────────────────────────────────────────────

export async function getInvoiceSendHistory(eventId: string): Promise<InvoiceSendHistory[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('invoice_sends')
    .select('id, created_at, sent_to, cc_to, sent_by')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (!data) return []

  return data.map((row: any) => ({
    id: row.id,
    sentAt: row.created_at,
    sentTo: row.sent_to,
    ccTo: row.cc_to,
    sentBy: row.sent_by,
  }))
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
