'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { computeReferralHealth } from '@/lib/clients/referral-health'
import type { ReferralHealthScore } from '@/lib/clients/referral-health'

export type { ReferralHealthScore }

export async function getReferralHealthData(): Promise<ReferralHealthScore> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  // Fetch all clients with referral info
  const { data: clients, error } = await db
    .from('clients')
    .select('id, referral_source, created_at')
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to fetch clients: ${error.message}`)

  // Fetch last event date per client via events table
  const { data: events } = await db
    .from('events')
    .select('client_id, event_date')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'in_progress'])
    .order('event_date', { ascending: false })

  // Build a map of clientId -> last event date
  const lastEventMap = new Map<string, string>()
  for (const ev of events || []) {
    if (ev.client_id && !lastEventMap.has(ev.client_id)) {
      lastEventMap.set(ev.client_id, ev.event_date)
    }
  }

  // Map clients to the shape computeReferralHealth expects
  // Note: referred_by_client_id is not in the schema; we approximate
  // by checking if referral_source is the id of another client.
  const clientIds = new Set((clients || []).map((c: any) => c.id))

  const mapped = (clients || []).map((c: any) => ({
    id: c.id,
    // referral_source may be a UUID matching another client
    referred_by_client_id:
      c.referral_source && clientIds.has(c.referral_source) ? c.referral_source : null,
    created_at: c.created_at,
    last_event_date: lastEventMap.get(c.id) ?? null,
  }))

  return computeReferralHealth(mapped)
}
