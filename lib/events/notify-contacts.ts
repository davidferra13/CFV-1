// Event Contact Notification Helper
// Sends notification emails to event contacts with receives_notifications=true.
// Non-blocking: errors are logged, never thrown.
// This is NOT a 'use server' file; it is called internally from transitions and webhooks.

import { sendEmail } from '@/lib/email/send'
import { createElement } from 'react'
import { EventContactNotificationEmail } from '@/lib/email/templates/event-contact-notification'

type NotifyEventContactsParams = {
  eventId: string
  tenantId: string
  subject: string
  headline: string
  details: string
}

/**
 * Fetch event contacts with receives_notifications=true and send each one
 * a simple notification email. Fully non-blocking: catches all errors.
 */
export async function notifyEventContacts({
  eventId,
  tenantId,
  subject,
  headline,
  details,
}: NotifyEventContactsParams): Promise<void> {
  try {
    const { createServerClient } = await import('@/lib/db/server')
    const db: any = createServerClient({ admin: true })

    const { data: contacts, error } = await db
      .from('event_contacts')
      .select('contact_name, contact_email, role')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .eq('receives_notifications', true)

    if (error || !contacts || contacts.length === 0) return

    for (const contact of contacts) {
      if (!contact.contact_email) continue
      try {
        await sendEmail({
          to: contact.contact_email,
          subject: `[ChefFlow] ${subject}`,
          react: createElement(EventContactNotificationEmail, {
            contactName: contact.contact_name,
            role: contact.role,
            headline,
            details,
          }),
        })
      } catch (emailErr) {
        console.error(
          `[non-blocking] Event contact notification failed for ${contact.contact_email}:`,
          emailErr
        )
      }
    }
  } catch (err) {
    console.error('[non-blocking] Event contact notification failed:', err)
  }
}
