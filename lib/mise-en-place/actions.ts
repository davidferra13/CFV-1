'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getPrepCompletions } from '@/lib/prep-timeline/actions'
import {
  buildMiseEnPlace,
  type MiseRawInput,
  type MiseRawComponent,
  type MiseRawIngredient,
} from './engine'
import type { MiseEnPlaceBoard, MiseEquipment } from './types'
import { computePrepTimeline, type TimelineRecipeInput } from '@/lib/prep-timeline/compute-timeline'

export async function getMiseEnPlace(eventId: string): Promise<{
  board: MiseEnPlaceBoard | null
  error?: string
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  try {
    // 1. Get event
    const { data: event } = await db
      .from('events')
      .select(
        'id, title, event_date, serve_time, event_time, guest_count, service_style, status, client_id, occasion'
      )
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!event) return { board: null, error: 'Event not found.' }

    // 2. Parallel fetch: client name, menus, equipment, prep completions
    const [clientResult, menusResult, equipmentResult, prepCompletions] = await Promise.all([
      event.client_id
        ? db
            .from('clients')
            .select('first_name, last_name, company_name')
            .eq('id', event.client_id)
            .single()
        : Promise.resolve({ data: null }),
      db.from('menus').select('id').eq('event_id', eventId).eq('tenant_id', tenantId),
      db
        .from('event_equipment_checklist')
        .select('id, equipment_name, category, quantity, source, packed, returned, notes')
        .eq('event_id', eventId)
        .eq('chef_id', tenantId),
      getPrepCompletions(eventId),
    ])

    const client = clientResult.data
    const clientName = client
      ? client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
      : null

    const menus = menusResult.data ?? []
    if (menus.length === 0) {
      return { board: null, error: 'No menu attached to this event yet.' }
    }

    const menuIds = menus.map((m: any) => m.id)

    // 3. Get dishes for these menus
    const { data: dishes } = await db
      .from('dishes')
      .select('id, course_name, course_number, sort_order, menu_id')
      .in('menu_id', menuIds)
      .order('course_number', { ascending: true })

    if (!dishes || dishes.length === 0) {
      return { board: null, error: 'Menu has no courses yet.' }
    }

    const dishIds = dishes.map((d: any) => d.id)
    const dishMap = new Map<string, any>(dishes.map((d: any) => [d.id, d]))

    // 4. Get components with recipe + prep data
    const { data: components } = await db
      .from('components')
      .select(
        'id, name, dish_id, recipe_id, category, is_make_ahead, make_ahead_window_hours, scale_factor, sort_order, prep_station'
      )
      .in('dish_id', dishIds)
      .order('sort_order', { ascending: true })

    if (!components || components.length === 0) {
      return { board: null, error: 'No components in the menu yet.' }
    }

    // 5. Get linked recipes with peak window data
    const recipeIds = [
      ...new Set(components.filter((c: any) => c.recipe_id).map((c: any) => c.recipe_id)),
    ] as string[]

    let recipes: any[] = []
    if (recipeIds.length > 0) {
      const { data: recipeData } = await db
        .from('recipes')
        .select(
          'id, name, category, prep_time_minutes, peak_hours_min, peak_hours_max, safety_hours_max, storage_method, freezable, frozen_extends_hours, active_prep_minutes, passive_prep_minutes, hold_class, prep_tier'
        )
        .in('id', recipeIds)
      recipes = recipeData ?? []
    }
    const recipeMap = new Map(recipes.map((r: any) => [r.id, r]))

    // 6. Get recipe ingredients with ingredient details
    let recipeIngredients: any[] = []
    let ingredientMap = new Map<string, any>()

    if (recipeIds.length > 0) {
      const { data: riData } = await db
        .from('recipe_ingredients')
        .select(
          'recipe_id, ingredient_id, quantity, unit, preparation_notes, yield_pct, sort_order'
        )
        .in('recipe_id', recipeIds)
        .order('sort_order', { ascending: true })

      recipeIngredients = riData ?? []

      if (recipeIngredients.length > 0) {
        const ingredientIds = [
          ...new Set(recipeIngredients.map((ri: any) => ri.ingredient_id).filter(Boolean)),
        ]

        const { data: ingredients } = await db
          .from('ingredients')
          .select(
            'id, name, category, allergen_flags, last_price_cents, default_yield_pct, default_unit'
          )
          .in('id', ingredientIds)

        ingredientMap = new Map((ingredients ?? []).map((i: any) => [i.id, i]))
      }
    }

    // 7. Get purchase transactions for lifecycle data
    const ingredientIds = [...ingredientMap.keys()]
    let purchaseMap = new Map<string, { qty: number; costCents: number }>()

    if (ingredientIds.length > 0) {
      const { data: purchaseData } = await db
        .from('inventory_transactions')
        .select('ingredient_id, quantity, cost_cents')
        .eq('chef_id', tenantId)
        .eq('event_id', eventId)
        .eq('transaction_type', 'receive')

      for (const row of purchaseData ?? []) {
        if (!row.ingredient_id) continue
        const existing = purchaseMap.get(row.ingredient_id) ?? { qty: 0, costCents: 0 }
        existing.qty += Math.abs(Number(row.quantity) || 0)
        existing.costCents += Math.abs(Number(row.cost_cents) || 0)
        purchaseMap.set(row.ingredient_id, existing)
      }
    }

    // 8. Build raw components for the engine
    // Group recipe_ingredients by recipe_id for quick lookup
    const riByRecipe = new Map<string, any[]>()
    for (const ri of recipeIngredients) {
      const list = riByRecipe.get(ri.recipe_id) ?? []
      list.push(ri)
      riByRecipe.set(ri.recipe_id, list)
    }

    const rawComponents: MiseRawComponent[] = components.map((comp: any) => {
      const recipe = comp.recipe_id ? recipeMap.get(comp.recipe_id) : null
      const dish = dishMap.get(comp.dish_id)
      const scaleFactor = Number(comp.scale_factor) || 1

      // Build ingredient list for this component
      const compIngredients: MiseRawIngredient[] = []
      if (comp.recipe_id) {
        const ris = riByRecipe.get(comp.recipe_id) ?? []
        for (const ri of ris) {
          const ingredient = ingredientMap.get(ri.ingredient_id)
          if (!ingredient) continue

          const scaledQty = (Number(ri.quantity) || 0) * scaleFactor
          const yieldPct = Math.max(
            Number(ri.yield_pct) || Number(ingredient.default_yield_pct) || 100,
            1
          )
          const purchase = purchaseMap.get(ri.ingredient_id)

          compIngredients.push({
            ingredientId: ri.ingredient_id,
            name: ingredient.name,
            quantity: scaledQty,
            unit: ri.unit || ingredient.default_unit || 'each',
            category: ingredient.category ?? 'other',
            allergenFlags: ingredient.allergen_flags ?? [],
            prepNotes: ri.preparation_notes,
            yieldPct,
            lastPriceCents: Number(ingredient.last_price_cents) || 0,
            purchasedQty: purchase?.qty ?? null,
            purchasedCostCents: purchase?.costCents ?? null,
          })
        }
      }

      return {
        componentId: comp.id,
        componentName: comp.name,
        recipeName: recipe?.name ?? null,
        recipeId: comp.recipe_id,
        dishName: dish?.course_name ?? 'Unknown',
        courseName: dish?.course_name ?? 'Unknown',
        courseNumber: dish?.course_number ?? 0,
        category: recipe?.category ?? comp.category ?? null,
        prepStation: comp.prep_station ?? null,
        holdClass: recipe?.hold_class ?? null,
        prepTier: recipe?.prep_tier ?? null,
        activeMinutes: recipe?.active_prep_minutes ?? null,
        passiveMinutes: recipe?.passive_prep_minutes ?? null,
        totalMinutes: recipe?.prep_time_minutes ?? 30,
        peakHoursMin: recipe?.peak_hours_min ?? null,
        peakHoursMax: recipe?.peak_hours_max ?? null,
        storageMethod: recipe?.storage_method ?? null,
        freezable: recipe?.freezable ?? false,
        ingredients: compIngredients,
      }
    })

    // Build equipment list
    const equipment: MiseEquipment[] = (equipmentResult.data ?? []).map((eq: any) => ({
      id: eq.id,
      name: eq.equipment_name,
      category: eq.category,
      quantity: eq.quantity,
      source: eq.source,
      packed: eq.packed,
      returned: eq.returned,
      notes: eq.notes,
    }))

    // Compute prep timeline for deadline info
    let groceryDeadline: string | null = null
    let prepDeadline: string | null = null
    try {
      const serviceDate = new Date(event.event_date)
      const timeStr = event.serve_time || event.event_time
      if (timeStr) {
        const [h, m] = timeStr.split(':').map(Number)
        serviceDate.setHours(h, m, 0, 0)
      } else {
        serviceDate.setHours(18, 0, 0, 0)
      }

      const timelineItems: TimelineRecipeInput[] = rawComponents
        .filter((c) => c.recipeId)
        .map((c) => ({
          recipeId: c.recipeId!,
          recipeName: c.recipeName ?? c.componentName,
          componentName: c.componentName,
          dishName: c.dishName,
          courseName: c.courseName,
          category: c.category,
          peakHoursMin: c.peakHoursMin,
          peakHoursMax: c.peakHoursMax,
          safetyHoursMax: null,
          storageMethod: c.storageMethod,
          freezable: c.freezable,
          frozenExtendsHours: null,
          prepTimeMinutes: c.totalMinutes,
          activeMinutes: c.activeMinutes,
          passiveMinutes: c.passiveMinutes,
          holdClass: c.holdClass,
          prepTier: c.prepTier,
          allergenFlags: [],
          makeAheadWindowHours: null,
        }))

      if (timelineItems.length > 0) {
        const timeline = computePrepTimeline(timelineItems, serviceDate)
        groceryDeadline = timeline.groceryDeadline?.toISOString() ?? null
        prepDeadline = timeline.prepDeadline?.toISOString() ?? null
      }
    } catch {
      // Timeline computation failure is non-blocking
    }

    // Build the board
    const eventName = event.title || event.occasion || 'Event'

    const rawInput: MiseRawInput = {
      eventId,
      eventName,
      eventDate: event.event_date,
      serveTime: event.serve_time || event.event_time,
      guestCount: event.guest_count,
      serviceStyle: event.service_style,
      clientName,
      components: rawComponents,
      equipment,
      prepCompletions,
      groceryDeadline,
      prepDeadline,
    }

    const board = buildMiseEnPlace(rawInput)
    return { board }
  } catch (err: any) {
    console.error('[getMiseEnPlace]', err)
    return { board: null, error: 'Failed to build mise en place.' }
  }
}

// Toggle mise en place item completion (reuses prep_completions table)
export async function toggleMiseItem(
  eventId: string,
  itemKey: string,
  completed: boolean
): Promise<{ success: boolean }> {
  // Delegate to existing prep completion system
  const { togglePrepCompletion } = await import('@/lib/prep-timeline/actions')
  return togglePrepCompletion(eventId, itemKey, completed)
}

// Toggle equipment packed status
export async function toggleEquipmentPacked(
  eventId: string,
  equipmentId: string,
  packed: boolean
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    await db
      .from('event_equipment_checklist')
      .update({ packed, updated_at: new Date().toISOString() })
      .eq('id', equipmentId)
      .eq('event_id', eventId)
      .eq('chef_id', user.tenantId!)

    return { success: true }
  } catch (err: any) {
    console.error('[toggleEquipmentPacked]', err)
    return { success: false }
  }
}
