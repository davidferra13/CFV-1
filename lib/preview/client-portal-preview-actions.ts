// Client Portal Preview — Chef-scoped server actions
// Fetches the exact same data a client would see, but authenticated as the chef.
// No impersonation — chef session throughout, tenant-scoped at every query.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type PreviewClient = {
  id: string
  full_name: string
  email: string
}

// ─── 1. getPreviewClients ─────────────────────────────────────────────────────
// Returns all clients for the chef's tenant (for the selector dropdown).

export async function getPreviewClients(): Promise<PreviewClient[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('tenant_id', user.tenantId!)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('[getPreviewClients] Error:', error)
    return []
  }

  return data || []
}

// ─── 2. getPreviewClientEvents ────────────────────────────────────────────────
// Events for a specific client, scoped to this chef's tenant.
// Validates client ownership before returning data.

export async function getPreviewClientEvents(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify client belongs to this tenant
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) return []

  const { data: events, error } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, status, quoted_price_cents, location_address, location_city'
    )
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: true })

  if (error) {
    console.error('[getPreviewClientEvents] Error:', error)
    return []
  }

  return events || []
}

// ─── 3. getPreviewClientQuotes ────────────────────────────────────────────────
// Quotes for a specific client, scoped to this chef's tenant.

export async function getPreviewClientQuotes(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify client belongs to this tenant
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) return []

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(
      'id, quote_name, total_quoted_cents, status, created_at, valid_until, deposit_amount_cents, deposit_percentage, pricing_notes, inquiry:inquiries(id, confirmed_occasion)'
    )
    .eq('client_id', clientId)
    .in('status', ['sent', 'accepted', 'rejected'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPreviewClientQuotes] Error:', error)
    return []
  }

  return quotes || []
}

// ─── 4. getPreviewClientLoyaltyStatus ─────────────────────────────────────────
// Loyalty status for a specific client, scoped to this chef's tenant.

export async function getPreviewClientLoyaltyStatus(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, loyalty_points, loyalty_tier, total_events_completed, total_guests_served')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) return null

  const balance = client.loyalty_points ?? 0

  if (balance === 0 && !client.total_events_completed) return null

  const { data: rewards } = await supabase
    .from('loyalty_rewards')
    .select('id, name, points_required, description')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  const allRewards = rewards || []
  const availableRewards = allRewards.filter((r) => r.points_required <= balance)
  const nextReward = allRewards.find((r) => r.points_required > balance)

  return {
    tier: (client.loyalty_tier || 'bronze') as 'bronze' | 'silver' | 'gold' | 'platinum',
    pointsBalance: balance,
    totalEventsCompleted: client.total_events_completed ?? 0,
    availableRewardsCount: availableRewards.length,
    nextReward: nextReward
      ? { name: nextReward.name, pointsNeeded: nextReward.points_required - balance }
      : null,
  }
}
