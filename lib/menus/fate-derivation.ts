/**
 * Menu Fate Derivation Engine
 *
 * Auto-derives the business outcome (fate) of a menu from its context:
 * event status, approval status, fork lineage, proposal sets.
 *
 * This is NOT a server action. It is called internally by event transitions
 * and the fate scanner. The caller decides whether to apply the result.
 */

import { createServerClient } from '@/lib/db/server'
import type { MenuFate } from './fate-actions'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface FateDerivationResult {
  fate: MenuFate
  triggerType: string
  triggerEntityId?: string
  reason?: string
}

interface MenuContext {
  id: string
  tenant_id: string
  event_id: string | null
  status: string
  is_template: boolean
  fate: string | null
  fate_set_by: string | null
  forked_from_id: string | null
  fork_generation: number
  updated_at: string
}

interface EventContext {
  id: string
  status: string
  menu_approval_status: string
}

// -------------------------------------------------------------------
// deriveMenuFate
// -------------------------------------------------------------------

/**
 * Given a menu and optional event context, compute what fate this menu
 * should have. Returns null if no fate can be derived or if manual
 * override is active.
 *
 * Priority order (highest first):
 *   1. served
 *   2. recycled
 *   3. approved_unserved
 *   4. client_rejected
 *   5. proposed_not_selected
 *   6. superseded
 *   7. template_frozen
 *   8. abandoned (scanner only, not returned here)
 */
export async function deriveMenuFate(
  menuId: string,
  triggerType: string,
  triggerEntityId?: string
): Promise<FateDerivationResult | null> {
  const db: any = createServerClient({ admin: true })

  // Fetch menu with full context
  const { data: menu, error: menuErr } = await db
    .from('menus')
    .select('id, tenant_id, event_id, status, is_template, fate, fate_set_by, forked_from_id, fork_generation, updated_at')
    .eq('id', menuId)
    .is('deleted_at', null)
    .single()

  if (menuErr || !menu) return null

  const ctx = menu as MenuContext

  // Manual overrides are sticky; never auto-update
  if (ctx.fate_set_by === 'manual') return null

  // Fetch linked event if present
  let event: EventContext | null = null
  if (ctx.event_id) {
    const { data: ev } = await db
      .from('events')
      .select('id, status, menu_approval_status')
      .eq('id', ctx.event_id)
      .single()
    event = ev as EventContext | null
  }

  // Priority 1: served (event completed)
  if (event?.status === 'completed') {
    return {
      fate: 'served',
      triggerType,
      triggerEntityId: triggerEntityId ?? event.id,
      reason: 'Event completed',
    }
  }

  // Priority 2: recycled (a descendant menu was served)
  const recycled = await checkDescendantServed(db, ctx.id, ctx.tenant_id)
  if (recycled) {
    return {
      fate: 'recycled',
      triggerType: 'descendant_served',
      triggerEntityId: recycled,
      reason: 'A descendant menu was served',
    }
  }

  // Priority 3: approved_unserved (event cancelled after approval)
  if (event?.status === 'cancelled' && event.menu_approval_status === 'approved') {
    return {
      fate: 'approved_unserved',
      triggerType,
      triggerEntityId: triggerEntityId ?? event.id,
      reason: 'Event cancelled after menu was approved',
    }
  }

  // Priority 4: client_rejected
  // Check if the latest approval request was revision_requested with no subsequent approval
  if (event && event.menu_approval_status === 'revision_requested') {
    return {
      fate: 'client_rejected',
      triggerType: 'client_rejected',
      triggerEntityId: triggerEntityId ?? event.id,
      reason: 'Client requested revisions',
    }
  }

  // Priority 5: proposed_not_selected
  // Check if this menu was in a proposal set where another menu was chosen
  const proposalResult = await checkProposalNotSelected(db, ctx.id, ctx.tenant_id)
  if (proposalResult) {
    return {
      fate: 'proposed_not_selected',
      triggerType: 'proposal_decided',
      triggerEntityId: proposalResult,
      reason: 'Another menu was chosen in the proposal set',
    }
  }

  // Priority 6: superseded (a fork of this menu exists and is active or served)
  const superseded = await checkSuperseded(db, ctx.id, ctx.tenant_id)
  if (superseded) {
    return {
      fate: 'superseded',
      triggerType: 'fork_created',
      triggerEntityId: superseded,
      reason: 'A newer version (fork) exists',
    }
  }

  // Priority 7: template_frozen
  if (ctx.is_template) {
    return {
      fate: 'template_frozen',
      triggerType: 'template_saved',
      reason: 'Menu saved as template',
    }
  }

  // Priority 8: abandoned (event cancelled, no approval)
  if (event?.status === 'cancelled') {
    return {
      fate: 'abandoned',
      triggerType,
      triggerEntityId: triggerEntityId ?? event.id,
      reason: 'Event cancelled without menu approval',
    }
  }

  return null
}

// -------------------------------------------------------------------
// applyDerivedFate
// -------------------------------------------------------------------

/**
 * Derives fate for a menu and applies it if a result is found.
 * Non-blocking: catches all errors. Returns true if fate was updated.
 */
export async function applyDerivedFate(
  menuId: string,
  triggerType: string,
  triggerEntityId?: string,
  transitionedBy?: string
): Promise<boolean> {
  try {
    const result = await deriveMenuFate(menuId, triggerType, triggerEntityId)
    if (!result) return false

    const db: any = createServerClient({ admin: true })

    // Fetch current fate for transition record
    const { data: menu } = await db
      .from('menus')
      .select('fate, tenant_id')
      .eq('id', menuId)
      .single()

    if (!menu) return false

    // Skip if fate is already the same
    if (menu.fate === result.fate) return false

    const now = new Date().toISOString()

    // Update menu fate
    await db
      .from('menus')
      .update({
        fate: result.fate,
        fate_reason: result.reason ?? null,
        fate_set_at: now,
        fate_set_by: 'auto',
      })
      .eq('id', menuId)

    // Record transition
    await db.from('menu_fate_transitions').insert({
      menu_id: menuId,
      tenant_id: menu.tenant_id,
      from_fate: menu.fate ?? null,
      to_fate: result.fate,
      source: 'auto',
      trigger_type: result.triggerType,
      trigger_entity_id: result.triggerEntityId ?? null,
      reason: result.reason ?? null,
      transitioned_by: transitionedBy ?? null,
    })

    return true
  } catch (err) {
    console.error('[applyDerivedFate] error:', err)
    return false
  }
}

// -------------------------------------------------------------------
// applyFateForEventMenus
// -------------------------------------------------------------------

/**
 * After an event transition, derive and apply fate for all menus
 * linked to that event. Non-blocking.
 */
export async function applyFateForEventMenus(
  eventId: string,
  triggerType: string
): Promise<void> {
  try {
    const db: any = createServerClient({ admin: true })

    const { data: menus } = await db
      .from('menus')
      .select('id')
      .eq('event_id', eventId)
      .is('deleted_at', null)

    if (!menus || menus.length === 0) return

    for (const menu of menus) {
      await applyDerivedFate(menu.id, triggerType, eventId)
    }

    // If any ancestor menus should become 'recycled', walk up fork chains
    for (const menu of menus) {
      await propagateRecycledUpForkChain(menu.id)
    }
  } catch (err) {
    console.error('[applyFateForEventMenus] error:', err)
  }
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

/**
 * Check if any descendant of this menu (via fork chain) has fate = 'served'.
 * Walk down max 10 levels. Returns the served descendant ID or null.
 */
async function checkDescendantServed(
  db: any,
  menuId: string,
  tenantId: string
): Promise<string | null> {
  const visited = new Set<string>()
  const queue = [menuId]
  let depth = 0

  while (queue.length > 0 && depth < 10) {
    const currentBatch = [...queue]
    queue.length = 0
    depth++

    for (const id of currentBatch) {
      if (visited.has(id)) continue
      visited.add(id)

      const { data: forks } = await db
        .from('menus')
        .select('id, fate')
        .eq('forked_from_id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      if (!forks) continue

      for (const fork of forks) {
        if (fork.fate === 'served') return fork.id
        queue.push(fork.id)
      }
    }
  }

  return null
}

/**
 * Check if this menu was in a proposal set where another menu was chosen.
 * Returns the proposal set ID or null.
 */
async function checkProposalNotSelected(
  db: any,
  menuId: string,
  tenantId: string
): Promise<string | null> {
  // Find proposal set items for this menu
  const { data: items } = await db
    .from('menu_proposal_set_items')
    .select('proposal_set_id, is_chosen')
    .eq('menu_id', menuId)

  if (!items || items.length === 0) return null

  for (const item of items) {
    if (item.is_chosen) continue // This menu was chosen, not rejected

    // Check if the proposal set has status 'chosen' (another menu won)
    const { data: pset } = await db
      .from('menu_proposal_sets')
      .select('id, status, tenant_id')
      .eq('id', item.proposal_set_id)
      .eq('tenant_id', tenantId)
      .eq('status', 'chosen')
      .single()

    if (pset) return pset.id
  }

  return null
}

/**
 * Check if a newer fork of this menu exists (and is active or served).
 * Returns the fork ID or null.
 */
async function checkSuperseded(
  db: any,
  menuId: string,
  tenantId: string
): Promise<string | null> {
  const { data: forks } = await db
    .from('menus')
    .select('id, fate, status')
    .eq('forked_from_id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!forks || forks.length === 0) return null

  const fork = forks[0]
  // Only supersede if the fork is active (no fate yet) or served
  if (fork.fate === null || fork.fate === 'served') {
    return fork.id
  }

  return null
}

/**
 * After a menu becomes 'served', walk up its fork chain and mark
 * ancestors as 'recycled' if they have a negative fate.
 * Capped at 10 levels.
 */
async function propagateRecycledUpForkChain(menuId: string): Promise<void> {
  const db: any = createServerClient({ admin: true })

  // Get the menu
  const { data: menu } = await db
    .from('menus')
    .select('id, fate, forked_from_id, tenant_id')
    .eq('id', menuId)
    .single()

  if (!menu || menu.fate !== 'served' || !menu.forked_from_id) return

  const recyclableFates = ['abandoned', 'client_rejected', 'proposed_not_selected', 'superseded']
  let currentId: string | null = menu.forked_from_id
  let depth = 0

  while (currentId && depth < 10) {
    const { data: ancestor } = await db
      .from('menus')
      .select('id, fate, fate_set_by, forked_from_id, tenant_id')
      .eq('id', currentId)
      .single()

    if (!ancestor) break

    // Skip manual overrides
    if (ancestor.fate_set_by === 'manual') {
      currentId = ancestor.forked_from_id
      depth++
      continue
    }

    // Only recycle if current fate is negative
    if (ancestor.fate && recyclableFates.includes(ancestor.fate)) {
      const now = new Date().toISOString()
      await db
        .from('menus')
        .update({
          fate: 'recycled',
          fate_reason: 'A descendant menu was served',
          fate_set_at: now,
          fate_set_by: 'auto',
        })
        .eq('id', ancestor.id)

      await db.from('menu_fate_transitions').insert({
        menu_id: ancestor.id,
        tenant_id: ancestor.tenant_id,
        from_fate: ancestor.fate,
        to_fate: 'recycled',
        source: 'auto',
        trigger_type: 'descendant_served',
        trigger_entity_id: menuId,
        reason: 'A descendant menu was served',
      })
    }

    currentId = ancestor.forked_from_id
    depth++
  }
}
