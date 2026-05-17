'use server'

/**
 * Menu Fate Actions
 *
 * Server actions for reading and writing menu fate (business outcomes).
 * All actions are auth-gated and tenant-scoped.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export type MenuFate =
  | 'served'
  | 'abandoned'
  | 'proposed_not_selected'
  | 'superseded'
  | 'recycled'
  | 'approved_unserved'
  | 'client_rejected'
  | 'template_frozen'

export type FateSource = 'auto' | 'manual' | 'scanner'

export interface MenuFateRecord {
  id: string
  fate: MenuFate | null
  fate_reason: string | null
  fate_set_at: string | null
  fate_set_by: FateSource | null
}

export interface FateStats {
  served: number
  abandoned: number
  proposed_not_selected: number
  superseded: number
  recycled: number
  approved_unserved: number
  client_rejected: number
  template_frozen: number
  active: number
  total: number
}

// -------------------------------------------------------------------
// setMenuFate
// -------------------------------------------------------------------

/**
 * Sets the fate on a menu. Records a transition in menu_fate_transitions.
 * Manual overrides are flagged so auto-derivation skips them.
 */
export async function setMenuFate(
  menuId: string,
  fate: MenuFate,
  reason?: string,
  source: FateSource = 'auto',
  triggerType: string = 'manual_override',
  triggerEntityId?: string
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch current menu
  const { data: menu, error: fetchErr } = await db
    .from('menus')
    .select('id, fate, tenant_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .single()

  if (fetchErr || !menu) {
    throw new UnknownAppError('Menu not found')
  }

  const fromFate = menu.fate ?? null
  const now = new Date().toISOString()

  // Update fate on menu
  const { error: updateErr } = await db
    .from('menus')
    .update({
      fate,
      fate_reason: reason ?? null,
      fate_set_at: now,
      fate_set_by: source,
    })
    .eq('id', menuId)

  if (updateErr) {
    console.error('[setMenuFate] update error:', updateErr)
    throw new UnknownAppError('Failed to set menu fate')
  }

  // Record transition
  try {
    await db.from('menu_fate_transitions').insert({
      menu_id: menuId,
      tenant_id: user.tenantId!,
      from_fate: fromFate,
      to_fate: fate,
      source,
      trigger_type: triggerType,
      trigger_entity_id: triggerEntityId ?? null,
      reason: reason ?? null,
      transitioned_by: user.id,
    })
  } catch (err) {
    // Transition log failure is non-blocking
    console.error('[setMenuFate] transition log error:', err)
  }

  revalidatePath('/menus')
  revalidatePath(`/menus/${menuId}`)
}

// -------------------------------------------------------------------
// clearMenuFate (revert to auto-derivation)
// -------------------------------------------------------------------

/**
 * Clears a manual fate override, setting fate back to null.
 * The next auto-derivation pass will re-compute.
 */
export async function clearMenuFate(menuId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: menu, error: fetchErr } = await db
    .from('menus')
    .select('id, fate, tenant_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .single()

  if (fetchErr || !menu) {
    throw new UnknownAppError('Menu not found')
  }

  const fromFate = menu.fate ?? null

  const { error: updateErr } = await db
    .from('menus')
    .update({
      fate: null,
      fate_reason: null,
      fate_set_at: new Date().toISOString(),
      fate_set_by: 'manual',
    })
    .eq('id', menuId)

  if (updateErr) {
    throw new UnknownAppError('Failed to clear menu fate')
  }

  // Record transition
  try {
    if (fromFate) {
      await db.from('menu_fate_transitions').insert({
        menu_id: menuId,
        tenant_id: user.tenantId!,
        from_fate: fromFate,
        to_fate: 'active',
        source: 'manual',
        trigger_type: 'manual_clear',
        reason: 'Chef cleared manual override',
        transitioned_by: user.id,
      })
    }
  } catch {
    // Non-blocking
  }

  revalidatePath('/menus')
  revalidatePath(`/menus/${menuId}`)
}

// -------------------------------------------------------------------
// getMenuFate
// -------------------------------------------------------------------

/**
 * Returns the current fate for a menu.
 */
export async function getMenuFate(menuId: string): Promise<MenuFateRecord | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('menus')
    .select('id, fate, fate_reason, fate_set_at, fate_set_by')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null
  return data as MenuFateRecord
}

// -------------------------------------------------------------------
// getMenusByFate
// -------------------------------------------------------------------

/**
 * Returns menus filtered by a specific fate value.
 */
export async function getMenusByFate(
  tenantId: string,
  fate: MenuFate | null,
  limit = 50
): Promise<Array<{ id: string; name: string; fate: MenuFate | null; updated_at: string }>> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new UnknownAppError('Tenant mismatch')
  }

  const db: any = createServerClient()

  let query = db
    .from('menus')
    .select('id, name, fate, updated_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (fate === null) {
    query = query.is('fate', null)
  } else {
    query = query.eq('fate', fate)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getMenusByFate] error:', error)
    return []
  }

  return data ?? []
}

// -------------------------------------------------------------------
// getMenuFateStats
// -------------------------------------------------------------------

/**
 * Returns aggregate counts of menus by fate for a tenant.
 */
export async function getMenuFateStats(tenantId: string): Promise<FateStats> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new UnknownAppError('Tenant mismatch')
  }

  const db: any = createServerClient()

  // Fetch all non-deleted menus with their fate
  const { data, error } = await db
    .from('menus')
    .select('fate')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  if (error || !data) {
    return {
      served: 0,
      abandoned: 0,
      proposed_not_selected: 0,
      superseded: 0,
      recycled: 0,
      approved_unserved: 0,
      client_rejected: 0,
      template_frozen: 0,
      active: 0,
      total: 0,
    }
  }

  const stats: FateStats = {
    served: 0,
    abandoned: 0,
    proposed_not_selected: 0,
    superseded: 0,
    recycled: 0,
    approved_unserved: 0,
    client_rejected: 0,
    template_frozen: 0,
    active: 0,
    total: data.length,
  }

  for (const row of data as Array<{ fate: string | null }>) {
    if (row.fate === null) {
      stats.active++
    } else if (row.fate in stats) {
      stats[row.fate as keyof Omit<FateStats, 'active' | 'total'>]++
    }
  }

  return stats
}

// -------------------------------------------------------------------
// getMenuFateTimeline
// -------------------------------------------------------------------

/**
 * Returns the fate transition history for a menu.
 */
export async function getMenuFateTimeline(menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('menu_fate_transitions')
    .select('*')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('transitioned_at', { ascending: true })

  if (error) {
    console.error('[getMenuFateTimeline] error:', error)
    return []
  }

  return data ?? []
}
