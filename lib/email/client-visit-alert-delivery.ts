// Client Visit Alert Delivery
// Sends a real-time notification email to the chef when a client visits the portal.
// Debounced per 30-minute session to avoid spamming.

import { createAdminClient } from '@/lib/db/admin'
import { sendEmail } from '@/lib/email/send'
import React from 'react'
import { ClientVisitAlertEmail } from '@/lib/email/templates/client-visit-alert'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

// In-memory debounce (30 min per client+tenant pair)
const recentAlerts = new Map<string, number>()
const DEBOUNCE_MS = 30 * 60 * 1000

function isDebounced(key: string): boolean {
  const lastSent = recentAlerts.get(key)
  if (!lastSent) return false
  return Date.now() - lastSent < DEBOUNCE_MS
}

function markSent(key: string): void {
  recentAlerts.set(key, Date.now())
  // Cleanup old entries every 100 marks
  if (recentAlerts.size > 500) {
    const cutoff = Date.now() - DEBOUNCE_MS
    for (const [k, v] of recentAlerts) {
      if (v < cutoff) recentAlerts.delete(k)
    }
  }
}

export type ClientVisitEventType =
  | 'portal_login'
  | 'payment_page_visited'
  | 'proposal_viewed'
  | 'quote_viewed'

/**
 * Notify the chef that a client is active on the portal.
 * Non-blocking, debounced per 30-min session per client.
 */
export async function sendClientVisitAlert(params: {
  tenantId: string
  clientId: string
  clientName: string
  eventType: ClientVisitEventType
}): Promise<boolean> {
  const { tenantId, clientId, clientName, eventType } = params
  const debounceKey = `${tenantId}:${clientId}`

  if (isDebounced(debounceKey)) {
    return false
  }

  try {
    const db: any = createAdminClient()

    // Get chef email and name
    const { data: chef } = await db
      .from('chefs')
      .select('email, display_name, business_name')
      .eq('id', tenantId)
      .single()

    if (!chef?.email) return false

    const chefName = chef.display_name || chef.business_name || 'Chef'
    const clientUrl = `${APP_URL}/clients/${clientId}`

    const sent = await sendEmail({
      to: chef.email,
      subject: `${clientName} is on your site`,
      react: React.createElement(ClientVisitAlertEmail, {
        chefName,
        clientName,
        eventType,
        clientUrl,
      }),
    })

    if (sent) {
      markSent(debounceKey)
    }

    return sent
  } catch (err) {
    console.error('[client-visit-alert] Failed to send:', err)
    return false
  }
}
