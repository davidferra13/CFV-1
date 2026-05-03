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
