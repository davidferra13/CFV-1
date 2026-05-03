// Revenue Split - Co-Hosted Event Revenue Distribution
// Calculates and displays how ticket revenue splits between collaborators.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface RevenueSplitConfig {
  eventId: string
  splits: {
    chefId: string
    chefName: string
    role: string
    percentage: number
    amountCents: number
  }[]
  totalRevenueCents: number
  stripeFeesCents: number
  netRevenueCents: number
}

/**
 * Get or calculate the revenue split for a co-hosted event.
 * Default: primary host gets 70%, co-host gets 30%.
 * Can be customized per-event via event_collaborators.revenue_split_pct.
 */
export async function getRevenueSplit(eventId: string): Promise<RevenueSplitConfig | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get event and verify access
  const { data: event } = await db.from('events').select('id, tenant_id').eq('id', eventId).single()

  if (!event) return null

  const isOwner = event.tenant_id === user.entityId

  // Check collaborator access
  if (!isOwner) {
    const { data: collab } = await db
      .from('event_collaborators')
      .select('id')
      .eq('event_id', eventId)
      .eq('chef_id', user.entityId)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!collab) return null
  }

  // Get total revenue
  const { data: tickets } = await db
    .from('event_tickets')
    .select('total_cents')
    .eq('event_id', eventId)
    .eq('payment_status', 'paid')

  const totalRevenueCents = (tickets || []).reduce((s: number, t: any) => s + t.total_cents, 0)

  // Stripe fee estimate (2.9% + 30c per transaction)
  const ticketCount = tickets?.length || 0
  const stripeFeesCents = Math.round(totalRevenueCents * 0.029) + ticketCount * 30
  const netRevenueCents = totalRevenueCents - stripeFeesCents

  // Get collaborators with their split percentages
  const { data: collaborators } = await db
    .from('event_collaborators')
    .select('chef_id, role, revenue_split_pct, chefs(display_name, business_name)')
    .eq('event_id', eventId)
    .eq('status', 'accepted')

  // Get primary host info
  const { data: primaryChef } = await db
    .from('chefs')
    .select('id, display_name, business_name')
    .eq('id', event.tenant_id)
    .single()

  const splits: RevenueSplitConfig['splits'] = []

  if (!collaborators || collaborators.length === 0) {
    // Solo event, all revenue to primary
    splits.push({
      chefId: event.tenant_id,
      chefName: primaryChef?.business_name || primaryChef?.display_name || 'Primary Chef',
      role: 'primary',
      percentage: 100,
      amountCents: netRevenueCents,
    })
  } else {
    // Calculate splits
    let coHostTotalPct = 0
    for (const c of collaborators) {
      const pct = c.revenue_split_pct ?? (c.role === 'co_host' ? 30 : 0)
      coHostTotalPct += pct
      splits.push({
        chefId: c.chef_id,
        chefName: c.chefs?.business_name || c.chefs?.display_name || 'Collaborator',
        role: c.role,
        percentage: pct,
        amountCents: Math.round((netRevenueCents * pct) / 100),
      })
    }

    // Primary gets the remainder
    const primaryPct = Math.max(0, 100 - coHostTotalPct)
    splits.unshift({
      chefId: event.tenant_id,
      chefName: primaryChef?.business_name || primaryChef?.display_name || 'Primary Chef',
      role: 'primary',
      percentage: primaryPct,
      amountCents: Math.round((netRevenueCents * primaryPct) / 100),
    })
  }

  return {
    eventId,
    splits,
    totalRevenueCents,
    stripeFeesCents,
    netRevenueCents,
  }
}

/**
 * Mark a collaborator's revenue split as settled (paid out).
 * Only the event owner can settle splits.
 */
export async function settleRevenueSplit(input: {
  eventId: string
  collaboratorChefId: string
  method?: string // 'venmo', 'check', 'cash', 'zelle', 'bank_transfer'
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id')
    .eq('id', input.eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!event) return { success: false, error: 'Only the event owner can settle splits' }

  // Record settlement on the collaborator row
  const { error } = await db
    .from('event_collaborators')
    .update({
      revenue_settled: true,
      revenue_settled_at: new Date().toISOString(),
      revenue_settled_method: input.method || null,
      revenue_settled_notes: input.notes || null,
    })
    .eq('event_id', input.eventId)
    .eq('chef_id', input.collaboratorChefId)
    .eq('status', 'accepted')

  if (error) return { success: false, error: 'Failed to record settlement' }

  return { success: true }
}

/**
 * Get settlement status for all collaborators on an event.
 */
export async function getSettlementStatus(eventId: string): Promise<{
  splits: {
    chefId: string
    chefName: string
    settled: boolean
    settledAt: string | null
    method: string | null
  }[]
} | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db.from('events').select('tenant_id').eq('id', eventId).single()

  if (!event) return null

  const isOwner = event.tenant_id === user.entityId
  if (!isOwner) {
    const { data: collab } = await db
      .from('event_collaborators')
      .select('id')
      .eq('event_id', eventId)
      .eq('chef_id', user.entityId)
      .eq('status', 'accepted')
      .maybeSingle()
    if (!collab) return null
  }

  const { data: collaborators } = await db
    .from('event_collaborators')
    .select(
      'chef_id, revenue_settled, revenue_settled_at, revenue_settled_method, chefs(display_name, business_name)'
    )
    .eq('event_id', eventId)
    .eq('status', 'accepted')

  return {
    splits: (collaborators || []).map((c: any) => ({
      chefId: c.chef_id,
      chefName: c.chefs?.business_name || c.chefs?.display_name || 'Collaborator',
      settled: c.revenue_settled === true,
      settledAt: c.revenue_settled_at || null,
      method: c.revenue_settled_method || null,
    })),
  }
}
