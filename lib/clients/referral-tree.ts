'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface ReferralNode {
  clientId: string
  clientName: string
  referredBy: string | null
  referredClients: { id: string; name: string; totalRevenueCents: number }[]
  totalRevenueCents: number
  referralRevenueCents: number
}

export async function getClientReferralTree(clientId: string): Promise<ReferralNode> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: clientRaw } = await db
    .from('clients')
    .select('id, full_name, referral_source')
    .eq('id', clientId)
    .eq('tenant_id', user.entityId)
    .single()

  const client = clientRaw as any
  if (!client) throw new Error('Client not found')

  // Get clients this person referred - using referral_source matching by name as fallback
  // (referred_by_client_id is not in schema; use referral_source text match)
  const { data: referredClientsRaw } = await db
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', user.entityId)
    .eq('referral_source', client.full_name)

  const referredClients = (referredClientsRaw as any[]) || []

  // Get this client's own revenue
  const { data: ownEvents } = await db
    .from('events')
    .select('quoted_price_cents')
    .eq('client_id', clientId)
    .eq('tenant_id', user.entityId)
    .eq('status', 'completed')

  const totalRevenueCents = (ownEvents || []).reduce(
    (sum: any, e: any) => sum + (e.quoted_price_cents || 0),
    0
  )

  // Batch-fetch completed event revenue for all referred clients in one query
  const referredClientIds = referredClients.map((rc: any) => rc.id)
  let referredEventsMap = new Map<string, number>()

  if (referredClientIds.length > 0) {
    const { data: allReferredEvents } = await db
      .from('events')
      .select('client_id, quoted_price_cents')
      .in('client_id', referredClientIds)
      .eq('tenant_id', user.entityId)
      .eq('status', 'completed')

    for (const e of allReferredEvents || []) {
      const prev = referredEventsMap.get(e.client_id) ?? 0
      referredEventsMap.set(e.client_id, prev + (e.quoted_price_cents || 0))
    }
  }

  const referredWithRevenue = referredClients.map((rc: any) => ({
    id: rc.id,
    name: rc.full_name,
    totalRevenueCents: referredEventsMap.get(rc.id) ?? 0,
  }))

  const referralRevenueCents = referredWithRevenue.reduce((sum, r) => sum + r.totalRevenueCents, 0)

  return {
    clientId: client.id,
    clientName: client.full_name,
    referredBy: client.referral_source || null,
    referredClients: referredWithRevenue,
    totalRevenueCents,
    referralRevenueCents,
  }
}
