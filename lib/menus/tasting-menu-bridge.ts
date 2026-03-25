// Tasting Menu Bridge
// Materializes tasting menu courses as real dishes + components in the main menu model
// so all intelligence features (cost, margins, allergens, repeat detection, etc.) work.
//
// NOT a 'use server' file. Called by tasting-menu-actions.ts as an internal helper.

import { revalidatePath } from 'next/cache'

// ============================================
// COURSE TYPE LABELS
// ============================================

const COURSE_TYPE_LABELS: Record<string, string> = {
  amuse_bouche: 'Amuse Bouche',
  appetizer: 'Appetizer',
  soup: 'Soup',
  salad: 'Salad',
  fish: 'Fish Course',
  intermezzo: 'Intermezzo',
  main: 'Main Course',
  cheese: 'Cheese Course',
  pre_dessert: 'Pre-Dessert',
  dessert: 'Dessert',
  mignardise: 'Mignardise',
}

// ============================================
// FULL SYNC
// ============================================

/**
 * Full sync: materialize all tasting menu courses into the main menu engine.
 * Creates or updates a shadow `menus` row, then syncs all courses as dishes + components.
 *
 * Called when a tasting menu is first linked to an event, or for a full re-sync.
 */
export async function syncTastingMenuToEngine(
  db: any,
  tastingMenuId: string,
  tenantId: string,
  userId: string
): Promise<{ materializedMenuId: string }> {
  // 1. Fetch tasting menu with all courses
  const { data: tastingMenu, error: tmErr } = await db
    .from('tasting_menus')
    .select('id, name, event_id, materialized_menu_id, chef_id, price_per_person_cents')
    .eq('id', tastingMenuId)
    .eq('chef_id', tenantId)
    .single()

  if (tmErr || !tastingMenu) {
    throw new Error(`Tasting menu not found: ${tmErr?.message}`)
  }

  const { data: courses } = await db
    .from('tasting_menu_courses')
    .select(
      'id, course_number, course_type, dish_name, description, recipe_id, wine_pairing, pairing_notes, prep_notes'
    )
    .eq('tasting_menu_id', tastingMenuId)
    .order('course_number', { ascending: true })

  const allCourses = courses ?? []

  // 2. Create or update shadow menu
  let materializedMenuId = tastingMenu.materialized_menu_id

  if (!materializedMenuId) {
    // Create new shadow menu
    const { data: newMenu, error: menuErr } = await db
      .from('menus')
      .insert({
        tenant_id: tenantId,
        name: tastingMenu.name,
        event_id: tastingMenu.event_id ?? null,
        status: 'draft',
        is_template: false,
        target_guest_count: null,
        created_by: userId,
        updated_by: userId,
      })
      .select('id')
      .single()

    if (menuErr || !newMenu) {
      throw new Error(`Failed to create shadow menu: ${menuErr?.message}`)
    }

    materializedMenuId = newMenu.id

    // Link back
    await db
      .from('tasting_menus')
      .update({ materialized_menu_id: materializedMenuId })
      .eq('id', tastingMenuId)
      .eq('chef_id', tenantId)
  } else {
    // Update existing shadow menu (name/event may have changed)
    await db
      .from('menus')
      .update({
        name: tastingMenu.name,
        event_id: tastingMenu.event_id ?? null,
        updated_by: userId,
      })
      .eq('id', materializedMenuId)
      .eq('tenant_id', tenantId)
  }

  // 3. Fetch existing materialized dishes for diffing
  const { data: existingDishes } = await db
    .from('dishes')
    .select('id, source_tasting_course_id, course_number')
    .eq('menu_id', materializedMenuId)
    .eq('tenant_id', tenantId)

  const existingBySource = new Map<string, any>()
  for (const d of existingDishes ?? []) {
    if (d.source_tasting_course_id) {
      existingBySource.set(d.source_tasting_course_id, d)
    }
  }

  // 4. Fetch recipe names for courses with recipe_id
  const recipeIds = allCourses.map((c: any) => c.recipe_id).filter(Boolean) as string[]
  const recipeNameMap = new Map<string, string>()
  if (recipeIds.length > 0) {
    const { data: recipes } = await db
      .from('recipes')
      .select('id, name')
      .in('id', [...new Set(recipeIds)])
      .eq('tenant_id', tenantId)

    for (const r of recipes ?? []) {
      recipeNameMap.set(r.id, r.name)
    }
  }

  // 5. Sync each course -> dish + component
  const processedCourseIds = new Set<string>()

  for (const course of allCourses) {
    processedCourseIds.add(course.id)
    const courseName = COURSE_TYPE_LABELS[course.course_type] || course.course_type
    const existing = existingBySource.get(course.id)

    if (existing) {
      // Update existing dish
      await db
        .from('dishes')
        .update({
          course_number: course.course_number,
          course_name: courseName,
          name: course.dish_name,
          description: course.description ?? null,
          chef_notes: course.prep_notes ?? null,
          sort_order: course.course_number,
          updated_by: userId,
        })
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)

      // Sync component (recipe link)
      await syncCourseComponent(db, existing.id, course, tenantId, userId, recipeNameMap)
    } else {
      // Insert new dish
      const { data: newDish, error: dishErr } = await db
        .from('dishes')
        .insert({
          tenant_id: tenantId,
          menu_id: materializedMenuId,
          course_number: course.course_number,
          course_name: courseName,
          name: course.dish_name,
          description: course.description ?? null,
          chef_notes: course.prep_notes ?? null,
          sort_order: course.course_number,
          source_tasting_course_id: course.id,
          created_by: userId,
          updated_by: userId,
        })
        .select('id')
        .single()

      if (dishErr || !newDish) {
        console.error('[tasting-bridge] Failed to create dish:', dishErr?.message)
        continue
      }

      // Create component if recipe is linked
      if (course.recipe_id) {
        const recipeName = recipeNameMap.get(course.recipe_id) ?? course.dish_name
        await db.from('components').insert({
          tenant_id: tenantId,
          dish_id: newDish.id,
          recipe_id: course.recipe_id,
          name: recipeName,
          category: 'other',
          source_tasting_course_id: course.id,
          created_by: userId,
          updated_by: userId,
        })
      }
    }
  }

  // 6. Delete orphaned dishes (courses that were removed from the tasting menu)
  for (const [sourceId, dish] of existingBySource) {
    if (!processedCourseIds.has(sourceId)) {
      // CASCADE will clean up components
      await db.from('dishes').delete().eq('id', dish.id).eq('tenant_id', tenantId)
    }
  }

  revalidatePath('/menus')
  return { materializedMenuId }
}

// ============================================
// SINGLE COURSE SYNC
// ============================================

/**
 * Sync a single course change to its materialized dish.
 * Lightweight delta update (O(1) queries).
 */
export async function syncSingleCourse(
  db: any,
  courseId: string,
  materializedMenuId: string,
  tenantId: string,
  userId: string
): Promise<void> {
  // Fetch the updated course
  const { data: course } = await db
    .from('tasting_menu_courses')
    .select('id, course_number, course_type, dish_name, description, recipe_id, prep_notes')
    .eq('id', courseId)
    .single()

  if (!course) return

  const courseName = COURSE_TYPE_LABELS[course.course_type] || course.course_type

  // Find the corresponding materialized dish
  const { data: dish } = await db
    .from('dishes')
    .select('id')
    .eq('source_tasting_course_id', courseId)
    .eq('menu_id', materializedMenuId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!dish) {
    // Dish doesn't exist yet (course was added after materialization)
    // Fetch recipe name if needed
    let recipeName = course.dish_name
    if (course.recipe_id) {
      const { data: recipe } = await db
        .from('recipes')
        .select('name')
        .eq('id', course.recipe_id)
        .single()
      if (recipe) recipeName = recipe.name
    }

    const { data: newDish } = await db
      .from('dishes')
      .insert({
        tenant_id: tenantId,
        menu_id: materializedMenuId,
        course_number: course.course_number,
        course_name: courseName,
        name: course.dish_name,
        description: course.description ?? null,
        chef_notes: course.prep_notes ?? null,
        sort_order: course.course_number,
        source_tasting_course_id: course.id,
        created_by: userId,
        updated_by: userId,
      })
      .select('id')
      .single()

    if (newDish && course.recipe_id) {
      await db.from('components').insert({
        tenant_id: tenantId,
        dish_id: newDish.id,
        recipe_id: course.recipe_id,
        name: recipeName,
        category: 'other',
        source_tasting_course_id: course.id,
        created_by: userId,
        updated_by: userId,
      })
    }
    return
  }

  // Update existing dish
  await db
    .from('dishes')
    .update({
      course_number: course.course_number,
      course_name: courseName,
      name: course.dish_name,
      description: course.description ?? null,
      chef_notes: course.prep_notes ?? null,
      sort_order: course.course_number,
      updated_by: userId,
    })
    .eq('id', dish.id)
    .eq('tenant_id', tenantId)

  // Sync the component
  const recipeNameMap = new Map<string, string>()
  if (course.recipe_id) {
    const { data: recipe } = await db
      .from('recipes')
      .select('name')
      .eq('id', course.recipe_id)
      .single()
    if (recipe) recipeNameMap.set(course.recipe_id, recipe.name)
  }

  await syncCourseComponent(db, dish.id, course, tenantId, userId, recipeNameMap)
}

// ============================================
// REMOVE MATERIALIZED DISH
// ============================================

/**
 * Remove the materialized dish for a deleted course.
 */
export async function removeMaterializedDish(
  db: any,
  courseId: string,
  materializedMenuId: string,
  tenantId: string
): Promise<void> {
  // CASCADE on dish delete will clean up components
  await db
    .from('dishes')
    .delete()
    .eq('source_tasting_course_id', courseId)
    .eq('menu_id', materializedMenuId)
    .eq('tenant_id', tenantId)
}

// ============================================
// DELETE MATERIALIZED MENU
// ============================================

/**
 * Delete the entire materialized menu (and all its dishes/components via CASCADE).
 */
export async function deleteMaterializedMenu(
  db: any,
  materializedMenuId: string,
  tenantId: string
): Promise<void> {
  await db.from('menus').delete().eq('id', materializedMenuId).eq('tenant_id', tenantId)

  revalidatePath('/menus')
}

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Sync the component (recipe link) for a single dish/course pair.
 */
async function syncCourseComponent(
  db: any,
  dishId: string,
  course: { id: string; recipe_id: string | null; dish_name: string },
  tenantId: string,
  userId: string,
  recipeNameMap: Map<string, string>
): Promise<void> {
  // Find existing component for this course
  const { data: existingComp } = await db
    .from('components')
    .select('id, recipe_id')
    .eq('source_tasting_course_id', course.id)
    .eq('dish_id', dishId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (course.recipe_id) {
    const recipeName = recipeNameMap.get(course.recipe_id) ?? course.dish_name

    if (existingComp) {
      // Update if recipe changed
      if (existingComp.recipe_id !== course.recipe_id) {
        await db
          .from('components')
          .update({
            recipe_id: course.recipe_id,
            name: recipeName,
            updated_by: userId,
          })
          .eq('id', existingComp.id)
          .eq('tenant_id', tenantId)
      }
    } else {
      // Create new component
      await db.from('components').insert({
        tenant_id: tenantId,
        dish_id: dishId,
        recipe_id: course.recipe_id,
        name: recipeName,
        category: 'other',
        source_tasting_course_id: course.id,
        created_by: userId,
        updated_by: userId,
      })
    }
  } else if (existingComp) {
    // Recipe was unlinked, remove the component
    await db.from('components').delete().eq('id', existingComp.id).eq('tenant_id', tenantId)
  }
}
