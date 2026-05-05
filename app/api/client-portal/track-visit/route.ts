// POST /api/client-portal/track-visit
// Called from the client portal to notify the chef of client activity.
// Requires client auth. Non-blocking (fire-and-forget).

import { NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  sendClientVisitAlert,
  type ClientVisitEventType,
} from '@/lib/email/client-visit-alert-delivery'

const VALID_EVENT_TYPES: ClientVisitEventType[] = [
  'portal_login',
  'payment_page_visited',
  'proposal_viewed',
  'quote_viewed',
]

export async function POST(request: Request) {
  try {
    const user = await requireClient()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const eventType = body.eventType as string

    if (!eventType || !VALID_EVENT_TYPES.includes(eventType as ClientVisitEventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    const db: any = createServerClient()

    // Get client details + tenant
    const { data: client } = await db
      .from('clients')
      .select('id, full_name, tenant_id')
      .eq('id', user.entityId)
      .single()

    if (!client?.tenant_id) {
      return NextResponse.json({ ok: true }) // Silently skip if no tenant
    }

    // Fire and forget (non-blocking)
    sendClientVisitAlert({
      tenantId: client.tenant_id,
      clientId: client.id,
      clientName: client.full_name || 'A client',
      eventType: eventType as ClientVisitEventType,
    }).catch((err) => {
      console.error('[track-visit] Alert failed (non-blocking):', err)
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    // Non-blocking: never fail the client's page load
    console.error('[track-visit] Error:', err)
    return NextResponse.json({ ok: true })
  }
}
