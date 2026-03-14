// Generic email router — maps notification RouteInput to an email send.
// Called from channel-router.ts as Phase 2 email dispatch.
// Uses the generic notification template so it works for any action type.

import { createElement } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { sendEmail } from './send'
import { NotificationGenericEmail } from './templates/notification-generic'
import type { RouteInput } from '@/lib/notifications/channel-router'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

/**
 * Resolve the email address for a given auth_user_id.
 * Uses the admin Supabase client to access auth.users.
 */
async function resolveRecipientEmail(authUserId: string): Promise<string | null> {
  try {
    const supabase = createServerClient({ admin: true })
    const { data, error } = await supabase.auth.admin.getUserById(authUserId)
    if (error || !data.user?.email) return null
    return data.user.email
  } catch {
    return null
  }
}

/**
 * Route a notification to email using a generic notification template.
 * Returns true if the email was sent successfully.
 *
 * Note: rich transactional emails (quote-sent, event-confirmed, etc.) are
 * dispatched directly from their respective server actions, not from here.
 * This function handles the channel-router's generic notification emails
 * (e.g., a chef receiving "new_message" or "payment_received" alerts).
 */
export async function routeEmailByAction(input: RouteInput): Promise<boolean> {
  const recipientEmail = await resolveRecipientEmail(input.recipientId)
  if (!recipientEmail) {
    console.warn('[routeEmailByAction] Could not resolve email for recipientId:', input.recipientId)
    return false
  }

  // Resolve a deep-link URL: prefer the provided actionUrl, fall back to the app root
  const actionUrl = input.actionUrl
    ? input.actionUrl.startsWith('http')
      ? input.actionUrl
      : `${APP_URL}${input.actionUrl}`
    : `${APP_URL}/dashboard`

  return sendEmail({
    to: recipientEmail,
    subject: input.title,
    react: createElement(NotificationGenericEmail, {
      title: input.title,
      body: input.body ?? null,
      actionUrl,
    }),
  })
}
