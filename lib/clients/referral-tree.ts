'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

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
  const supabase = createServerClient()

  const { data: clientRaw } = await supabase
    .from('clients')
    .select('id, full_name, referral_source')
    .eq('id', clientId)
    .eq('tenant_id', user.entityId)
    .single()

  const client = clientRaw as any
  if (!client) throw new Error('Client not found')

  // Get clients this person referred — using referral_source matching by name as fallback
  // (referred_by_client_id is not in schema; use referral_source text match)
  const { data: referredClientsRaw } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', user.entityId)
    .eq('referral_source', client.full_name)

  const referredClients = referredClientsRaw as any[] || []

  // Get this client's own revenue
  const { data: ownEvents } = await supabase
    .from('events')
    .select('quoted_price_cents')
    .eq('client_id', clientId)
    .eq('tenant_id', user.entityId)
    .eq('status', 'completed')

  const totalRevenueCents = (ownEvents || []).reduce((sum, e) => sum + (e.quoted_price_cents || 0), 0)

  // For each referred client, fetch their completed event revenue separately
  const referredWithRevenue = await Promise.all((referredClients).map(async (rc: any) => {
    const { data: rcEvents } = await supabase
      .from('events')
      .select('quoted_price_cents')
      .eq('client_id', rc.id)
      .eq('tenant_id', user.entityId)
      .eq('status', 'completed')
    const rev = (rcEvents || []).reduce((sum: number, e: any) => sum + (e.quoted_price_cents || 0), 0)
    return { id: rc.id, name: rc.full_name, totalRevenueCents: rev }
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
