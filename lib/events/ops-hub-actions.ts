'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { generateShoppingList, type ShoppingListItem } from '@/lib/culinary/shopping-list-actions'
import {
  computePrepTimeline,
  type PrepDay,
  type TimelineRecipeInput,
} from '@/lib/prep-timeline/compute-timeline'

export interface OpsHubData {
  event: {
    id: string
    occasion: string | null
    event_date: string
    serve_time: string | null
    guest_count: number
    status: string
    client_name: string | null
    location_address: string | null
  }
  menu: {
    id: string
    name: string
    dishes: { id: string; name: string; course_number: number; recipe_id: string | null }[]
  } | null
  shopping: {
    items: ShoppingListItem[]
    totalEstimatedCostCents: number
    unavailable: boolean
    error: string | null
  }
  prep: {
    days: PrepDay[]
    totalPrepMinutes: number
  } | null
}

function buildServiceDateTime(eventDate: string, serveTime: string | null): Date {
  const serviceDate = new Date(eventDate)
  if (serveTime) {
    const [hours, minutes] = serveTime.split(':').map(Number)
    serviceDate.setHours(hours, minutes, 0, 0)
  } else {
    serviceDate.setHours(18, 0, 0, 0)
  }
  return serviceDate
}

async function getShopping(eventId: string, eventDate: string): Promise<OpsHubData['shopping']> {
  try {
    const result = await generateShoppingList({
      startDate: eventDate,
      endDate: eventDate,
      eventIds: [eventId],
    })
    return {
      items: result.items,
      totalEstimatedCostCents: result.totalEstimatedCostCents,
      unavailable: false,
      error: null,
    }
  } catch (error) {
    console.error('[ops-hub] Shopping list generation failed', error)
    return {
      items: [],
      totalEstimatedCostCents: 0,
      unavailable: true,
      error:
        'Shopping list generation is unavailable right now. Try again from the shopping list page.',
    }
  }
}

export async function getEventOpsHub(eventId: string): Promise<OpsHubData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      'id, occasion, event_date, serve_time, guest_count, status, location_address, client:clients(full_name)'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (eventError || !event) return null

  const { data: menuRows } = await db
    .from('menus')
    .select('id, name')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  const menuRow = menuRows?.[0] ?? null
  let menu: OpsHubData['menu'] = null
  let dishes: any[] = []
  let components: any[] = []

  if (menuRow) {
    const { data: dishRows } = await db
      .from('dishes')
      .select('id, name, course_name, course_number, sort_order')
      .eq('menu_id', menuRow.id)
      .eq('tenant_id', user.tenantId!)
      .order('course_number', { ascending: true })
      .order('sort_order', { ascending: true })

    dishes = dishRows ?? []

    if (dishes.length > 0) {
      const { data: componentRows } = await db
        .from('components')
        .select('id, name, dish_id, recipe_id, make_ahead_window_hours, sort_order')
        .eq('tenant_id', user.tenantId!)
        .in(
          'dish_id',
          dishes.map((dish: any) => dish.id)
        )
        .order('sort_order', { ascending: true })

      components = componentRows ?? []
    }

    const firstRecipeByDish = new Map<string, string>()
    for (const component of components) {
      if (component.recipe_id && !firstRecipeByDish.has(component.dish_id)) {
        firstRecipeByDish.set(component.dish_id, component.recipe_id)
      }
    }

    menu = {
      id: menuRow.id,
      name: menuRow.name,
      dishes: dishes.map((dish: any) => ({
        id: dish.id,
        name: dish.name ?? dish.course_name ?? 'Untitled dish',
        course_number: dish.course_number,
        recipe_id: firstRecipeByDish.get(dish.id) ?? null,
      })),
    }
  }

  const shopping = await getShopping(eventId, event.event_date)
  let prep: OpsHubData['prep'] = null

  if (menuRow && dishes.length > 0 && components.length > 0) {
    const recipeIds = [
      ...new Set(components.map((component: any) => component.recipe_id).filter(Boolean)),
    ] as string[]

    if (recipeIds.length > 0) {
      const { data: recipeRows } = await db
        .from('recipes')
        .select(
          'id, name, category, peak_hours_min, peak_hours_max, safety_hours_max, storage_method, freezable, frozen_extends_hours, prep_time_minutes, dietary_tags, active_prep_minutes, passive_prep_minutes, hold_class, prep_tier'
        )
        .eq('tenant_id', user.tenantId!)
        .in('id', recipeIds)

      const recipes = recipeRows ?? []
      if (recipes.length > 0) {
        const recipeMap = new Map(recipes.map((recipe: any) => [recipe.id, recipe]))
        const dishMap = new Map(dishes.map((dish: any) => [dish.id, dish]))
        const allergenMap: Record<string, string[]> = {}

        const { data: recipeIngredients } = await db
          .from('recipe_ingredients')
          .select('recipe_id, ingredient_id')
          .in('recipe_id', recipeIds)

        const ingredientIds = [
          ...new Set(
            ((recipeIngredients ?? []) as any[])
              .map((ingredient: any) => ingredient.ingredient_id)
              .filter(Boolean)
          ),
        ] as string[]

        if (ingredientIds.length > 0) {
          const { data: ingredients } = await db
            .from('ingredients')
            .select('id, allergen_flags')
            .eq('tenant_id', user.tenantId!)
            .in('id', ingredientIds)

          const ingredientMap = new Map(
            ((ingredients ?? []) as any[]).map((ingredient: any) => [
              ingredient.id,
              ingredient.allergen_flags ?? [],
            ])
          )

          for (const recipeIngredient of (recipeIngredients ?? []) as any[]) {
            const flags = ingredientMap.get(recipeIngredient.ingredient_id) ?? []
            if (flags.length === 0) continue
            const existing = allergenMap[recipeIngredient.recipe_id] ?? []
            allergenMap[recipeIngredient.recipe_id] = [...new Set([...existing, ...flags])]
          }
        }

        const timelineItems: TimelineRecipeInput[] = components
          .filter((component: any) => component.recipe_id && recipeMap.has(component.recipe_id))
          .map((component: any) => {
            const recipe: any = recipeMap.get(component.recipe_id)
            const dish: any = dishMap.get(component.dish_id)

            return {
              recipeId: recipe.id,
              recipeName: recipe.name ?? component.name,
              componentName: component.name,
              dishName: dish?.name ?? dish?.course_name ?? 'Unknown',
              courseName: dish?.course_name ?? 'Unknown',
              category: recipe.category ?? null,
              peakHoursMin: recipe.peak_hours_min ?? null,
              peakHoursMax: recipe.peak_hours_max ?? null,
              safetyHoursMax: recipe.safety_hours_max ?? null,
              storageMethod: recipe.storage_method ?? null,
              freezable: recipe.freezable ?? null,
              frozenExtendsHours: recipe.frozen_extends_hours ?? null,
              prepTimeMinutes: recipe.prep_time_minutes ?? 30,
              activeMinutes: recipe.active_prep_minutes ?? null,
              passiveMinutes: recipe.passive_prep_minutes ?? null,
              holdClass: recipe.hold_class ?? null,
              prepTier: recipe.prep_tier ?? null,
              allergenFlags: allergenMap[recipe.id] ?? [],
              makeAheadWindowHours: component.make_ahead_window_hours ?? null,
            }
          })

        if (timelineItems.length > 0) {
          const timeline = computePrepTimeline(
            timelineItems,
            buildServiceDateTime(event.event_date, event.serve_time)
          )
          prep = {
            days: timeline.days,
            totalPrepMinutes: timeline.days.reduce((total, day) => total + day.totalPrepMinutes, 0),
          }
        }
      }
    }
  }

  return {
    event: {
      id: event.id,
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      guest_count: event.guest_count,
      status: event.status,
      client_name: event.client?.full_name ?? null,
      location_address: event.location_address,
    },
    menu,
    shopping,
    prep,
  }
}
