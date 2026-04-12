'use server'

// Production Report - generates batch-quantity production reports for events.
// Scales all recipe ingredients to the event's guest_count vs recipe servings.
// Formula > AI: all calculations are deterministic math.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { buildProductionReportPdf } from './production-report-pdf'

// -- Types --

export type ScaledIngredient = {
  name: string
  quantity: number
  unit: string
  preparation: string | null
}

export type ReportComponent = {
  componentName: string
  recipeName: string | null
  scaledIngredients: ScaledIngredient[]
  method: string | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
}

export type ReportDish = {
  dishName: string
  components: ReportComponent[]
}

export type ReportCourse = {
  courseName: string
  courseNumber: number
  dishes: ReportDish[]
}

export type ProductionReport = {
  eventName: string
  eventDate: string
  guestCount: number
  clientName: string
  courses: ReportCourse[]
  totalPrepMinutes: number
  totalCookMinutes: number
  allergenSummary: string[]
  dietarySummary: string[]
}

// -- Server Actions --

export async function generateProductionReport(eventId: string): Promise<ProductionReport> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = await createServerClient()

  // 1. Fetch event with client name
  const { data: event, error: eventErr } = await db
    .from('events')
    .select(
      `
      id,
      title,
      event_date,
      guest_count,
      menu_id,
      allergies,
      dietary_restrictions,
      clients!inner(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) {
    throw new Error('Event not found or access denied')
  }

  if (!event.menu_id) {
    throw new Error('No menu assigned to this event')
  }

  const client = event.clients as unknown as { full_name: string }
  const clientName = client.full_name ?? ''

  // 2. Fetch dishes for the menu, ordered by course
  const { data: dishes, error: dishErr } = await db
    .from('dishes')
    .select(
      `
      id,
      name,
      course_name,
      course_number,
      sort_order,
      allergen_flags,
      dietary_tags
    `
    )
    .eq('menu_id', event.menu_id)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (dishErr) {
    throw new Error('Failed to load menu dishes')
  }

  if (!dishes || dishes.length === 0) {
    return {
      eventName: event.title ?? 'Untitled Event',
      eventDate: event.event_date,
      guestCount: event.guest_count,
      clientName,
      courses: [],
      totalPrepMinutes: 0,
      totalCookMinutes: 0,
      allergenSummary: event.allergies ?? [],
      dietarySummary: event.dietary_restrictions ?? [],
    }
  }

  const dishIds = dishes.map((d: any) => d.id)

  // 3. Fetch components for all dishes
  const { data: components, error: compErr } = await db
    .from('components')
    .select(
      `
      id,
      name,
      dish_id,
      recipe_id,
      sort_order
    `
    )
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  if (compErr) {
    throw new Error('Failed to load dish components')
  }

  // 4. Fetch recipes for all components that have recipe_id
  const recipeIds = (components ?? [])
    .map((c: any) => c.recipe_id)
    .filter((id: any): id is string => id !== null)
  const uniqueRecipeIds = [...new Set(recipeIds)]

  let recipesMap: Map<
    string,
    {
      id: string
      name: string
      method: string
      servings: number | null
      prep_time_minutes: number | null
      cook_time_minutes: number | null
    }
  > = new Map()

  if (uniqueRecipeIds.length > 0) {
    const { data: recipes, error: recipeErr } = await db
      .from('recipes')
      .select(
        `
        id,
        name,
        method,
        servings,
        prep_time_minutes,
        cook_time_minutes
      `
      )
      .in('id', uniqueRecipeIds)
      .eq('tenant_id', tenantId)

    if (recipeErr) {
      throw new Error('Failed to load recipes')
    }

    for (const r of recipes ?? []) {
      recipesMap.set(r.id, r)
    }
  }

  // 5. Fetch recipe_ingredients for all recipes, joined with ingredients
  let ingredientsByRecipe: Map<
    string,
    Array<{
      name: string
      quantity: number
      unit: string
      preparation_notes: string | null
    }>
  > = new Map()

  if (uniqueRecipeIds.length > 0) {
    const { data: recipeIngredients, error: riErr } = await db
      .from('recipe_ingredients')
      .select(
        `
        recipe_id,
        quantity,
        unit,
        preparation_notes,
        sort_order,
        ingredients!inner(name)
      `
      )
      .in('recipe_id', uniqueRecipeIds)
      .order('sort_order', { ascending: true })

    if (riErr) {
      throw new Error('Failed to load recipe ingredients')
    }

    for (const ri of recipeIngredients ?? []) {
      const ingredient = ri.ingredients as unknown as { name: string }
      const list = ingredientsByRecipe.get(ri.recipe_id) ?? []
      list.push({
        name: ingredient.name,
        quantity: ri.quantity,
        unit: ri.unit,
        preparation_notes: ri.preparation_notes,
      })
      ingredientsByRecipe.set(ri.recipe_id, list)
    }
  }

  // 6. Build report structure grouped by course
  const courseMap = new Map<
    string,
    { courseName: string; courseNumber: number; dishes: ReportDish[] }
  >()

  // Collect all allergens/dietary tags from dishes
  const allAllergens = new Set<string>(event.allergies ?? [])
  const allDietary = new Set<string>(event.dietary_restrictions ?? [])

  let totalPrepMinutes = 0
  let totalCookMinutes = 0

  for (const dish of dishes) {
    // Aggregate allergens/dietary from dish-level flags
    for (const a of dish.allergen_flags ?? []) allAllergens.add(a)
    for (const d of dish.dietary_tags ?? []) allDietary.add(d)

    const dishComponents = (components ?? []).filter((c: any) => c.dish_id === dish.id)

    const reportComponents: ReportComponent[] = dishComponents.map((comp: any) => {
      const recipe = comp.recipe_id ? recipesMap.get(comp.recipe_id) : null
      const rawIngredients = comp.recipe_id ? (ingredientsByRecipe.get(comp.recipe_id) ?? []) : []

      // Scale: multiply qty by (guest_count / recipe.servings) when servings exists
      const scaleFactor =
        recipe?.servings && recipe.servings > 0 ? event.guest_count / recipe.servings : 1

      const scaledIngredients: ScaledIngredient[] = rawIngredients.map((ing) => ({
        name: ing.name,
        quantity: Math.round(ing.quantity * scaleFactor * 100) / 100,
        unit: ing.unit,
        preparation: ing.preparation_notes,
      }))

      const prepMin = recipe?.prep_time_minutes ?? null
      const cookMin = recipe?.cook_time_minutes ?? null
      if (prepMin) totalPrepMinutes += prepMin
      if (cookMin) totalCookMinutes += cookMin

      return {
        componentName: comp.name,
        recipeName: recipe?.name ?? null,
        scaledIngredients,
        method: recipe?.method ?? null,
        prepTimeMinutes: prepMin,
        cookTimeMinutes: cookMin,
      }
    })

    const reportDish: ReportDish = {
      dishName: dish.name ?? 'Unnamed Dish',
      components: reportComponents,
    }

    const courseKey = `${dish.course_number}-${dish.course_name}`
    const existing = courseMap.get(courseKey)
    if (existing) {
      existing.dishes.push(reportDish)
    } else {
      courseMap.set(courseKey, {
        courseName: dish.course_name,
        courseNumber: dish.course_number,
        dishes: [reportDish],
      })
    }
  }

  const courses: ReportCourse[] = Array.from(courseMap.values()).sort(
    (a, b) => a.courseNumber - b.courseNumber
  )

  return {
    eventName: event.title ?? 'Untitled Event',
    eventDate: event.event_date,
    guestCount: event.guest_count,
    clientName,
    courses,
    totalPrepMinutes,
    totalCookMinutes,
    allergenSummary: Array.from(allAllergens),
    dietarySummary: Array.from(allDietary),
  }
}

export async function generateProductionReportPdf(eventId: string): Promise<Buffer> {
  const report = await generateProductionReport(eventId)
  return buildProductionReportPdf(report)
}
