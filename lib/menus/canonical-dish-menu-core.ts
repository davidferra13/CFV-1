import { revalidatePath } from 'next/cache'

type CanonicalDishInsertMode = 'reference' | 'copy'

type CanonicalDishMaterializationInput = {
  db: any
  tenantId: string
  actorUserId: string | null
  menuId: string
  dishId: string
  mode: CanonicalDishInsertMode
  courseNumber?: number
  courseName?: string
  replaceExistingCourse?: boolean
}

async function loadCanonicalDishPackage(input: { db: any; tenantId: string; dishId: string }) {
  const { db, tenantId, dishId } = input

  const { data: canonicalDish } = await db
    .from('dish_index')
    .select('id, name, course, description, dietary_tags, allergen_flags, linked_recipe_id')
    .eq('id', dishId)
    .eq('tenant_id', tenantId)
    .single()

  if (!canonicalDish) {
    throw new Error('Canonical dish not found')
  }

  const { data: canonicalComponents } = await db
    .from('dish_index_components')
    .select('id, name, category, description, sort_order, recipe_id')
    .eq('dish_id', dishId)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  return {
    dish: canonicalDish,
    components: canonicalComponents ?? [],
  }
}

export async function materializeCanonicalDishIntoMenu(input: CanonicalDishMaterializationInput) {
  const { db, tenantId, actorUserId, menuId, dishId, mode, replaceExistingCourse } = input

  const { data: menu } = await db
    .from('menus')
    .select('id, status')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single()

  if (!menu) {
    throw new Error('Menu not found')
  }

  if (menu.status === 'locked') {
    throw new Error('Cannot add dishes to a locked menu')
  }

  const canonical = await loadCanonicalDishPackage({
    db,
    tenantId,
    dishId,
  })

  let courseNumber = input.courseNumber ?? 1
  if (!input.courseNumber) {
    const { data: existingDishes } = await db
      .from('dishes')
      .select('course_number')
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)
      .order('course_number', { ascending: false })
      .limit(1)

    if ((existingDishes ?? []).length > 0) {
      courseNumber = existingDishes[0].course_number + 1
    }
  }

  const courseName = input.courseName ?? canonical.dish.course ?? `Course ${courseNumber}`

  if (replaceExistingCourse) {
    await db
      .from('dishes')
      .delete()
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)
      .eq('course_number', courseNumber)
  }

  const { data: menuDish, error: dishError } = await db
    .from('dishes')
    .insert({
      tenant_id: tenantId,
      menu_id: menuId,
      course_number: courseNumber,
      course_name: courseName,
      sort_order: courseNumber,
      name: canonical.dish.name,
      description: canonical.dish.description ?? null,
      dietary_tags: canonical.dish.dietary_tags ?? [],
      allergen_flags: canonical.dish.allergen_flags ?? [],
      dish_index_id: mode === 'reference' ? canonical.dish.id : null,
      source_mode: mode,
      copied_from_dish_index_id: mode === 'copy' ? canonical.dish.id : null,
      created_by: actorUserId,
      updated_by: actorUserId,
    })
    .select('id, name, course_number, course_name')
    .single()

  if (dishError || !menuDish) {
    throw new Error(`Failed to create menu dish: ${dishError?.message ?? 'unknown error'}`)
  }

  if (canonical.components.length > 0) {
    const { error: componentError } = await db.from('components').insert(
      canonical.components.map((component: any) => ({
        tenant_id: tenantId,
        dish_id: menuDish.id,
        name: component.name,
        category: component.category,
        description: component.description ?? null,
        sort_order: component.sort_order ?? 0,
        recipe_id: component.recipe_id ?? null,
        dish_index_component_id: mode === 'reference' ? component.id : null,
        created_by: actorUserId,
        updated_by: actorUserId,
      }))
    )

    if (componentError) {
      throw new Error(
        `Failed to create menu components: ${componentError.message ?? 'unknown error'}`
      )
    }
  } else if (canonical.dish.linked_recipe_id) {
    const { error: fallbackComponentError } = await db.from('components').insert({
      tenant_id: tenantId,
      dish_id: menuDish.id,
      name: canonical.dish.name,
      category: 'primary',
      description: canonical.dish.description ?? null,
      sort_order: 0,
      recipe_id: canonical.dish.linked_recipe_id,
      created_by: actorUserId,
      updated_by: actorUserId,
    })

    if (fallbackComponentError) {
      throw new Error(
        `Failed to create menu fallback component: ${fallbackComponentError.message ?? 'unknown error'}`
      )
    }
  }

  revalidatePath(`/menus/${menuId}`)

  return {
    menuDishId: menuDish.id,
    name: menuDish.name,
    courseNumber: menuDish.course_number,
    courseName: menuDish.course_name,
    dishIndexId: canonical.dish.id,
  }
}
