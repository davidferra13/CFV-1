'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type CollaborationRevenueStats = {
  coHostedEventCount: number
  coHostedRevenueCents: number
  soloEventCount: number
  soloRevenueCents: number
  subcontractIncomeCents: number
  subcontractExpenseCents: number
  referralHandoffsSent: number
  referralHandoffsConverted: number
}

export async function getCollaborationRevenueStats(): Promise<CollaborationRevenueStats> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const chefId = user.entityId

  const [
    collabResult,
    soloResult,
    subIncomeResult,
    subExpenseResult,
    handoffResult,
    conversionResult,
  ] = await Promise.all([
    // Events where this chef is a collaborator (not owner)
    db
      .from('event_collaborators')
      .select('event_id, events!inner(id, status, tenant_id)')
      .eq('chef_id', chefId)
      .eq('status', 'accepted')
      .in('events.status', ['completed', 'confirmed', 'in_progress']),

    // Solo events (owned, no collaborators)
    db
      .from('events')
      .select('id, status')
      .eq('tenant_id', user.tenantId!)
      .in('status', ['completed', 'confirmed', 'in_progress']),

    // Subcontract income (chef is subcontractor for others)
    db
      .from('subcontract_agreements')
      .select('rate_cents, rate_type, estimated_hours')
      .eq('subcontractor_chef_id', chefId)
      .in('status', ['accepted', 'active', 'completed']),

    // Subcontract expenses (chef hired subcontractors)
    db
      .from('subcontract_agreements')
      .select('rate_cents, rate_type, estimated_hours')
      .eq('hiring_chef_id', chefId)
      .in('status', ['accepted', 'active', 'completed']),

    // Handoffs sent
    db
      .from('chef_handoffs')
      .select('id', { count: 'exact', head: true })
      .eq('from_chef_id', chefId),

    // Handoffs converted
    db
      .from('chef_collab_handoff_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('handoff_id', chefId) // This needs to join through handoffs
      .in('status', ['accepted', 'converted']),
  ])

  // Get revenue for co-hosted events
  const collabEvents = (collabResult.data ?? []) as any[]
  const collabEventIds = collabEvents.map((c: any) => c.event_id)

  let coHostedRevenueCents = 0
  if (collabEventIds.length > 0) {
    const { data: collabFinancials } = await db
      .from('event_financial_summary')
      .select('total_revenue_cents')
      .in('event_id', collabEventIds)

    for (const f of collabFinancials ?? []) {
      coHostedRevenueCents += (f as any).total_revenue_cents ?? 0
    }
  }

  // Get IDs of events that have collaborators (to exclude from solo count)
  const { data: eventsWithCollabs } = await db
    .from('event_collaborators')
    .select('event_id')
    .eq('status', 'accepted')

  const collabEventIdSet = new Set([
    ...collabEventIds,
    ...((eventsWithCollabs ?? []) as any[]).map((c: any) => c.event_id),
  ])

  const ownedEvents = (soloResult.data ?? []) as any[]
  const soloEvents = ownedEvents.filter((e: any) => !collabEventIdSet.has(e.id))

  // Get solo revenue
  let soloRevenueCents = 0
  const soloEventIds = soloEvents.map((e: any) => e.id)
  if (soloEventIds.length > 0) {
    const { data: soloFinancials } = await db
      .from('event_financial_summary')
      .select('total_revenue_cents')
      .in('event_id', soloEventIds)

    for (const f of soloFinancials ?? []) {
      soloRevenueCents += (f as any).total_revenue_cents ?? 0
    }
  }

  // Compute subcontract totals
  function computeSubcontractTotal(agreements: any[]): number {
    let total = 0
    for (const a of agreements) {
      if (a.rate_type === 'flat') {
        total += a.rate_cents ?? 0
      } else if (a.rate_type === 'hourly') {
        total += (a.rate_cents ?? 0) * (Number(a.estimated_hours) || 0)
      }
    }
    return total
  }

  const subcontractIncomeCents = computeSubcontractTotal(subIncomeResult.data ?? [])
  const subcontractExpenseCents = computeSubcontractTotal(subExpenseResult.data ?? [])

  // Count handoffs properly - need to count via chef_handoffs
  const handoffsSent = handoffResult.count ?? 0

  // For conversions, query through handoffs table
  let handoffsConverted = 0
  if (handoffsSent > 0) {
    const { data: myHandoffs } = await db
      .from('chef_handoffs')
      .select('id')
      .eq('from_chef_id', chefId)

    if (myHandoffs && myHandoffs.length > 0) {
      const handoffIds = (myHandoffs as any[]).map((h: any) => h.id)
      const { count } = await db
        .from('chef_collab_handoff_recipients')
        .select('id', { count: 'exact', head: true })
        .in('handoff_id', handoffIds)
        .in('status', ['accepted', 'converted'])

      handoffsConverted = count ?? 0
    }
  }

  return {
    coHostedEventCount: collabEventIds.length,
    coHostedRevenueCents,
    soloEventCount: soloEvents.length,
    soloRevenueCents,
    subcontractIncomeCents,
    subcontractExpenseCents,
    referralHandoffsSent: handoffsSent,
    referralHandoffsConverted: handoffsConverted,
  }
}
