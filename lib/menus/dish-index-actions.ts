// Dish Index - Server Actions
// CRUD, search, dedup, analytics for the master dish catalog
// All queries are tenant-scoped. All data stays local.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { canonicalizeDishName } from './dish-index-constants'

// ============================================
// SCHEMAS
// ============================================

const CreateDishIndexSchema = z.object({
  name: z.string().min(1, 'Dish name is required'),
  course: z.string().min(1, 'Course is required'),
  description: z.string().optional(),
  dietary_tags: z.array(z.string()).default([]),
  allergen_flags: z.array(z.string()).default([]),
  prep_complexity: z.enum(['quick', 'moderate', 'intensive']).optional(),
  can_prep_ahead: z.boolean().optional(),
  special_equipment: z.array(z.string()).default([]),
  plating_difficulty: z.enum(['simple', 'moderate', 'architectural']).optional(),
  is_signature: z.boolean().default(false),
  season_affinity: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  first_served: z.string().optional(),
  last_served: z.string().optional(),
})

const UpdateDishIndexSchema = z.object({
  name: z.string().min(1).optional(),
  course: z.string().optional(),
  description: z.string().optional(),
  dietary_tags: z.array(z.string()).optional(),
  allergen_flags: z.array(z.string()).optional(),
  prep_complexity: z.enum(['quick', 'moderate', 'intensive']).nullable().optional(),
  can_prep_ahead: z.boolean().nullable().optional(),
  special_equipment: z.array(z.string()).optional(),
  plating_difficulty: z.enum(['simple', 'moderate', 'architectural']).nullable().optional(),
  is_signature: z.boolean().optional(),
  rotation_status: z.enum(['active', 'resting', 'retired', 'testing']).optional(),
  retirement_reason: z.string().optional(),
  season_affinity: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  dna: z.record(z.string(), z.unknown()).optional(),
  linked_recipe_id: z.string().uuid().nullable().optional(),
})

const DishFeedbackSchema = z.object({
  dish_id: z.string().uuid(),
  event_id: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  client_reaction: z.string().optional(),
  execution_notes: z.string().optional(),
  would_serve_again: z.boolean().default(true),
})

export type CreateDishIndexInput = z.infer<typeof CreateDishIndexSchema>
export type UpdateDishIndexInput = z.infer<typeof UpdateDishIndexSchema>

// ============================================
// DISH INDEX CRUD
// ============================================

/**
 * Create a new dish in the index (manual entry).
 */
export async function createDishIndexEntry(input: CreateDishIndexInput) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const parsed = CreateDishIndexSchema.parse(input)
  const supabase: any = createServerClient()

  const canonical = canonicalizeDishName(parsed.name)

  // Check for existing dish with same canonical name + course
  const { data: existing } = await supabase
    .from('dish_index')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('canonical_name', canonical)
    .eq('course', parsed.course)
    .maybeSingle()

  if (existing) {
    return { error: `A dish named "${existing.name}" already exists as ${parsed.course}` }
  }

  const { data, error } = await (supabase as any)
    .from('dish_index')
    .insert({
      tenant_id: tenantId,
      name: parsed.name,
      canonical_name: canonical,
      course: parsed.course,
      description: parsed.description || null,
      dietary_tags: parsed.dietary_tags,
      allergen_flags: parsed.allergen_flags,
      prep_complexity: parsed.prep_complexity || null,
      can_prep_ahead: parsed.can_prep_ahead ?? null,
      special_equipment: parsed.special_equipment,
      plating_difficulty: parsed.plating_difficulty || null,
      is_signature: parsed.is_signature,
      season_affinity: parsed.season_affinity,
      tags: parsed.tags,
      notes: parsed.notes || null,
      first_served: parsed.first_served || null,
      last_served: parsed.last_served || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create dish: ${error.message}`)

  revalidatePath('/culinary/dish-index')
  return { id: data.id }
}

/**
 * Get all dishes in the index with optional filtering and sorting.
 */
export async function getDishIndex(filters?: {
  search?: string
  course?: string
  rotation_status?: string
  has_recipe?: boolean
  is_signature?: boolean
  season?: string
  tags?: string[]
  sort_by?: 'name' | 'times_served' | 'last_served' | 'created_at' | 'avg_rating'
  sort_dir?: 'asc' | 'desc'
  limit?: number
  offset?: number
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('dish_index')
    .select(
      `
      *,
      recipes:linked_recipe_id(id, name, category, calories_per_serving)
    `,
      { count: 'exact' }
    )
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)

  // Apply filters
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }
  if (filters?.course) {
    query = query.eq('course', filters.course)
  }
  if (filters?.rotation_status) {
    query = query.eq('rotation_status', filters.rotation_status)
  }
  if (filters?.has_recipe === true) {
    query = query.not('linked_recipe_id', 'is', null)
  } else if (filters?.has_recipe === false) {
    query = query.is('linked_recipe_id', null)
  }
  if (filters?.is_signature) {
    query = query.eq('is_signature', true)
  }
  if (filters?.season) {
    query = query.contains('season_affinity', [filters.season])
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags)
  }

  // Sorting
  const sortBy = filters?.sort_by ?? 'times_served'
  const sortDir = filters?.sort_dir ?? 'desc'
  query = query.order(sortBy, { ascending: sortDir === 'asc' })

  // Pagination
  if (filters?.limit) {
    const from = filters.offset ?? 0
    query = query.range(from, from + filters.limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to fetch dish index: ${error.message}`)
  return { dishes: data ?? [], total: count ?? 0 }
}

/**
 * Get a single dish by ID with full details.
 */
export async function getDishById(dishId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('dish_index')
    .select(
      `
      *,
      recipes:linked_recipe_id(
        id,
        name,
        category,
        prep_time_minutes,
        cook_time_minutes,
        servings,
        calories_per_serving,
        protein_per_serving_g,
        fat_per_serving_g,
        carbs_per_serving_g
      )
    `
    )
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) throw new Error(`Dish not found: ${error.message}`)
  return data
}

/**
 * Update a dish in the index.
 */
export async function updateDishIndexEntry(dishId: string, input: UpdateDishIndexInput) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const parsed = UpdateDishIndexSchema.parse(input)
  const supabase: any = createServerClient()

  const updates: Record<string, unknown> = { ...parsed }

  // If name changed, update canonical_name too
  if (parsed.name) {
    updates.canonical_name = canonicalizeDishName(parsed.name)
  }

  // If retiring, set retired_at
  if (parsed.rotation_status === 'retired') {
    updates.retired_at = new Date().toISOString()
  } else if (parsed.rotation_status) {
    updates.retired_at = null
    updates.retirement_reason = null
  }

  const { error } = await supabase
    .from('dish_index')
    .update(updates)
    .eq('id', dishId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to update dish: ${error.message}`)

  revalidatePath('/culinary/dish-index')
  revalidatePath(`/culinary/dish-index/${dishId}`)
}

/**
 * Archive a dish (soft delete).
 */
export async function archiveDish(dishId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('dish_index')
    .update({ archived: true })
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to archive dish: ${error.message}`)
  revalidatePath('/culinary/dish-index')
}

/**
 * Restore an archived dish.
 */
export async function restoreDish(dishId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('dish_index')
    .update({ archived: false })
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to restore dish: ${error.message}`)
  revalidatePath('/culinary/dish-index')
}

/**
 * Link a recipe to a dish.
 */
export async function linkRecipeToDish(dishId: string, recipeId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('dish_index')
    .update({ linked_recipe_id: recipeId })
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to link recipe: ${error.message}`)
  revalidatePath('/culinary/dish-index')
  revalidatePath(`/culinary/dish-index/${dishId}`)
}

/**
 * Unlink a recipe from a dish.
 */
export async function unlinkRecipeFromDish(dishId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('dish_index')
    .update({ linked_recipe_id: null })
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to unlink recipe: ${error.message}`)
  revalidatePath('/culinary/dish-index')
  revalidatePath(`/culinary/dish-index/${dishId}`)
}

// ============================================
// APPEARANCES
// ============================================

/**
 * Get all appearances for a dish.
 */
export async function getDishAppearances(dishId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('dish_appearances')
    .select('*')
    .eq('dish_id', dishId)
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: false, nullsFirst: false })

  if (error) throw new Error(`Failed to fetch appearances: ${error.message}`)
  return data ?? []
}

/**
 * Get dishes served to a specific client (for collision detection).
 */
export async function getClientDishHistory(clientName: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('dish_appearances')
    .select(
      `
      *,
      dish:dish_id(id, name, course, description)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('client_name', clientName)
    .order('event_date', { ascending: false })

  if (error) throw new Error(`Failed to fetch client history: ${error.message}`)
  return data ?? []
}

/**
 * Add a manual appearance (for dishes added without upload).
 */
export async function addDishAppearance(input: {
  dish_id: string
  event_date?: string
  event_type?: string
  client_name?: string
  event_id?: string
  menu_id?: string
  variation_notes?: string
}) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { error } = await supabase.from('dish_appearances').insert({
    dish_id: input.dish_id,
    tenant_id: tenantId,
    event_date: input.event_date || null,
    event_type: input.event_type || null,
    client_name: input.client_name || null,
    event_id: input.event_id || null,
    menu_id: input.menu_id || null,
    variation_notes: input.variation_notes || null,
  })

  if (error) throw new Error(`Failed to add appearance: ${error.message}`)

  // Update dish times_served and dates
  const { data: dish } = await supabase
    .from('dish_index')
    .select('times_served, first_served, last_served')
    .eq('id', input.dish_id)
    .eq('tenant_id', tenantId)
    .single()

  if (dish) {
    const updates: Record<string, unknown> = {
      times_served: dish.times_served + 1,
    }
    if (input.event_date) {
      if (!dish.first_served || input.event_date < dish.first_served) {
        updates.first_served = input.event_date
      }
      if (!dish.last_served || input.event_date > dish.last_served) {
        updates.last_served = input.event_date
      }
    }
    await supabase
      .from('dish_index')
      .update(updates)
      .eq('id', input.dish_id)
      .eq('tenant_id', tenantId)
  }

  revalidatePath('/culinary/dish-index')
  revalidatePath(`/culinary/dish-index/${input.dish_id}`)
}

// ============================================
// FEEDBACK
// ============================================

/**
 * Add feedback for a dish after an event.
 */
export async function addDishFeedback(input: z.infer<typeof DishFeedbackSchema>) {
  const user = await requireChef()
  const parsed = DishFeedbackSchema.parse(input)
  const supabase: any = createServerClient()

  const { error } = await supabase.from('dish_feedback').insert({
    dish_id: parsed.dish_id,
    tenant_id: user.tenantId!,
    event_id: parsed.event_id || null,
    rating: parsed.rating,
    client_reaction: parsed.client_reaction || null,
    execution_notes: parsed.execution_notes || null,
    would_serve_again: parsed.would_serve_again,
  })

  if (error) throw new Error(`Failed to add feedback: ${error.message}`)
  revalidatePath(`/culinary/dish-index/${parsed.dish_id}`)
}

/**
 * Get all feedback for a dish.
 */
export async function getDishFeedback(dishId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('dish_feedback')
    .select('*')
    .eq('dish_id', dishId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch feedback: ${error.message}`)
  return data ?? []
}

// ============================================
// DEDUPLICATION
// ============================================

/**
 * Find potential duplicate dishes using canonical name similarity.
 * Returns groups of dishes that may be duplicates.
 */
export async function findPotentialDuplicates() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all non-archived dishes
  const { data: dishes, error } = await supabase
    .from('dish_index')
    .select('id, name, canonical_name, course, times_served')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .order('canonical_name')

  if (error) throw new Error(`Failed to fetch dishes: ${error.message}`)
  if (!dishes || dishes.length < 2) return []

  // Group by similar canonical names (simple Levenshtein-like approach)
  const groups: Array<{ dishes: typeof dishes; similarity: number }> = []
  const processed = new Set<string>()

  for (let i = 0; i < dishes.length; i++) {
    if (processed.has(dishes[i].id)) continue

    const group = [dishes[i]]
    for (let j = i + 1; j < dishes.length; j++) {
      if (processed.has(dishes[j].id)) continue
      const sim = similarity(dishes[i].canonical_name, dishes[j].canonical_name)
      if (sim > 0.7) {
        group.push(dishes[j])
        processed.add(dishes[j].id)
      }
    }

    if (group.length > 1) {
      processed.add(dishes[i].id)
      groups.push({
        dishes: group,
        similarity: similarity(group[0].canonical_name, group[1].canonical_name),
      })
    }
  }

  return groups
}

/**
 * Merge two dishes: keep one, transfer appearances from the other, archive the other.
 */
export async function mergeDishes(keepId: string, mergeId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Transfer all appearances from mergeId to keepId
  const { error: transferError } = await supabase
    .from('dish_appearances')
    .update({ dish_id: keepId })
    .eq('dish_id', mergeId)
    .eq('tenant_id', tenantId)

  if (transferError) throw new Error(`Failed to transfer appearances: ${transferError.message}`)

  // Transfer feedback
  await supabase
    .from('dish_feedback')
    .update({ dish_id: keepId })
    .eq('dish_id', mergeId)
    .eq('tenant_id', tenantId)

  // Recalculate times_served for the kept dish
  const { count } = await supabase
    .from('dish_appearances')
    .select('id', { count: 'exact', head: true })
    .eq('dish_id', keepId)
    .eq('tenant_id', tenantId)

  // Get date range
  const { data: dateRange } = await supabase
    .from('dish_appearances')
    .select('event_date')
    .eq('dish_id', keepId)
    .eq('tenant_id', tenantId)
    .not('event_date', 'is', null)
    .order('event_date', { ascending: true })

  const dates = (dateRange ?? []).map((r: any) => r.event_date).filter(Boolean)

  await supabase
    .from('dish_index')
    .update({
      times_served: count ?? 0,
      first_served: dates[0] || null,
      last_served: dates[dates.length - 1] || null,
    })
    .eq('id', keepId)
    .eq('tenant_id', tenantId)

  // Archive the merged dish
  await supabase
    .from('dish_index')
    .update({ archived: true })
    .eq('id', mergeId)
    .eq('tenant_id', tenantId)

  revalidatePath('/culinary/dish-index')
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Get dish index summary stats.
 */
export async function getDishIndexStats() {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: dishes } = await supabase
    .from('dish_index')
    .select('id, course, rotation_status, linked_recipe_id, is_signature, times_served')
    .eq('tenant_id', tenantId)
    .eq('archived', false)

  if (!dishes) return null

  const total = dishes.length
  const withRecipe = dishes.filter((d: any) => d.linked_recipe_id).length
  const signatures = dishes.filter((d: any) => d.is_signature).length
  const byRotation = {
    active: dishes.filter((d: any) => d.rotation_status === 'active').length,
    resting: dishes.filter((d: any) => d.rotation_status === 'resting').length,
    retired: dishes.filter((d: any) => d.rotation_status === 'retired').length,
    testing: dishes.filter((d: any) => d.rotation_status === 'testing').length,
  }

  // Course breakdown
  const byCourse: Record<string, number> = {}
  for (const d of dishes) {
    byCourse[d.course] = (byCourse[d.course] || 0) + 1
  }

  // Top dishes
  const topDishes = [...dishes].sort((a, b) => b.times_served - a.times_served).slice(0, 10)

  return {
    total,
    withRecipe,
    withoutRecipe: total - withRecipe,
    recipeCoverage: total > 0 ? Math.round((withRecipe / total) * 100) : 0,
    signatures,
    byRotation,
    byCourse,
    topDishes,
  }
}

/**
 * Get seasonal distribution of dishes.
 */
export async function getSeasonalDistribution() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('dish_appearances')
    .select('dish_id, event_date')
    .eq('tenant_id', user.tenantId!)
    .not('event_date', 'is', null)

  if (error) throw new Error(`Failed to fetch seasonal data: ${error.message}`)

  const monthCounts: Record<number, number> = {}
  for (const row of data ?? []) {
    if (row.event_date) {
      const month = new Date(row.event_date).getMonth() + 1
      monthCounts[month] = (monthCounts[month] || 0) + 1
    }
  }

  return monthCounts
}

/**
 * Find dishes that pair well together (historical co-occurrence).
 */
export async function getDishPairings(dishId: string, limit = 10) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Get all upload job IDs where this dish appeared
  const { data: appearances } = await supabase
    .from('dish_appearances')
    .select('menu_upload_job_id, menu_id')
    .eq('dish_id', dishId)
    .eq('tenant_id', tenantId)

  if (!appearances || appearances.length === 0) return []

  const jobIds = appearances.map((a: any) => a.menu_upload_job_id).filter(Boolean) as string[]
  const menuIds = appearances.map((a: any) => a.menu_id).filter(Boolean) as string[]

  if (jobIds.length === 0 && menuIds.length === 0) return []

  // Find other dishes that appeared in the same menus
  let query = supabase
    .from('dish_appearances')
    .select('dish_id, dish:dish_id(id, name, course)')
    .eq('tenant_id', tenantId)
    .neq('dish_id', dishId)

  if (jobIds.length > 0) {
    query = query.in('menu_upload_job_id', jobIds)
  }

  const { data: pairings } = await query

  if (!pairings) return []

  // Count co-occurrences
  const counts: Record<string, { dish: unknown; count: number }> = {}
  for (const p of pairings) {
    if (!counts[p.dish_id]) {
      counts[p.dish_id] = { dish: p.dish, count: 0 }
    }
    counts[p.dish_id].count++
  }

  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

// ============================================
// HELPERS
// ============================================

/** Simple string similarity (Sørensen–Dice coefficient) */
function similarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const bigrams = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2)
    bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1)
  }

  let intersectionSize = 0
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2)
    const count = bigrams.get(bigram) || 0
    if (count > 0) {
      bigrams.set(bigram, count - 1)
      intersectionSize++
    }
  }

  return (2 * intersectionSize) / (a.length - 1 + (b.length - 1))
}
