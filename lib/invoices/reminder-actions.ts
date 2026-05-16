'use server'

// Payment Reminder Actions
// Sends gentle "balance due" reminders (not full PDF re-sends).
// Callable from CIL finance analyzer triggers or manual UI buttons.
// Delegates to the React email template via sendPaymentReminderEmail.

import { createServerClient } from '@/lib/db/server'
import { sendPaymentReminderEmail } from '@/lib/email/notifications'
import { getInvoiceDataByTenant } from '@/lib/events/invoice-actions'

const REMINDER_GAP_DAYS = 3

/**
 * Returns ISO date of last payment reminder sent for this event, or null.
 */
export async function getLastReminderSent(
  eventId: string,
  tenantId: string
): Promise<string | null> {
  const db: any = createServerClient()
  const { data } = await db
    .from('invoice_sends')
    .select('created_at')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .eq('sent_by', 'reminder')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data?.created_at ?? null
}

/**
 * Send a payment reminder email for an overdue invoice.
 * Uses admin/tenant scoping (no auth session required).
 * Enforces minimum 3-day gap between reminders.
 */
export async function sendPaymentReminder(
  eventId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  // Check spam guard
  const lastSent = await getLastReminderSent(eventId, tenantId)
  if (lastSent) {
    const gapMs = Date.now() - new Date(lastSent).getTime()
    const gapDays = gapMs / (1000 * 60 * 60 * 24)
    if (gapDays < REMINDER_GAP_DAYS) {
      return { success: false, error: 'Reminder already sent recently' }
    }
  }

  // Fetch invoice data
  const invoiceData = await getInvoiceDataByTenant(eventId, tenantId)
  if (!invoiceData) {
    return { success: false, error: 'Invoice data not found' }
  }
  if (!invoiceData.client.email) {
    return { success: false, error: 'Client has no email on file' }
  }
  if (invoiceData.isPaidInFull) {
    return { success: false, error: 'Invoice is already paid in full' }
  }

  // Calculate days until event for urgency tier
  const eventDateMs = new Date(invoiceData.event.eventDate).getTime()
  const nowMs = Date.now()
  const daysUntilEvent = Math.max(0, Math.ceil((eventDateMs - nowMs) / (1000 * 60 * 60 * 24)))

  try {
    // Delegate to the React template-based payment reminder email
    await sendPaymentReminderEmail({
      clientEmail: invoiceData.client.email,
      clientName: invoiceData.client.displayName,
      chefName: invoiceData.chef.businessName,
      occasion: invoiceData.event.occasion ?? 'your event',
      eventDate: invoiceData.event.eventDate,
      daysUntilEvent,
      amountDueCents: invoiceData.balanceDueCents,
      depositAmountCents: invoiceData.depositAmountCents,
      eventId,
    })

    // Record in invoice_sends
    const db: any = createServerClient()
    await db.from('invoice_sends').insert({
      event_id: eventId,
      tenant_id: tenantId,
      sent_to: invoiceData.client.email,
      cc_to: null,
      sent_by: 'reminder',
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to send reminder' }
  }
}
