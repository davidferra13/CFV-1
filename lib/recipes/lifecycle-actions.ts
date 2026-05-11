// Recipe Lifecycle Server Actions
// Status transitions, forking, archiving, and lineage queries.
// Enforces tenant scoping. All mutations require chef auth.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { invalidateRemyContextCache } from '@/lib/ai/remy-context'

// ============================================
// TYPES
// ============================================

type RecipeStatus = 'stub' | 'draft' | 'active' | 'archived'

/** Allowed status transitions. Each key maps to the set of valid target statuses. */
const ALLOWED_TRANSITIONS: Record<RecipeStatus, RecipeStatus[]> = {
  stub: ['draft'],
  draft: ['active', 'archived'],
  active: ['archived'],
  archived: ['active'],
}

// ============================================
// 1. TRANSITION RECIPE STATUS
// ============================================

export async function transitionRecipeStatus(recipeId: string, newStatus: RecipeStatus) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch current recipe (tenant-scoped)
  const { data: recipe, error: fetchError } = await db
    .from('recipes')
    .select('id, status, archived')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !recipe) {
    console.error('[transitionRecipeStatus] Recipe not found:', fetchError)
    throw new Error('Recipe not found')
  }

  const currentStatus = recipe.status as RecipeStatus
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || []

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition recipe from "${currentStatus}" to "${newStatus}". ` +
        `Allowed transitions: ${allowed.join(', ') || 'none'}.`
    )
  }

  // Build update payload
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_by: user.id,
  }

  if (newStatus === 'archived') {
    updateData.archived = true
    updateData.archived_at = new Date().toISOString()
  } else if (currentStatus === 'archived' && newStatus === 'active') {
    // Restoring from archive
    updateData.archived = false
    updateData.archived_at = null
  }

  const { error } = await db
    .from('recipes')
    .update(updateData)
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[transitionRecipeStatus] Error:', error)
    throw new Error('Failed to update recipe status')
  }

  revalidatePath('/recipes')
  revalidatePath(`/recipes/${recipeId}`)
  invalidateRemyContextCache(user.tenantId!)
  return { success: true, status: newStatus }
}

// ============================================
// 2. CREATE STUB RECIPE
// ============================================

export async function createStubRecipe(
  name: string,
  options?: { menuId?: string; dishId?: string; componentId?: string }
) {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!name || name.trim().length === 0) {
    throw new Error('Recipe name is required')
  }

  // Insert a minimal stub recipe
  const { data: recipe, error } = await db
    .from('recipes')
    .insert({
      tenant_id: user.tenantId!,
      name: name.trim(),
      category: 'other',
      method: '',
      status: 'stub',
      dietary_tags: [],
      equipment: [],
      season: [],
      occasion_tags: [],
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createStubRecipe] Error creating recipe:', error)
    throw new Error('Failed to create stub recipe')
  }

  // If componentId is provided, link the stub recipe to that component
  if (options?.componentId) {
    const { error: linkError } = await db
      .from('components')
      .update({ recipe_id: recipe.id, updated_by: user.id })
      .eq('id', options.componentId)
      .eq('tenant_id', user.tenantId!)

    if (linkError) {
      console.error('[createStubRecipe] Error linking to component:', linkError)
      // Recipe was created; log but do not throw
    }
  }

  revalidatePath('/recipes')
  if (options?.menuId) {
    revalidatePath(`/menus/${options.menuId}`)
  }
  invalidateRemyContextCache(user.tenantId!)
  return { success: true, recipeId: recipe.id }
}

// ============================================
// 3. FORK RECIPE (deep copy with lineage)
// ============================================

export async function forkRecipe(recipeId: string, versionNote?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch the original recipe (tenant-scoped)
  const { data: original, error: fetchError } = await db
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !original) {
    console.error('[forkRecipe] Original recipe not found:', fetchError)
    throw new Error('Recipe not found')
  }

  // Calculate version number: count existing forks of this recipe + 1
  const { data: existingForks, error: countError } = await db
    .from('recipes')
    .select('id')
    .eq('forked_from_id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (countError) {
    console.error('[forkRecipe] Error counting forks:', countError)
    throw new Error('Failed to count existing forks')
  }

  const versionNumber = (existingForks?.length ?? 0) + 2 // original is v1, first fork is v2

  // Build the forked recipe insert
  const forkName = `${original.name} (v${versionNumber})`

  const { data: forkedRecipe, error: insertError } = await db
    .from('recipes')
    .insert({
      tenant_id: user.tenantId!,
      name: forkName,
      category: original.category,
      description: original.description,
      method: original.method || '',
      method_detailed: original.method_detailed,
      yield_description: original.yield_description,
      yield_quantity: original.yield_quantity,
      yield_unit: original.yield_unit,
      prep_time_minutes: original.prep_time_minutes,
      cook_time_minutes: original.cook_time_minutes,
      total_time_minutes: original.total_time_minutes,
      dietary_tags: original.dietary_tags || [],
      notes: original.notes,
      adaptations: original.adaptations,
      servings: original.servings,
      calories_per_serving: original.calories_per_serving,
      difficulty: original.difficulty,
      equipment: original.equipment || [],
      cuisine: original.cuisine,
      meal_type: original.meal_type,
      season: original.season || [],
      occasion_tags: original.occasion_tags || [],
      photo_url: original.photo_url,
      // Lifecycle fields
      status: 'draft',
      forked_from_id: recipeId,
      version_note: versionNote || null,
      version_number: versionNumber,
      // Audit
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[forkRecipe] Error creating fork:', insertError)
    throw new Error('Failed to fork recipe')
  }

  // Copy recipe_ingredients
  const { data: ingredients } = await db
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', recipeId)

  if (ingredients && ingredients.length > 0) {
    const ingredientInserts = ingredients.map((ri: any) => ({
      recipe_id: forkedRecipe.id,
      ingredient_id: ri.ingredient_id,
      quantity: ri.quantity,
      unit: ri.unit,
      preparation_notes: ri.preparation_notes,
      is_optional: ri.is_optional,
      substitution_notes: ri.substitution_notes,
      sort_order: ri.sort_order,
      prep_action: ri.prep_action,
      yield_pct: ri.yield_pct,
    }))

    const { error: ingError } = await db.from('recipe_ingredients').insert(ingredientInserts)

    if (ingError) {
      console.error('[forkRecipe] Error copying ingredients:', ingError)
      // Non-fatal: recipe was created, ingredients failed to copy
    }
  }

  // Copy recipe_sub_recipes (where this recipe is the parent)
  const { data: subRecipes } = await db
    .from('recipe_sub_recipes')
    .select('*')
    .eq('parent_recipe_id', recipeId)

  if (subRecipes && subRecipes.length > 0) {
    const subRecipeInserts = subRecipes.map((sr: any) => ({
      parent_recipe_id: forkedRecipe.id,
      child_recipe_id: sr.child_recipe_id,
      quantity: sr.quantity,
      unit: sr.unit,
      sort_order: sr.sort_order,
      notes: sr.notes,
    }))

    const { error: srError } = await db.from('recipe_sub_recipes').insert(subRecipeInserts)

    if (srError) {
      console.error('[forkRecipe] Error copying sub-recipes:', srError)
      // Non-fatal: recipe was created, sub-recipes failed to copy
    }
  }

  revalidatePath('/recipes')
  revalidatePath(`/recipes/${recipeId}`)
  invalidateRemyContextCache(user.tenantId!)
  return { success: true, recipeId: forkedRecipe.id }
}

// ============================================
// 4. ARCHIVE RECIPE
// ============================================

export async function archiveRecipe(recipeId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify recipe exists and belongs to tenant
  const { data: recipe, error: fetchError } = await db
    .from('recipes')
    .select('id, status, name')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !recipe) {
    console.error('[archiveRecipe] Recipe not found:', fetchError)
    throw new Error('Recipe not found')
  }

  // Guard: warn (but do not block) if linked to active event menus
  let activeEventWarning: string | null = null

  const { data: activeLinks } = await db.rpc('raw_sql', {
    query: `
      SELECT DISTINCT e.id, e.occasion, e.event_date
      FROM components c
      JOIN dishes d ON d.id = c.dish_id
      JOIN menus m ON m.id = d.menu_id
      JOIN events e ON e.id = m.event_id
      WHERE c.recipe_id = $1
        AND c.tenant_id = $2
        AND e.status NOT IN ('completed', 'cancelled')
        AND e.deleted_at IS NULL
        AND m.deleted_at IS NULL
      LIMIT 5
    `,
    params: [recipeId, user.tenantId!],
  })

  if (activeLinks && activeLinks.length > 0) {
    const eventNames = activeLinks.map((e: any) => e.occasion || 'Unnamed event').join(', ')
    activeEventWarning =
      `This recipe is linked to ${activeLinks.length} active event(s): ${eventNames}. ` +
      `Archiving will not remove the link, but the recipe will be marked as archived.`
  }

  // Perform the archive
  const { error } = await db
    .from('recipes')
    .update({
      status: 'archived',
      archived: true,
      archived_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[archiveRecipe] Error:', error)
    throw new Error('Failed to archive recipe')
  }

  revalidatePath('/recipes')
  revalidatePath(`/recipes/${recipeId}`)
  invalidateRemyContextCache(user.tenantId!)
  return { success: true, warning: activeEventWarning }
}

// ============================================
// 5. RESTORE RECIPE
// ============================================

export async function restoreRecipe(recipeId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify recipe exists, is archived, and belongs to tenant
  const { data: recipe, error: fetchError } = await db
    .from('recipes')
    .select('id, status')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !recipe) {
    console.error('[restoreRecipe] Recipe not found:', fetchError)
    throw new Error('Recipe not found')
  }

  if (recipe.status !== 'archived') {
    throw new Error('Only archived recipes can be restored')
  }

  const { error } = await db
    .from('recipes')
    .update({
      status: 'active',
      archived: false,
      archived_at: null,
      updated_by: user.id,
    })
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[restoreRecipe] Error:', error)
    throw new Error('Failed to restore recipe')
  }

  revalidatePath('/recipes')
  revalidatePath(`/recipes/${recipeId}`)
  invalidateRemyContextCache(user.tenantId!)
  return { success: true }
}

// ============================================
// 6. GET RECIPE LINEAGE (fork tree)
// ============================================

export async function getRecipeLineage(recipeId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the recipe itself
  const { data: recipe, error: fetchError } = await db
    .from('recipes')
    .select('id, name, status, forked_from_id, version_number, version_note, created_at')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !recipe) {
    console.error('[getRecipeLineage] Recipe not found:', fetchError)
    throw new Error('Recipe not found')
  }

  // Get parent recipe (if this is a fork)
  let parent: { id: string; name: string; status: string; version_number: number } | null = null
  if (recipe.forked_from_id) {
    const { data: parentData } = await db
      .from('recipes')
      .select('id, name, status, version_number')
      .eq('id', recipe.forked_from_id)
      .eq('tenant_id', user.tenantId!)
      .single()

    parent = parentData || null
  }

  // Get sibling forks (other forks of the same parent)
  let siblings: Array<{
    id: string
    name: string
    status: string
    version_number: number
    created_at: string
  }> = []
  if (recipe.forked_from_id) {
    const { data: siblingData } = await db
      .from('recipes')
      .select('id, name, status, version_number, created_at')
      .eq('forked_from_id', recipe.forked_from_id)
      .eq('tenant_id', user.tenantId!)
      .neq('id', recipeId)
      .order('version_number', { ascending: true })

    siblings = siblingData || []
  }

  // Get child forks (recipes forked from this one)
  const { data: childData } = await db
    .from('recipes')
    .select('id, name, status, version_number, version_note, created_at')
    .eq('forked_from_id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .order('version_number', { ascending: true })

  const children = childData || []

  return {
    current: {
      id: recipe.id,
      name: recipe.name,
      status: recipe.status,
      versionNumber: recipe.version_number,
      versionNote: recipe.version_note,
      forkedFromId: recipe.forked_from_id,
      createdAt: recipe.created_at,
    },
    parent,
    siblings,
    children,
    forkCount: children.length,
  }
}

// ============================================
// 7. GET RECIPE LIFECYCLE STATUS
// ============================================

export async function getRecipeLifecycleStatus(recipeId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: recipe, error: fetchError } = await db
    .from('recipes')
    .select(
      'id, name, status, archived_at, forked_from_id, version_number, version_note, created_at, updated_at'
    )
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !recipe) {
    console.error('[getRecipeLifecycleStatus] Recipe not found:', fetchError)
    throw new Error('Recipe not found')
  }

  // Get the parent recipe name if this is a fork
  let forkedFromName: string | null = null
  if (recipe.forked_from_id) {
    const { data: parentData } = await db
      .from('recipes')
      .select('name')
      .eq('id', recipe.forked_from_id)
      .eq('tenant_id', user.tenantId!)
      .single()

    forkedFromName = parentData?.name || null
  }

  // Count forks of this recipe
  const { data: forks } = await db
    .from('recipes')
    .select('id')
    .eq('forked_from_id', recipeId)
    .eq('tenant_id', user.tenantId!)

  const forkCount = forks?.length ?? 0

  return {
    id: recipe.id,
    name: recipe.name,
    status: recipe.status as RecipeStatus,
    archivedAt: recipe.archived_at,
    forkedFromId: recipe.forked_from_id,
    forkedFromName,
    versionNumber: recipe.version_number,
    versionNote: recipe.version_note,
    forkCount,
    createdAt: recipe.created_at,
    updatedAt: recipe.updated_at,
  }
}
