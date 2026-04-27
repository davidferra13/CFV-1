'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { ChefTransitionEmail } from '@/lib/email/templates/chef-transition'

type SendChefTransitionInput = {
  eventId: string
  newChefName: string
  personalNote: string | null
}

export async function sendChefTransitionEmail(
  input: SendChefTransitionInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const rows = await pgClient`
    SELECT
      e.occasion,
      e.event_date,
      c.full_name AS client_name,
      c.preferred_name AS client_preferred_name,
      c.email AS client_email,
      ch.business_name AS chef_business_name,
      ch.full_name AS chef_name
    FROM events e
    JOIN clients c ON c.id = e.client_id
    JOIN chefs ch ON ch.id = e.tenant_id
    WHERE e.id = ${input.eventId}::uuid
      AND e.tenant_id = ${tenantId}
  `

  if (!rows.length) {
    return { success: false, error: 'Event not found' }
  }

  const ev = rows[0] as Record<string, unknown>
  const clientEmail = ev.client_email as string | null
  if (!clientEmail) {
    return { success: false, error: 'Client has no email address' }
  }

  const clientDisplayName =
    (ev.client_preferred_name as string) || (ev.client_name as string)?.split(' ')[0] || 'there'
  const chefDisplayName =
    (ev.chef_business_name as string) || (ev.chef_name as string) || 'Your chef'

  const dateFormatted = new Date(ev.event_date as string).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const occasion = (ev.occasion as string) || 'upcoming'

  try {
    await sendEmail({
      to: clientEmail,
      subject: `Update about your ${occasion} event on ${dateFormatted}`,
      react: ChefTransitionEmail({
        clientName: clientDisplayName,
        originalChefName: chefDisplayName,
        newChefName: input.newChefName,
        occasion,
        eventDate: dateFormatted,
        personalNote: input.personalNote,
      }),
    })
  } catch (err) {
    console.error('[send-chef-transition] Email send failed:', err)
    return { success: false, error: 'Failed to send email' }
  }

  return { success: true }
}
