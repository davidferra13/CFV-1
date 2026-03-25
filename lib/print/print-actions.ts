'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---------- Recipe ----------

export async function getRecipePrintData(recipeId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: recipe, error: recipeError } = await db
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .eq('tenant_id', tenantId)
    .single()

  if (recipeError || !recipe) {
    throw new Error('Recipe not found')
  }

  const { data: recipeIngredients, error: riError } = await db
    .from('recipe_ingredients')
    .select('*, ingredients(name, category, allergen_flags, dietary_tags)')
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true })

  if (riError) {
    throw new Error('Failed to load recipe ingredients')
  }

  return {
    recipe,
    ingredients: recipeIngredients || [],
  }
}

// ---------- Grocery List ----------

export async function getGroceryListPrintData(eventId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch event with client info
  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      'id, event_date, serve_time, guest_count, occasion, location_address, location_city, location_state, client_id, menu_id, dietary_restrictions, allergies, clients(full_name)'
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  // If event has a menu, fetch all dishes and their recipe ingredients
  let groceryItems: {
    ingredientName: string
    category: string
    quantity: number
    unit: string
    recipeName: string
    isOptional: boolean
    preparationNotes: string | null
  }[] = []

  if (event.menu_id) {
    // Get all dishes for this menu
    const { data: dishes } = await db
      .from('dishes')
      .select('id, name, course_name')
      .eq('menu_id', event.menu_id)
      .eq('tenant_id', tenantId)
      .order('course_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (dishes && dishes.length > 0) {
      // For each dish, try to find a matching recipe and its ingredients
      // Dishes link to menus, recipes are separate. We look up recipes by name match.
      const dishNames = dishes.map((d: any) => d.name).filter(Boolean) as string[]

      if (dishNames.length > 0) {
        const { data: recipes } = await db
          .from('recipes')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .in('name', dishNames)

        if (recipes && recipes.length > 0) {
          const recipeIds = recipes.map((r: any) => r.id)

          const { data: recipeIngredients } = await db
            .from('recipe_ingredients')
            .select(
              'quantity, unit, is_optional, preparation_notes, recipe_id, ingredients(name, category)'
            )
            .in('recipe_id', recipeIds)
            .order('sort_order', { ascending: true })

          if (recipeIngredients) {
            const recipeNameMap = new Map(recipes.map((r: any) => [r.id, r.name]))

            groceryItems = recipeIngredients.map((ri: any) => ({
              ingredientName:
                (ri.ingredients as { name: string; category: string } | null)?.name || 'Unknown',
              category:
                (ri.ingredients as { name: string; category: string } | null)?.category || 'other',
              quantity: ri.quantity,
              unit: ri.unit,
              recipeName: recipeNameMap.get(ri.recipe_id) || 'Unknown',
              isOptional: ri.is_optional,
              preparationNotes: ri.preparation_notes,
            }))
          }
        }
      }
    }
  }

  // Consolidate: group by ingredient name + unit, sum quantities
  const consolidated = new Map<
    string,
    {
      ingredientName: string
      category: string
      totalQuantity: number
      unit: string
      recipes: string[]
      isOptional: boolean
      preparationNotes: string | null
    }
  >()

  for (const item of groceryItems) {
    const key = `${item.ingredientName}__${item.unit}`
    const existing = consolidated.get(key)
    if (existing) {
      existing.totalQuantity += item.quantity
      if (!existing.recipes.includes(item.recipeName)) {
        existing.recipes.push(item.recipeName)
      }
      // If any usage is required (not optional), mark as required
      if (!item.isOptional) {
        existing.isOptional = false
      }
    } else {
      consolidated.set(key, {
        ingredientName: item.ingredientName,
        category: item.category,
        totalQuantity: item.quantity,
        unit: item.unit,
        recipes: [item.recipeName],
        isOptional: item.isOptional,
        preparationNotes: item.preparationNotes,
      })
    }
  }

  // Group by category
  const byCategory = new Map<string, typeof groceryItems>()
  for (const item of consolidated.values()) {
    const cat = item.category
    if (!byCategory.has(cat)) {
      byCategory.set(cat, [])
    }
    byCategory.get(cat)!.push({
      ingredientName: item.ingredientName,
      category: item.category,
      quantity: item.totalQuantity,
      unit: item.unit,
      recipeName: item.recipes.join(', '),
      isOptional: item.isOptional,
      preparationNotes: item.preparationNotes,
    })
  }

  const clientName = (event.clients as { full_name: string } | null)?.full_name || 'Unknown Client'

  return {
    event: {
      id: event.id,
      eventDate: event.event_date,
      serveTime: event.serve_time,
      guestCount: event.guest_count,
      occasion: event.occasion,
      locationAddress: event.location_address,
      clientName,
    },
    groceryByCategory: Object.fromEntries(byCategory),
    totalItems: consolidated.size,
  }
}

// ---------- Menu ----------

export async function getMenuPrintData(menuId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: menu, error: menuError } = await db
    .from('menus')
    .select('*')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (menuError || !menu) {
    throw new Error('Menu not found')
  }

  const { data: dishes, error: dishesError } = await db
    .from('dishes')
    .select('*')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (dishesError) {
    throw new Error('Failed to load menu dishes')
  }

  // Get chef info for the footer
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  // Group dishes by course
  const courseMap = new Map<string, typeof dishes>()
  for (const dish of dishes || []) {
    const courseName = dish.course_name
    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, [])
    }
    courseMap.get(courseName)!.push(dish)
  }

  return {
    menu,
    courses: Object.fromEntries(courseMap),
    chefName: chef?.display_name || chef?.business_name || '',
  }
}

// ---------- Event Brief ----------

export async function getEventBriefPrintData(eventId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      `
      id, event_date, serve_time, arrival_time, departure_time,
      guest_count, occasion, service_style,
      location_address, location_city, location_state, location_zip,
      location_notes, access_instructions, kitchen_notes, site_notes,
      special_requests, dietary_restrictions, allergies,
      menu_id, client_id, status,
      clients(full_name, phone, email, allergies, dietary_restrictions, equipment_available, kitchen_constraints, parking_instructions, house_rules)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  // Get menu dishes if menu exists
  let menuDishes: {
    name: string | null
    courseName: string
    dietaryTags: string[]
    allergenFlags: string[]
  }[] = []
  if (event.menu_id) {
    const { data: dishes } = await db
      .from('dishes')
      .select('name, course_name, dietary_tags, allergen_flags')
      .eq('menu_id', event.menu_id)
      .eq('tenant_id', tenantId)
      .order('course_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (dishes) {
      menuDishes = dishes.map((d: any) => ({
        name: d.name,
        courseName: d.course_name,
        dietaryTags: d.dietary_tags,
        allergenFlags: d.allergen_flags,
      }))
    }
  }

  const client = event.clients as {
    full_name: string
    phone: string | null
    email: string
    allergies: string[] | null
    dietary_restrictions: string[] | null
    equipment_available: string[] | null
    kitchen_constraints: string | null
    parking_instructions: string | null
    house_rules: string | null
  } | null

  return {
    event: {
      id: event.id,
      eventDate: event.event_date,
      serveTime: event.serve_time,
      arrivalTime: event.arrival_time,
      departureTime: event.departure_time,
      guestCount: event.guest_count,
      occasion: event.occasion,
      serviceStyle: event.service_style,
      locationAddress: event.location_address,
      locationCity: event.location_city,
      locationState: event.location_state,
      locationZip: event.location_zip,
      locationNotes: event.location_notes,
      accessInstructions: event.access_instructions,
      kitchenNotes: event.kitchen_notes,
      siteNotes: event.site_notes,
      specialRequests: event.special_requests,
      dietaryRestrictions: event.dietary_restrictions,
      allergies: event.allergies,
      status: event.status,
    },
    client: client
      ? {
          fullName: client.full_name,
          phone: client.phone,
          email: client.email,
          allergies: client.allergies,
          dietaryRestrictions: client.dietary_restrictions,
          equipmentAvailable: client.equipment_available,
          kitchenConstraints: client.kitchen_constraints,
          parkingInstructions: client.parking_instructions,
          houseRules: client.house_rules,
        }
      : null,
    menuDishes,
  }
}
