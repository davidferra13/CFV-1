'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { findCoolingClients } from '@/lib/clients/cooling-alert'
import type { CoolingClient } from '@/lib/clients/cooling-alert'

export type { CoolingClient }

export async function getCoolingClients(): Promise<CoolingClient[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  // Fetch all clients with tier info
  const { data: clients, error } = await db
    .from('clients')
    .select('id, full_name, loyalty_tier')
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to fetch clients: ${error.message}`)

  // Fetch last event date per client
  const { data: events } = await db
    .from('events')
    .select('client_id, event_date')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'in_progress'])
    .order('event_date', { ascending: false })

  const lastEventMap = new Map<string, string>()
  for (const ev of events || []) {
    if (ev.client_id && !lastEventMap.has(ev.client_id)) {
      lastEventMap.set(ev.client_id, ev.event_date)
    }
  }

  const mapped = (clients || []).map((c: any) => ({
    id: c.id,
    name: c.full_name ?? 'Unknown',
    last_event_date: lastEventMap.get(c.id) ?? null,
    tier: c.loyalty_tier ?? null,
    intentionally_inactive: false, // TODO: add column when schema supports it
  }))

  return findCoolingClients(mapped)
}

export async function markIntentionallyInactive(clientId: string): Promise<void> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('clients')
    .select('vibe_notes')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  const currentNotes = existing?.vibe_notes ?? ''
  const marker = '[INTENTIONALLY_INACTIVE]'
  if (currentNotes.includes(marker)) return // already marked

  await db
    .from('clients')
    .update({ vibe_notes: `${currentNotes}\n${marker}`.trim() })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
}
