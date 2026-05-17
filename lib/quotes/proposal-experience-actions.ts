// Proposal Experience Builder - Add-Ons, Tradeoffs, and Tier-Based Pricing
// Lets chefs create rich proposals with optional upgrades/downgrades and tiered options.
// Stored in the proposal_experiences table (separate from the drag-and-drop proposal builder).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  ProposalTier,
  ProposalAddOn,
  ProposalTradeoff,
  ProposalExperience,
} from './proposal-builder-types'

// ============================================
// HELPERS
// ============================================

function calculateTotal(
  tiers: ProposalTier[],
  addOns: ProposalAddOn[],
  tradeoffs: ProposalTradeoff[],
  selectedTierId: string | null,
  selectedAddOnIds: string[],
  selectedTradeoffIds: string[]
): number {
  const tier = tiers.find((t) => t.id === selectedTierId)
  if (!tier) return 0

  let total = tier.base_price_cents

  for (const aoId of selectedAddOnIds) {
    const addOn = addOns.find((a) => a.id === aoId)
    if (!addOn) continue
    if (addOn.is_percentage && addOn.percentage_delta !== null) {
      total += Math.round(tier.base_price_cents * (addOn.percentage_delta / 100))
    } else {
      total += addOn.price_delta_cents
    }
  }

  for (const toId of selectedTradeoffIds) {
    const tradeoff = tradeoffs.find((t) => t.id === toId)
    if (!tradeoff) continue
    total += tradeoff.price_delta_cents
  }

  return Math.max(0, total)
}

// ============================================
// 1. CREATE PROPOSAL EXPERIENCE
// ============================================

export async function createProposalExperience(
  eventId: string,
  tiers: ProposalTier[],
  addOns?: ProposalAddOn[],
  tradeoffs?: ProposalTradeoff[]
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify event belongs to tenant
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) {
    return { success: false, error: 'Event not found or access denied' }
  }

  if (!tiers.length) {
    return { success: false, error: 'At least one tier is required' }
  }

  const resolvedAddOns = addOns ?? []
  const resolvedTradeoffs = tradeoffs ?? []

  const { data, error } = await db
    .from('proposal_experiences')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      tiers,
      add_ons: resolvedAddOns,
      tradeoffs: resolvedTradeoffs,
      total_cents: 0,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[proposal-experience] create failed:', error)
    return { success: false, error: 'Failed to create proposal experience' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true, id: data.id }
}

// ============================================
// 2. GET PROPOSAL EXPERIENCE
// ============================================

export async function getProposalExperience(
  proposalId: string
): Promise<{ success: true; data: ProposalExperience } | { success: false; error: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('proposal_experiences')
    .select('*')
    .eq('id', proposalId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) {
    return { success: false, error: 'Proposal not found or access denied' }
  }

  return { success: true, data: mapRow(data) }
}

// ============================================
// 3. GET PROPOSAL FOR EVENT
// ============================================

export async function getProposalForEvent(
  eventId: string
): Promise<{ success: true; data: ProposalExperience } | { success: false; error: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('proposal_experiences')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[proposal-experience] getForEvent failed:', error)
    return { success: false, error: 'Failed to load proposal' }
  }

  if (!data) {
    return { success: false, error: 'No proposal found for this event' }
  }

  return { success: true, data: mapRow(data) }
}

// ============================================
// 4. UPDATE PROPOSAL EXPERIENCE
// ============================================

export async function updateProposalExperience(
  proposalId: string,
  updates: Partial<Pick<ProposalExperience, 'tiers' | 'add_ons' | 'tradeoffs' | 'status'>>
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: existing, error: fetchErr } = await db
    .from('proposal_experiences')
    .select('id, event_id, status')
    .eq('id', proposalId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !existing) {
    return { success: false, error: 'Proposal not found or access denied' }
  }

  if (existing.status === 'accepted') {
    return { success: false, error: 'Cannot modify an accepted proposal' }
  }

  const payload: Record<string, unknown> = {}
  if (updates.tiers !== undefined) payload.tiers = updates.tiers
  if (updates.add_ons !== undefined) payload.add_ons = updates.add_ons
  if (updates.tradeoffs !== undefined) payload.tradeoffs = updates.tradeoffs
  if (updates.status !== undefined) payload.status = updates.status

  if (Object.keys(payload).length === 0) {
    return { success: false, error: 'No updates provided' }
  }

  const { error } = await db
    .from('proposal_experiences')
    .update(payload)
    .eq('id', proposalId)

  if (error) {
    console.error('[proposal-experience] update failed:', error)
    return { success: false, error: 'Failed to update proposal' }
  }

  revalidatePath(`/events/${existing.event_id}`)
  return { success: true }
}

// ============================================
// 5. SELECT PROPOSAL OPTIONS (client picks tier + add-ons + tradeoffs)
// ============================================

export async function selectProposalOptions(
  proposalId: string,
  tierId: string,
  addOnIds: string[],
  tradeoffIds: string[]
): Promise<{ success: true; total_cents: number } | { success: false; error: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: proposal, error: fetchErr } = await db
    .from('proposal_experiences')
    .select('*')
    .eq('id', proposalId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !proposal) {
    return { success: false, error: 'Proposal not found or access denied' }
  }

  const tiers: ProposalTier[] = proposal.tiers ?? []
  const addOns: ProposalAddOn[] = proposal.add_ons ?? []
  const tradeoffs: ProposalTradeoff[] = proposal.tradeoffs ?? []

  // Validate tier exists
  if (!tiers.find((t) => t.id === tierId)) {
    return { success: false, error: 'Invalid tier selection' }
  }

  // Validate add-on IDs exist
  for (const aoId of addOnIds) {
    if (!addOns.find((a) => a.id === aoId)) {
      return { success: false, error: `Invalid add-on: ${aoId}` }
    }
  }

  // Validate tradeoff IDs exist
  for (const toId of tradeoffIds) {
    if (!tradeoffs.find((t) => t.id === toId)) {
      return { success: false, error: `Invalid tradeoff: ${toId}` }
    }
  }

  const totalCents = calculateTotal(tiers, addOns, tradeoffs, tierId, addOnIds, tradeoffIds)

  const { error } = await db
    .from('proposal_experiences')
    .update({
      selected_tier_id: tierId,
      selected_add_on_ids: addOnIds,
      selected_tradeoff_ids: tradeoffIds,
      total_cents: totalCents,
    })
    .eq('id', proposalId)

  if (error) {
    console.error('[proposal-experience] selectOptions failed:', error)
    return { success: false, error: 'Failed to save selections' }
  }

  revalidatePath(`/events/${proposal.event_id}`)
  return { success: true, total_cents: totalCents }
}

// ============================================
// 6. SEND PROPOSAL
// ============================================

export async function sendProposal(
  proposalId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: proposal, error: fetchErr } = await db
    .from('proposal_experiences')
    .select('id, event_id, status, tiers')
    .eq('id', proposalId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !proposal) {
    return { success: false, error: 'Proposal not found or access denied' }
  }

  if (proposal.status === 'accepted') {
    return { success: false, error: 'Proposal already accepted' }
  }

  const tiers: ProposalTier[] = proposal.tiers ?? []
  if (!tiers.length) {
    return { success: false, error: 'Cannot send a proposal with no tiers' }
  }

  const { error } = await db
    .from('proposal_experiences')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', proposalId)

  if (error) {
    console.error('[proposal-experience] send failed:', error)
    return { success: false, error: 'Failed to send proposal' }
  }

  revalidatePath(`/events/${proposal.event_id}`)
  return { success: true }
}

// ============================================
// 7. PROPOSAL ANALYTICS
// ============================================

export async function getProposalAnalytics(): Promise<
  | {
      success: true
      data: {
        total_proposals: number
        acceptance_rate: number
        average_total_cents: number
        popular_add_ons: Array<{ name: string; count: number }>
      }
    }
  | { success: false; error: string }
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: proposals, error } = await db
    .from('proposal_experiences')
    .select('status, total_cents, selected_add_on_ids, add_ons')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[proposal-experience] analytics failed:', error)
    return { success: false, error: 'Failed to load analytics' }
  }

  const rows: Array<{
    status: string
    total_cents: number
    selected_add_on_ids: string[]
    add_ons: ProposalAddOn[]
  }> = proposals ?? []

  const totalProposals = rows.length
  const acceptedCount = rows.filter((r) => r.status === 'accepted').length
  const acceptanceRate = totalProposals > 0 ? acceptedCount / totalProposals : 0

  const acceptedRows = rows.filter((r) => r.status === 'accepted' && r.total_cents > 0)
  const averageTotalCents =
    acceptedRows.length > 0
      ? Math.round(acceptedRows.reduce((sum, r) => sum + r.total_cents, 0) / acceptedRows.length)
      : 0

  // Count add-on usage across accepted proposals
  const addOnCounts = new Map<string, number>()
  const addOnNames = new Map<string, string>()
  for (const row of rows) {
    if (row.status !== 'accepted') continue
    const aoList: ProposalAddOn[] = row.add_ons ?? []
    const selectedIds: string[] = row.selected_add_on_ids ?? []
    for (const aoId of selectedIds) {
      const ao = aoList.find((a) => a.id === aoId)
      if (!ao) continue
      addOnCounts.set(ao.name, (addOnCounts.get(ao.name) ?? 0) + 1)
      addOnNames.set(ao.name, ao.name)
    }
  }

  const popularAddOns = Array.from(addOnCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    success: true,
    data: {
      total_proposals: totalProposals,
      acceptance_rate: Math.round(acceptanceRate * 100) / 100,
      average_total_cents: averageTotalCents,
      popular_add_ons: popularAddOns,
    },
  }
}

// ============================================
// ROW MAPPER
// ============================================

function mapRow(row: Record<string, unknown>): ProposalExperience {
  return {
    id: row.id as string,
    event_id: row.event_id as string,
    tenant_id: row.tenant_id as string,
    tiers: (row.tiers as ProposalTier[]) ?? [],
    add_ons: (row.add_ons as ProposalAddOn[]) ?? [],
    tradeoffs: (row.tradeoffs as ProposalTradeoff[]) ?? [],
    selected_tier_id: (row.selected_tier_id as string) ?? null,
    selected_add_on_ids: (row.selected_add_on_ids as string[]) ?? [],
    selected_tradeoff_ids: (row.selected_tradeoff_ids as string[]) ?? [],
    total_cents: (row.total_cents as number) ?? 0,
    status: (row.status as ProposalExperience['status']) ?? 'draft',
    sent_at: (row.sent_at as string) ?? null,
    viewed_at: (row.viewed_at as string) ?? null,
    accepted_at: (row.accepted_at as string) ?? null,
    created_at: row.created_at as string,
  }
}
