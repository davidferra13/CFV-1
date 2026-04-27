'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { ClientRelationshipClosureEmail } from '@/lib/email/templates/client-relationship-closure'
import type { ClosureMode } from '@/lib/clients/relationship-closure-types'

type SendClosureEmailInput = {
  clientId: string
  closureMode: ClosureMode
  personalMessage: string | null
}

const EMAILABLE_MODES: ClosureMode[] = ['transitioning', 'closed']

export async function sendClientRelationshipClosureEmail(
  input: SendClosureEmailInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Only transitioning and closed modes send client-facing emails.
  // do_not_book and legal_hold are silent (internal-only).
  if (!EMAILABLE_MODES.includes(input.closureMode)) {
    return { success: true } // Not an error; just nothing to send
  }

  const rows = await pgClient`
    SELECT
      c.full_name AS client_name,
      c.preferred_name AS client_preferred_name,
      c.email AS client_email,
      ch.business_name AS chef_business_name,
      ch.full_name AS chef_name
    FROM clients c
    JOIN chefs ch ON ch.id = c.tenant_id
    WHERE c.id = ${input.clientId}::uuid
      AND c.tenant_id = ${tenantId}
  `

  if (!rows.length) {
    return { success: false, error: 'Client not found' }
  }

  const row = rows[0] as Record<string, unknown>
  const clientEmail = row.client_email as string | null
  if (!clientEmail) {
    return { success: false, error: 'Client has no email address' }
  }

  const clientDisplayName =
    (row.client_preferred_name as string) || (row.client_name as string)?.split(' ')[0] || 'there'
  const chefDisplayName =
    (row.chef_business_name as string) || (row.chef_name as string) || 'Your chef'

  const subject =
    input.closureMode === 'transitioning'
      ? `A note from ${chefDisplayName}`
      : `Thank you, ${clientDisplayName}`

  try {
    await sendEmail({
      to: clientEmail,
      subject,
      react: ClientRelationshipClosureEmail({
        clientName: clientDisplayName,
        chefName: chefDisplayName,
        closureMode: input.closureMode as 'transitioning' | 'closed',
        personalMessage: input.personalMessage,
      }),
    })
  } catch (err) {
    console.error('[send-closure-email] Email send failed:', err)
    return { success: false, error: 'Failed to send email' }
  }

  return { success: true }
}
