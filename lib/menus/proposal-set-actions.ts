'use server'

/**
 * Menu Proposal Sets - Server Actions
 *
 * Create, manage, and resolve proposal sets (2-4 menu options per event).
 * All actions enforce auth gate + tenant scoping.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export type ProposalSetStatus = 'draft' | 'sent' | 'chosen' | 'expired'

export interface ProposalSet {
  id: string
  tenant_id: string
  event_id: string
  title: string | null
  status: ProposalSetStatus
  created_at: string
  updated_at: string
}

export interface ProposalSetItem {
  id: string
  proposal_set_id: string
  menu_id: string
  position: number
  label: string | null
  is_chosen: boolean
  client_notes: string | null
  created_at: string
}

// -------------------------------------------------------------------
// createProposalSet
// -------------------------------------------------------------------

/**
 * Create a new proposal set for an event.
 * Starts in 'draft' status.
 */
export async function createProposalSet(
  tenantId: string,
  eventId: string,
  title?: string
): Promise<ProposalSet> {
  const user = await requireChef()

  // Verify tenant match
  if (user.tenantId !== tenantId) {
    throw new UnknownAppError('Tenant mismatch')
  }

  const db: any = createServerClient()

  // Verify event exists and belongs to tenant
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) {
    throw new UnknownAppError('Event not found')
  }

  const { data, error } = await db
    .from('menu_proposal_sets')
    .insert({
      tenant_id: tenantId,
      event_id: eventId,
      title: title ?? null,
      status: 'draft',
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[createProposalSet] error:', error)
    throw new UnknownAppError('Failed to create proposal set')
  }

  revalidatePath(`/events/${eventId}`)
  return data as ProposalSet
}

// -------------------------------------------------------------------
// addMenuToProposalSet
// -------------------------------------------------------------------

/**
 * Add a menu to an existing proposal set.
 * Max 4 items per set. Menu must belong to same tenant.
 */
export async function addMenuToProposalSet(
  proposalSetId: string,
  menuId: string,
  label?: string
): Promise<ProposalSetItem> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch proposal set, verify tenant
  const { data: pset, error: psetErr } = await db
    .from('menu_proposal_sets')
    .select('id, tenant_id, event_id, status')
    .eq('id', proposalSetId)
    .single()

  if (psetErr || !pset) {
    throw new UnknownAppError('Proposal set not found')
  }

  if (pset.tenant_id !== user.tenantId) {
    throw new UnknownAppError('Tenant mismatch')
  }

  if (pset.status !== 'draft') {
    throw new UnknownAppError('Cannot modify a proposal set that is not in draft status')
  }

  // Verify menu exists and belongs to tenant
  const { data: menu, error: menuErr } = await db
    .from('menus')
    .select('id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .single()

  if (menuErr || !menu) {
    throw new UnknownAppError('Menu not found')
  }

  // Check current item count (max 4)
  const { count, error: countErr } = await db
    .from('menu_proposal_set_items')
    .select('id', { count: 'exact', head: true })
    .eq('proposal_set_id', proposalSetId)

  if (countErr) {
    throw new UnknownAppError('Failed to check proposal set item count')
  }

  if ((count ?? 0) >= 4) {
    throw new UnknownAppError('Proposal set already has the maximum of 4 menus')
  }

  // Determine next position
  const nextPosition = count ?? 0

  const { data, error } = await db
    .from('menu_proposal_set_items')
    .insert({
      proposal_set_id: proposalSetId,
      menu_id: menuId,
      position: nextPosition,
      label: label ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[addMenuToProposalSet] error:', error)
    throw new UnknownAppError('Failed to add menu to proposal set')
  }

  revalidatePath(`/events/${pset.event_id}`)
  return data as ProposalSetItem
}

// -------------------------------------------------------------------
// markMenuChosen
// -------------------------------------------------------------------

/**
 * Mark a menu as the chosen option in a proposal set.
 * Sets is_chosen = true on the item, updates set status to 'chosen'.
 */
export async function markMenuChosen(
  proposalSetId: string,
  menuId: string
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch proposal set, verify tenant and status
  const { data: pset, error: psetErr } = await db
    .from('menu_proposal_sets')
    .select('id, tenant_id, event_id, status')
    .eq('id', proposalSetId)
    .single()

  if (psetErr || !pset) {
    throw new UnknownAppError('Proposal set not found')
  }

  if (pset.tenant_id !== user.tenantId) {
    throw new UnknownAppError('Tenant mismatch')
  }

  if (pset.status === 'chosen') {
    throw new UnknownAppError('A menu has already been chosen for this proposal set')
  }

  if (pset.status === 'expired') {
    throw new UnknownAppError('This proposal set has expired')
  }

  // Verify the menu is actually in this set
  const { data: item, error: itemErr } = await db
    .from('menu_proposal_set_items')
    .select('id')
    .eq('proposal_set_id', proposalSetId)
    .eq('menu_id', menuId)
    .single()

  if (itemErr || !item) {
    throw new UnknownAppError('Menu is not part of this proposal set')
  }

  // Mark this item as chosen
  const { error: updateErr } = await db
    .from('menu_proposal_set_items')
    .update({ is_chosen: true })
    .eq('id', item.id)

  if (updateErr) {
    console.error('[markMenuChosen] item update error:', updateErr)
    throw new UnknownAppError('Failed to mark menu as chosen')
  }

  // Update proposal set status to 'chosen'
  const { error: setUpdateErr } = await db
    .from('menu_proposal_sets')
    .update({
      status: 'chosen',
      updated_at: new Date().toISOString(),
    })
    .eq('id', proposalSetId)

  if (setUpdateErr) {
    console.error('[markMenuChosen] set update error:', setUpdateErr)
    throw new UnknownAppError('Failed to update proposal set status')
  }

  revalidatePath(`/events/${pset.event_id}`)
  revalidatePath('/menus')
}

// -------------------------------------------------------------------
// getProposalSetsForEvent
// -------------------------------------------------------------------

/**
 * Get all proposal sets for an event, with their items.
 */
export async function getProposalSetsForEvent(
  tenantId: string,
  eventId: string
): Promise<Array<ProposalSet & { items: ProposalSetItem[] }>> {
  const user = await requireChef()

  if (user.tenantId !== tenantId) {
    throw new UnknownAppError('Tenant mismatch')
  }

  const db: any = createServerClient()

  // Fetch sets
  const { data: sets, error: setsErr } = await db
    .from('menu_proposal_sets')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (setsErr) {
    console.error('[getProposalSetsForEvent] error:', setsErr)
    return []
  }

  if (!sets || sets.length === 0) return []

  // Fetch items for all sets in one query
  const setIds = sets.map((s: any) => s.id)
  const { data: items, error: itemsErr } = await db
    .from('menu_proposal_set_items')
    .select('*')
    .in('proposal_set_id', setIds)
    .order('position', { ascending: true })

  if (itemsErr) {
    console.error('[getProposalSetsForEvent] items error:', itemsErr)
    return sets.map((s: any) => ({ ...s, items: [] }))
  }

  // Group items by set
  const itemsBySet = new Map<string, ProposalSetItem[]>()
  for (const item of items ?? []) {
    const existing = itemsBySet.get(item.proposal_set_id) ?? []
    existing.push(item as ProposalSetItem)
    itemsBySet.set(item.proposal_set_id, existing)
  }

  return sets.map((s: any) => ({
    ...s,
    items: itemsBySet.get(s.id) ?? [],
  }))
}
