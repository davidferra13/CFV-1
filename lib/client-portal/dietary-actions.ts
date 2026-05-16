'use server'

import { createServerClient } from '@/lib/db/server'
import {
  getGuestDietarySummaryForEvent,
  getEventShareToken,
  type GuestDietarySummary,
} from '@/lib/dinner-circles/guest-dietary-summary'
import { getClientPortalAccess } from './actions'

export type PortalEventDietaryData = {
  eventId: string
  shareUrl: string | null
  dietary: GuestDietarySummary
}

/**
 * Fetch dietary summary for a specific event in the client portal context.
 * Validates the portal token and ensures the event belongs to the client.
 */
export async function getClientPortalDietaryData(
  token: string,
  eventId: string
): Promise<PortalEventDietaryData | null> {
  const access = await getClientPortalAccess(token)
  if (!access) return null

  const { clientId, tenantId } = access
  const db: any = createServerClient({ admin: true })

  // Verify event belongs to this client
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!event) return null

  const [dietary, shareToken] = await Promise.all([
    getGuestDietarySummaryForEvent(eventId, tenantId),
    getEventShareToken(eventId, tenantId),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const shareUrl = shareToken ? `${appUrl}/share/${shareToken}` : null

  return { eventId, shareUrl, dietary }
}

/**
 * Get dietary data for all upcoming events for a client portal token.
 */
export async function getClientPortalAllEventsDietaryData(
  token: string
): Promise<PortalEventDietaryData[]> {
  const access = await getClientPortalAccess(token)
  if (!access) return []

  const { clientId, tenantId } = access
  const db: any = createServerClient({ admin: true })

  const today = new Date().toISOString().split('T')[0]
  const { data: events } = await db
    .from('events')
    .select('id')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .gte('event_date', today)
    .not('status', 'in', '("cancelled","completed")')
    .order('event_date', { ascending: true })
    .limit(5)

  if (!events || events.length === 0) return []

  const results: PortalEventDietaryData[] = []
  for (const event of events) {
    const [dietary, shareToken] = await Promise.all([
      getGuestDietarySummaryForEvent(event.id, tenantId),
      getEventShareToken(event.id, tenantId),
    ])

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
    const shareUrl = shareToken ? `${appUrl}/share/${shareToken}` : null
    results.push({ eventId: event.id, shareUrl, dietary })
  }

  return results
}
