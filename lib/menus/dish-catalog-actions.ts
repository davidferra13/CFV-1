'use server'

// Dish Catalog Actions - query layer for dish-level menu assembly
// Search, filter, detail, popular, complementary dish queries.
// All tenant-scoped, auth-gated.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { escapeLikePattern } from '@/lib/db/escape-like'
import type { AssemblyDishInfo } from './assembly-types'

// ============================================
// SEARCH DISHES
// ============================================

/**
 * Search the dish catalog with filters for assembly.
 * Returns active, non-archived dishes by default.
 */
export async function searchDishes(
  tenantId: string,
  filters?: {
    query?: string
    cuisine?: string
    course?: string
    dietary?: string
    limit?: number
    offset?: number
    includeResting?: boolean
  }
): Promise<{ dishes: AssemblyDishInfo[]; total: number }> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new Error('Tenant mismatch')
  }

  const db: any = createServerClient()
  const limit = Math.min(filters?.limit ?? 50, 100)
  const offset = filters?.offset ?? 0

  let query = db
    .from('dish_index')
    .select('id, name, course, description, dietary_tags, allergen_flags, times_served, is_signature, season_affinity, rotation_status, linked_recipe_id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('archived', false)

  // By default only active dishes; optionally include resting
  if (filters?.includeResting) {
    query = query.in('rotation_status', ['active', 'resting'])
  } else {
    query = query.eq('rotation_status', 'active')
  }

  if (filters?.query) {
    query = query.ilike('name', `%${escapeLikePattern(filters.query)}%`)
  }

  if (filters?.course) {
    query = query.eq('course', filters.course)
  }

  if (filters?.dietary) {
    query = query.contains('dietary_tags', [filters.dietary])
  }

  // Sort by times_served descending (most proven first)
  query = query.order('times_served', { ascending: false })
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to search dishes: ${error.message}`)
  }

  const dishes: AssemblyDishInfo[] = (data ?? []).map(mapDishRow)

  return { dishes, total: count ?? 0 }
}

// ============================================
// GET DISH DETAILS
// ============================================

/**
 * Full dish info with recipe link and components.
 */
export async function getDishDetails(
  tenantId: string,
  dishId: string
): Promise<AssemblyDishInfo & { components: Array<{ id: string; name: string; category: string; description: string | null }> }> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new Error('Tenant mismatch')
  }

  const db: any = createServerClient()

  const { data: dish, error } = await db
    .from('dish_index')
    .select('id, name, course, description, dietary_tags, allergen_flags, times_served, is_signature, season_affinity, rotation_status, linked_recipe_id')
    .eq('id', dishId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !dish) {
    throw new Error('Dish not found')
  }

  const { data: components } = await db
    .from('dish_index_components')
    .select('id, name, category, description')
    .eq('dish_id', dishId)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  return {
    ...mapDishRow(dish),
    components: (components ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      description: c.description ?? null,
    })),
  }
}

// ============================================
// GET POPULAR DISHES
// ============================================

/**
 * Most-used dishes across menus, ranked by times_served.
 */
export async function getPopularDishes(
  tenantId: string,
  limit = 10
): Promise<AssemblyDishInfo[]> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new Error('Tenant mismatch')
  }

  const db: any = createServerClient()
  const cap = Math.min(limit, 50)

  const { data, error } = await db
    .from('dish_index')
    .select('id, name, course, description, dietary_tags, allergen_flags, times_served, is_signature, season_affinity, rotation_status, linked_recipe_id')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .eq('rotation_status', 'active')
    .gt('times_served', 0)
    .order('times_served', { ascending: false })
    .limit(cap)

  if (error) {
    throw new Error(`Failed to fetch popular dishes: ${error.message}`)
  }

  return (data ?? []).map(mapDishRow)
}

// ============================================
// GET COMPLEMENTARY DISHES
// ============================================

/**
 * Dishes frequently paired with the current selection.
 * Uses dish_appearances co-occurrence: find menus containing any of the
 * selected dishes, then rank other dishes by how often they appear in
 * those same menus. Excludes dishes already in currentDishIds.
 */
export async function getComplementaryDishes(
  tenantId: string,
  currentDishIds: string[],
  limit = 5
): Promise<Array<{ dish: AssemblyDishInfo; coOccurrences: number }>> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new Error('Tenant mismatch')
  }

  if (currentDishIds.length === 0) {
    return []
  }

  const db: any = createServerClient()

  // Step 1: Find all menu_ids and menu_upload_job_ids where any selected dish appeared
  const { data: appearances, error: appError } = await db
    .from('dish_appearances')
    .select('menu_id, menu_upload_job_id')
    .eq('tenant_id', tenantId)
    .in('dish_id', currentDishIds)

  if (appError || !appearances || appearances.length === 0) {
    return []
  }

  const menuIds = Array.from(new Set(
    appearances.map((a: any) => a.menu_id).filter(Boolean) as string[]
  ))
  const jobIds = Array.from(new Set(
    appearances.map((a: any) => a.menu_upload_job_id).filter(Boolean) as string[]
  ))

  if (menuIds.length === 0 && jobIds.length === 0) {
    return []
  }

  // Step 2: Find other dishes that appeared in those same menus
  // Use menu_id first (more reliable), fall back to job_id
  let coQuery = db
    .from('dish_appearances')
    .select('dish_id')
    .eq('tenant_id', tenantId)

  if (menuIds.length > 0) {
    coQuery = coQuery.in('menu_id', menuIds)
  } else {
    coQuery = coQuery.in('menu_upload_job_id', jobIds)
  }

  const { data: coAppearances, error: coError } = await coQuery

  if (coError || !coAppearances) {
    return []
  }

  // Step 3: Count co-occurrences, exclude current selection
  const excludeSet = new Set(currentDishIds)
  const counts: Record<string, number> = {}

  for (const row of coAppearances) {
    if (excludeSet.has(row.dish_id)) continue
    counts[row.dish_id] = (counts[row.dish_id] || 0) + 1
  }

  // Step 4: Sort by count, take top N
  const topIds = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, Math.min(limit, 10))
    .map(([id]) => id)

  if (topIds.length === 0) {
    return []
  }

  // Step 5: Fetch dish details for the top candidates
  const { data: dishDetails, error: detailError } = await db
    .from('dish_index')
    .select('id, name, course, description, dietary_tags, allergen_flags, times_served, is_signature, season_affinity, rotation_status, linked_recipe_id')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .in('id', topIds)

  if (detailError || !dishDetails) {
    return []
  }

  // Step 6: Build result preserving co-occurrence ranking
  const dishMap = new Map<string, any>()
  for (const d of dishDetails) {
    dishMap.set(d.id, d)
  }

  return topIds
    .filter((id) => dishMap.has(id))
    .map((id) => ({
      dish: mapDishRow(dishMap.get(id)),
      coOccurrences: counts[id],
    }))
}

// ============================================
// HELPERS
// ============================================

function mapDishRow(row: any): AssemblyDishInfo {
  return {
    id: row.id,
    name: row.name,
    course: row.course,
    description: row.description ?? null,
    dietaryTags: (row.dietary_tags ?? []).filter(Boolean),
    allergenFlags: (row.allergen_flags ?? []).filter(Boolean),
    timesServed: row.times_served ?? 0,
    isSignature: row.is_signature ?? false,
    seasonAffinity: (row.season_affinity ?? []).filter(Boolean),
    rotationStatus: row.rotation_status ?? 'active',
    linkedRecipeId: row.linked_recipe_id ?? null,
  }
}
