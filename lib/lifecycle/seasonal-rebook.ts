'use server'

import { createServerClient } from '@/lib/db/server'

export interface SeasonalRebookCandidate {
  eventId: string
  clientId: string
  tenantId: string
  clientName: string
  clientEmail: string | null
  chefName: string | null
  occasion: string | null
  eventDate: string
  daysSinceEvent: number
  guestCount: number | null
}

/**
 * Find events approaching their one-year anniversary (within 60 days).
 * Only includes completed events that were rated 4+ stars.
 * Excludes clients who have suppressed seasonal prompts.
 */
export async function findSeasonalRebookCandidates(
  tenantId: string
): Promise<SeasonalRebookCandidate[]> {
  const db: any = createServerClient({ admin: true })
  const now = new Date()

  // Window: events that happened roughly 305-365 days ago (anniversary in next 60 days)
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - 365)
  const windowEnd = new Date(now)
  windowEnd.setDate(windowEnd.getDate() - 305)

  const { data: events } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, client_id, tenant_id,
      client:clients(id, full_name, email)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', windowStart.toISOString().split('T')[0])
    .lte('event_date', windowEnd.toISOString().split('T')[0])

  if (!events || events.length === 0) return []

  // Get chef name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name')
    .eq('id', tenantId)
    .maybeSingle()

  // Filter: only events with 4+ star rating
  const eventIds = events.map((e: any) => e.id)
  const { data: debriefs } = await db
    .from('event_debriefs')
    .select('event_id, rating')
    .in('event_id', eventIds)
    .gte('rating', 4)

  const ratedEventIds = new Set((debriefs ?? []).map((d: any) => d.event_id))

  // Check for suppressed clients
  const clientIds = [...new Set(events.map((e: any) => e.client_id))]
  const { data: suppressions } = await db
    .from('client_preferences')
    .select('client_id, key, value')
    .in('client_id', clientIds)
    .eq('key', 'seasonal_rebook_suppressed_until')

  const suppressedClients = new Set<string>()
  for (const pref of suppressions ?? []) {
    if (pref.value && new Date(pref.value) > now) {
      suppressedClients.add(pref.client_id)
    }
  }

  const candidates: SeasonalRebookCandidate[] = []

  for (const event of events) {
    if (!ratedEventIds.has(event.id)) continue
    if (suppressedClients.has(event.client_id)) continue

    const client = event.client as any
    if (!client) continue

    const eventDate = new Date(event.event_date)
    const daysSince = Math.floor((now.getTime() - eventDate.getTime()) / 86400000)

    candidates.push({
      eventId: event.id,
      clientId: event.client_id,
      tenantId: event.tenant_id,
      clientName: client.full_name ?? 'Client',
      clientEmail: client.email ?? null,
      chefName: chef?.display_name ?? null,
      occasion: event.occasion ?? null,
      eventDate: event.event_date,
      daysSinceEvent: daysSince,
      guestCount: event.guest_count ?? null,
    })
  }

  return candidates
}

/**
 * Suppress seasonal rebook prompts for a client for 11 months.
 * Called when client clicks "Not this year".
 */
export async function suppressSeasonalRebook(
  clientId: string,
  tenantId: string
): Promise<{ success: boolean }> {
  const db: any = createServerClient({ admin: true })

  const suppressUntil = new Date()
  suppressUntil.setMonth(suppressUntil.getMonth() + 11)

  const { error } = await db.from('client_preferences').upsert(
    {
      client_id: clientId,
      tenant_id: tenantId,
      key: 'seasonal_rebook_suppressed_until',
      value: suppressUntil.toISOString(),
    },
    { onConflict: 'client_id,tenant_id,key' }
  )

  if (error) {
    console.error('[suppressSeasonalRebook] Error:', error)
    return { success: false }
  }

  return { success: true }
}

/**
 * Check if the chef has disabled seasonal prompts for a specific client.
 */
export async function isSeasonalRebookEnabled(
  clientId: string,
  tenantId: string
): Promise<boolean> {
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('client_preferences')
    .select('value')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .eq('key', 'seasonal_rebook_disabled')
    .maybeSingle()

  // Enabled by default; only disabled if explicitly set to 'true'
  return data?.value !== 'true'
}

/**
 * Toggle seasonal rebook prompts for a client (chef action).
 */
export async function toggleSeasonalRebook(
  clientId: string,
  tenantId: string,
  enabled: boolean
): Promise<{ success: boolean }> {
  const db: any = createServerClient({ admin: true })

  const { error } = await db.from('client_preferences').upsert(
    {
      client_id: clientId,
      tenant_id: tenantId,
      key: 'seasonal_rebook_disabled',
      value: enabled ? 'false' : 'true',
    },
    { onConflict: 'client_id,tenant_id,key' }
  )

  if (error) {
    console.error('[toggleSeasonalRebook] Error:', error)
    return { success: false }
  }

  return { success: true }
}
