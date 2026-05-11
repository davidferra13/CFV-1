// Autopilot Server Actions
// Queue management: detect, draft, approve+send, dismiss.
// AI policy: Remy drafts. Chef approves. System sends. Never auto-sends.

'use server'

import { createElement } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/send'
import { NotificationGenericEmail } from '@/lib/email/templates/notification-generic'
import { detectPendingClientUpdates, getAutopilotQueueCount } from './detection'
import { generateAutopilotDraft } from './draft-generator'
import type { PendingClientUpdate, AutopilotDraft } from './types'

export { getAutopilotQueueCount, detectPendingClientUpdates }
export { generateAutopilotDraft }

const ApproveSchema = z.object({
  eventId: z.string().uuid(),
  clientId: z.string().uuid(),
  clientEmail: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(10).max(10_000),
})

const DismissSchema = z.object({
  eventId: z.string().uuid(),
  clientId: z.string().uuid(),
})

/**
 * Approve an autopilot draft and send it to the client.
 * Records the message in the messages table and sends via Resend.
 */
export async function approveAndSendAutopilot(input: {
  eventId: string
  clientId: string
  clientEmail: string
  subject: string
  body: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = ApproveSchema.parse(input)
  const db: any = createServerClient()

  // Fetch chef email for replyTo
  const { data: chef } = await db
    .from('chefs')
    .select('email, display_name, full_name')
    .eq('id', user.tenantId!)
    .single()

  const chefEmail = chef?.email ?? user.email
  const chefName = chef?.display_name ?? chef?.full_name ?? 'Chef'

  // 1. Send the email via Resend
  const sent = await sendEmail({
    to: validated.clientEmail,
    subject: validated.subject,
    react: createElement(NotificationGenericEmail, {
      title: validated.subject,
      body: validated.body,
    }),
    replyTo: chefEmail,
    isTransactional: false,
  })

  if (!sent) {
    return {
      success: false,
      error: 'Email delivery failed. Check suppression list or Resend config.',
    }
  }

  // 2. Log the sent message in the messages table
  const { error: msgError } = await db.from('messages').insert({
    tenant_id: user.tenantId!,
    event_id: validated.eventId,
    client_id: validated.clientId,
    direction: 'outbound',
    channel: 'email',
    status: 'sent',
    subject: validated.subject,
    body: validated.body,
    sent_at: new Date().toISOString(),
    from_user_id: user.id,
  })

  if (msgError) {
    console.error('[autopilot] Failed to log sent message (non-blocking):', msgError)
  }

  // 3. Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'message_sent',
      domain: 'autopilot',
      entityType: 'event',
      entityId: validated.eventId,
      summary: `Autopilot: sent status update to client via email`,
      context: { subject: validated.subject, via: 'autopilot' },
      clientId: validated.clientId,
    })
  } catch {
    // Non-blocking
  }

  revalidatePath('/autopilot')
  return { success: true }
}

/**
 * Dismiss an autopilot item without sending.
 * Creates an internal note so this event won't surface again for 7 days.
 */
export async function dismissAutopilotEvent(input: {
  eventId: string
  clientId: string
}): Promise<{ success: boolean }> {
  const user = await requireChef()
  const validated = DismissSchema.parse(input)
  const db: any = createServerClient()

  // Log a "dismissed" outbound note - resets the 7-day silence window
  await db.from('messages').insert({
    tenant_id: user.tenantId!,
    event_id: validated.eventId,
    client_id: validated.clientId,
    direction: 'outbound',
    channel: 'internal_note',
    status: 'logged',
    subject: null,
    body: 'Autopilot: Chef reviewed and dismissed - no message sent to client',
    sent_at: new Date().toISOString(),
    from_user_id: user.id,
  })

  revalidatePath('/autopilot')
  return { success: true }
}
