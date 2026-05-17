'use server'

/**
 * Menu Fork Lineage
 *
 * Track parent/child menu relationships for fork trees.
 * Walk ancestor chains up, descendant trees down, surface popular fork sources.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'
import { getForkGeneration } from './provenance-types'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export type ForkReason =
  | 'client_customization'
  | 'chef_iteration'
  | 'template_instantiation'
  | 'proposal_variant'
  | 'seasonal_refresh'

export interface ForkMenuOptions {
  forkReason?: ForkReason
  name?: string
}

export interface LineageNode {
  id: string
  name: string
  forked_from_id: string | null
  fork_generation: number
  fork_reason: string | null
  depth: number
}

// -------------------------------------------------------------------
// forkMenu - create a new menu as a fork of source
// -------------------------------------------------------------------

/**
 * Creates a new menu as a fork of an existing source menu.
 * Sets forked_from_id, fork_generation, and fork_reason on the new row.
 * Does NOT deep-copy dishes/components (use duplicateMenu for that).
 * This is the low-level lineage recorder; duplicateMenu calls this internally.
 */
export async function forkMenu(
  sourceMenuId: string,
  tenantId: string,
  options: ForkMenuOptions = {}
) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch source menu
  const { data: source, error: fetchErr } = await db
    .from('menus')
    .select('id, name, fork_generation, origin_metadata')
    .eq('id', sourceMenuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single()

  if (fetchErr || !source) {
    throw new UnknownAppError('Source menu not found')
  }

  const parentGeneration: number =
    source.fork_generation ?? getForkGeneration(source.origin_metadata)
  const forkReason = options.forkReason ?? 'chef_iteration'
  const newName = options.name ?? `${source.name} (Fork)`

  // Create the forked menu row
  const { data: forked, error: insertErr } = await db
    .from('menus')
    .insert({
      tenant_id: tenantId,
      name: newName,
      forked_from_id: sourceMenuId,
      fork_generation: parentGeneration + 1,
      fork_reason: forkReason,
      origin_type: 'forked',
      origin_metadata: {
        type: 'forked',
        forked_from_id: sourceMenuId,
        fork_generation: parentGeneration + 1,
        fork_reason: forkReason,
      },
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (insertErr || !forked) {
    console.error('[forkMenu] insert error:', insertErr)
    throw new UnknownAppError('Failed to create forked menu')
  }

  revalidatePath('/menus')
  return forked
}

// -------------------------------------------------------------------
// getMenuLineage - ancestor chain (walk up)
// -------------------------------------------------------------------

/**
 * Returns the ancestor chain from the given menu up to its root.
 * Ordered from the menu itself (depth 1) to the root ancestor (highest depth).
 * Bounded at 50 levels to prevent runaway recursion.
 */
export async function getMenuLineage(menuId: string): Promise<LineageNode[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db.rpc('get_menu_ancestor_chain', {
    p_menu_id: menuId,
    p_tenant_id: user.tenantId!,
  })

  // If the RPC doesn't exist yet, fall back to iterative walk
  if (error) {
    return walkAncestors(db, menuId, user.tenantId!)
  }

  return (data ?? []) as LineageNode[]
}

/** Iterative fallback for ancestor walk (no recursive CTE needed). */
async function walkAncestors(db: any, menuId: string, tenantId: string): Promise<LineageNode[]> {
  const chain: LineageNode[] = []
  let currentId: string | null = menuId
  let depth = 1
  const visited = new Set<string>()

  while (currentId && depth <= 50) {
    if (visited.has(currentId)) break
    visited.add(currentId)

    const { data, error }: { data: any; error: any } = await db
      .from('menus')
      .select('id, name, forked_from_id, fork_generation, fork_reason')
      .eq('id', currentId)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) break

    chain.push({
      id: data.id,
      name: data.name,
      forked_from_id: data.forked_from_id,
      fork_generation: data.fork_generation ?? 0,
      fork_reason: data.fork_reason,
      depth,
    })

    currentId = data.forked_from_id
    depth++
  }

  return chain
}

// -------------------------------------------------------------------
// getMenuForks - direct children
// -------------------------------------------------------------------

/**
 * Returns menus that were directly forked from the given menu (one level down).
 */
export async function getMenuForks(menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('menus')
    .select('id, name, fork_generation, fork_reason, created_at, status')
    .eq('forked_from_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getMenuForks] error:', error)
    return []
  }

  return data ?? []
}

// -------------------------------------------------------------------
// getPopularForkSources - menus sorted by fork count
// -------------------------------------------------------------------

/**
 * Returns menus sorted by how many times they have been forked (descending).
 * Useful for surfacing your strongest templates.
 */
export async function getPopularForkSources(
  tenantId: string,
  limit = 10
): Promise<Array<{ id: string; name: string; fork_count: number }>> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Use a subquery to count direct forks per menu
  const { data, error } = await db
    .from('menus')
    .select('id, name')
    .eq('tenant_id', user.tenantId ?? tenantId)
    .is('deleted_at', null)
    .order('times_used', { ascending: false })
    .limit(limit * 3) // Over-fetch, then we'll count forks

  if (error || !data || data.length === 0) return []

  // Count forks for each candidate
  const results: Array<{ id: string; name: string; fork_count: number }> = []

  for (const menu of data) {
    const { count } = await db
      .from('menus')
      .select('id', { count: 'exact', head: true })
      .eq('forked_from_id', menu.id)
      .eq('tenant_id', user.tenantId ?? tenantId)
      .is('deleted_at', null)

    if ((count ?? 0) > 0) {
      results.push({ id: menu.id, name: menu.name, fork_count: count ?? 0 })
    }
  }

  // Sort by fork count descending
  results.sort((a, b) => b.fork_count - a.fork_count)
  return results.slice(0, limit)
}

// -------------------------------------------------------------------
// getMenuForkCount - count of direct children
// -------------------------------------------------------------------

/**
 * Returns count of direct forks (non-deleted) of the given menu.
 */
export async function getMenuForkCount(menuId: string): Promise<number> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { count, error } = await db
    .from('menus')
    .select('id', { count: 'exact', head: true })
    .eq('forked_from_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  if (error) {
    console.error('[getMenuForkCount] error:', error)
    return 0
  }

  return count ?? 0
}
