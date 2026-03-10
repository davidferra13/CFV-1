// Batch Shopping Consolidation for Meal Prep
// Aggregates ingredients across ALL clients' meal plans for one weekly shopping trip.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ShoppingItem } from '@/lib/shopping/actions'

// ---- Types ----

export type BatchShoppingClient = {
  clientId: string
  clientName: string
  quantity: number
  programId: string
}

export type BatchShoppingItem = {
  ingredientName: string
  totalQuantity: number
  unit: string
  category: string // Produce, Protein, Dairy, Pantry, etc.
  estimatedCostCents: number | null
  clients: BatchShoppingClient[]
}

export type BatchShoppingData = {
  weekStartDate: string
  programs: {
    id: string
    clientId: string
    clientName: string
    rotationWeek: number
    dishes: string[]
  }[]
  items: BatchShoppingItem[]
  totalEstimatedCents: number
  clientTotals: { clientId: string; clientName: string; estimatedCents: number }[]
}

// Category mapping from DB ingredient categories to shopping categories
const CATEGORY_MAP: Record<string, string> = {
  produce: 'Produce',
  fresh_herb: 'Produce',
  dry_herb: 'Spices/Seasonings',
  protein: 'Protein',
  dairy: 'Dairy',
  pantry: 'Pantry',
  baking: 'Pantry',
  canned: 'Pantry',
  condiment: 'Pantry',
  spice: 'Spices/Seasonings',
  oil: 'Pantry',
  frozen: 'Frozen',
  beverage: 'Beverages',
  alcohol: 'Beverages',
  specialty: 'Other',
  other: 'Other',
}

function mapCategory(dbCategory: string): string {
  return CATEGORY_MAP[dbCategory] || 'Other'
}

function normalizeItemName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

// ---- Actions ----

/**
 * Get a consolidated shopping list across all active meal prep programs for a given week.
 * Aggregates recipe ingredients from each program's current rotation week.
 */
export async function getBatchShoppingList(weekStartDate: string): Promise<BatchShoppingData> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // 1. Find all active meal prep programs
  const { data: programs, error: progErr } = await supabase
    .from('meal_prep_programs')
    .select(
      `
      id,
      client_id,
      current_rotation_week,
      rotation_weeks,
      client:clients(id, full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'active')

  if (progErr) {
    console.error('[getBatchShoppingList] Programs query error:', progErr)
    throw new Error('Failed to load meal prep programs')
  }

  if (!programs || programs.length === 0) {
    return {
      weekStartDate,
      programs: [],
      items: [],
      totalEstimatedCents: 0,
      clientTotals: [],
    }
  }

  const programIds = programs.map((p: any) => p.id)

  // 2. Get the current rotation week's data for each program
  const weekQueries = programs.map((p: any) => ({
    programId: p.id,
    rotationWeek: p.current_rotation_week,
  }))

  // Fetch all meal prep weeks for these programs
  const { data: weeks, error: weekErr } = await supabase
    .from('meal_prep_weeks')
    .select(
      `
      id,
      program_id,
      rotation_week,
      menu_id,
      custom_dishes
    `
    )
    .in('program_id', programIds)
    .eq('tenant_id', user.tenantId!)

  if (weekErr) {
    console.error('[getBatchShoppingList] Weeks query error:', weekErr)
    throw new Error('Failed to load meal prep weeks')
  }

  // Match each program to its current rotation week
  const currentWeeks = (weeks || []).filter((w: any) =>
    weekQueries.some((q) => q.programId === w.program_id && q.rotationWeek === w.rotation_week)
  )

  // 3. Collect menu IDs to fetch recipe ingredients
  const menuIds = currentWeeks.filter((w: any) => w.menu_id).map((w: any) => w.menu_id)

  // Build program info for response
  const programInfos = programs.map((p: any) => {
    const week = currentWeeks.find((w: any) => w.program_id === p.id)
    const customDishes = week?.custom_dishes || []
    return {
      id: p.id,
      clientId: p.client_id,
      clientName: (p.client as any)?.full_name || 'Unknown Client',
      rotationWeek: p.current_rotation_week,
      dishes: customDishes.map((d: any) => d.name || 'Untitled'),
    }
  })

  // 4. Get dishes from the menus, then recipe ingredients
  const allItems: {
    name: string
    quantity: number
    unit: string
    category: string
    estimatedCostCents: number | null
    clientId: string
    clientName: string
    programId: string
  }[] = []

  if (menuIds.length > 0) {
    // Get dishes linked to these menus
    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, name, menu_id, recipe_id')
      .in('menu_id', menuIds)
      .eq('tenant_id', user.tenantId!)

    if (dishes && dishes.length > 0) {
      // Get recipe IDs from dishes
      const recipeIds = dishes.filter((d: any) => d.recipe_id).map((d: any) => d.recipe_id)

      if (recipeIds.length > 0) {
        // Get recipe ingredients with ingredient details
        const { data: recipeIngredients } = await supabase
          .from('recipe_ingredients')
          .select(
            `
            recipe_id,
            quantity,
            unit,
            ingredient:ingredients(id, name, category, last_price_cents, price_unit)
          `
          )
          .in('recipe_id', recipeIds)

        if (recipeIngredients) {
          // Map recipe_id -> dish -> menu -> program -> client
          for (const ri of recipeIngredients) {
            const ingredient = (ri as any).ingredient
            if (!ingredient) continue

            // Find which dishes use this recipe
            const matchingDishes = dishes.filter((d: any) => d.recipe_id === ri.recipe_id)

            for (const dish of matchingDishes) {
              // Find which program this menu belongs to
              const matchingWeek = currentWeeks.find((w: any) => w.menu_id === dish.menu_id)
              if (!matchingWeek) continue

              const program = programs.find((p: any) => p.id === matchingWeek.program_id)
              if (!program) continue

              const clientName = (program.client as any)?.full_name || 'Unknown Client'

              // Add dish name to program info
              const progInfo = programInfos.find((pi) => pi.id === program.id)
              if (progInfo && !progInfo.dishes.includes(dish.name)) {
                progInfo.dishes.push(dish.name)
              }

              allItems.push({
                name: ingredient.name,
                quantity: Number(ri.quantity) || 0,
                unit: ri.unit,
                category: mapCategory(ingredient.category),
                estimatedCostCents: ingredient.last_price_cents
                  ? Math.round(Number(ri.quantity) * ingredient.last_price_cents)
                  : null,
                clientId: program.client_id,
                clientName,
                programId: program.id,
              })
            }
          }
        }
      }
    }
  }

  // 5. Also add custom dish names (no recipe link, so no ingredients to aggregate)
  // Custom dishes without recipes just appear in the program info, not in the shopping list

  // 6. Aggregate: same ingredient + same unit = sum quantities
  const merged = new Map<string, BatchShoppingItem>()

  for (const item of allItems) {
    const key = `${normalizeItemName(item.name)}|${item.unit.toLowerCase()}`

    if (merged.has(key)) {
      const existing = merged.get(key)!
      existing.totalQuantity += item.quantity
      if (item.estimatedCostCents) {
        existing.estimatedCostCents = (existing.estimatedCostCents ?? 0) + item.estimatedCostCents
      }
      // Add client if not already present
      const existingClient = existing.clients.find(
        (c) => c.clientId === item.clientId && c.programId === item.programId
      )
      if (existingClient) {
        existingClient.quantity += item.quantity
      } else {
        existing.clients.push({
          clientId: item.clientId,
          clientName: item.clientName,
          quantity: item.quantity,
          programId: item.programId,
        })
      }
    } else {
      merged.set(key, {
        ingredientName: item.name,
        totalQuantity: item.quantity,
        unit: item.unit,
        category: item.category,
        estimatedCostCents: item.estimatedCostCents,
        clients: [
          {
            clientId: item.clientId,
            clientName: item.clientName,
            quantity: item.quantity,
            programId: item.programId,
          },
        ],
      })
    }
  }

  // Sort by category then name
  const items = Array.from(merged.values()).sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category)
    if (catCmp !== 0) return catCmp
    return a.ingredientName.localeCompare(b.ingredientName)
  })

  const totalEstimatedCents = items.reduce((sum, item) => sum + (item.estimatedCostCents ?? 0), 0)

  // Per-client cost breakdown
  const clientCostMap = new Map<string, { clientName: string; cents: number }>()
  for (const item of items) {
    for (const client of item.clients) {
      const existing = clientCostMap.get(client.clientId)
      const clientPortion =
        item.estimatedCostCents && item.totalQuantity > 0
          ? Math.round((client.quantity / item.totalQuantity) * item.estimatedCostCents)
          : 0
      if (existing) {
        existing.cents += clientPortion
      } else {
        clientCostMap.set(client.clientId, {
          clientName: client.clientName,
          cents: clientPortion,
        })
      }
    }
  }

  const clientTotals = Array.from(clientCostMap.entries()).map(([clientId, data]) => ({
    clientId,
    clientName: data.clientName,
    estimatedCents: data.cents,
  }))

  return {
    weekStartDate,
    programs: programInfos,
    items,
    totalEstimatedCents,
    clientTotals,
  }
}

/**
 * Save the batch shopping list as a real shopping list in the DB.
 */
export async function createBatchShoppingList(
  weekStartDate: string
): Promise<{ success: true; id: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const data = await getBatchShoppingList(weekStartDate)

  if (data.items.length === 0) {
    throw new Error('No ingredients found for active meal prep programs this week')
  }

  // Convert to ShoppingItem format
  const items: ShoppingItem[] = data.items.map((bi) => ({
    name: bi.ingredientName,
    quantity: bi.totalQuantity,
    unit: bi.unit,
    category: bi.category,
    checked: false,
    estimated_price_cents: bi.estimatedCostCents,
    actual_price_cents: null,
    vendor: null,
    notes:
      bi.clients.length > 1
        ? `For: ${bi.clients.map((c) => c.clientName).join(', ')}`
        : bi.clients.length === 1
          ? `For: ${bi.clients[0].clientName}`
          : null,
  }))

  const weekDate = new Date(weekStartDate + 'T00:00:00')
  const formattedDate = weekDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const listName = `Meal Prep Batch: Week of ${formattedDate}`

  const { data: inserted, error } = await supabase
    .from('shopping_lists')
    .insert({
      chef_id: user.tenantId!,
      name: listName,
      event_id: null,
      items: JSON.stringify(items),
      status: 'active',
      total_estimated_cents: data.totalEstimatedCents || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createBatchShoppingList] Error:', error)
    throw new Error('Failed to create batch shopping list')
  }

  revalidatePath('/shopping')
  revalidatePath('/meal-prep/shopping')

  return { success: true, id: (inserted as any).id }
}

/**
 * After shopping is complete, allocate actual costs proportionally across clients
 * based on their ingredient usage share.
 */
export async function allocateCostToClients(shoppingListId: string): Promise<{
  success: true
  allocations: { clientId: string; clientName: string; amountCents: number }[]
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch the completed shopping list
  const { data: list, error: fetchErr } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('id', shoppingListId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchErr || !list) {
    throw new Error('Shopping list not found')
  }

  const items: ShoppingItem[] =
    typeof list.items === 'string' ? JSON.parse(list.items) : list.items || []

  const totalActualCents = items.reduce((sum, item) => sum + (item.actual_price_cents || 0), 0)
  const totalEstimatedCents = items.reduce(
    (sum, item) => sum + (item.estimated_price_cents || 0),
    0
  )

  // Use actual if available, otherwise estimated
  const totalCents = totalActualCents || totalEstimatedCents
  if (totalCents <= 0) {
    throw new Error('No cost data available for allocation')
  }

  // Parse client info from item notes to calculate proportional allocation
  // Notes format: "For: ClientA, ClientB" or "For: ClientA"
  const clientUsage = new Map<string, { name: string; itemCount: number }>()

  for (const item of items) {
    if (item.notes && item.notes.startsWith('For: ')) {
      const clientNames = item.notes.replace('For: ', '').split(', ')
      for (const name of clientNames) {
        const existing = clientUsage.get(name)
        if (existing) {
          existing.itemCount += 1
        } else {
          clientUsage.set(name, { name, itemCount: 1 })
        }
      }
    }
  }

  // If no client info in notes, return even split
  const clientCount = clientUsage.size || 1
  const totalItemUsage = Array.from(clientUsage.values()).reduce((sum, c) => sum + c.itemCount, 0)

  const allocations = Array.from(clientUsage.entries()).map(([name, data]) => ({
    clientId: name, // Using name as identifier since we don't have ID in notes
    clientName: data.name,
    amountCents:
      totalItemUsage > 0
        ? Math.round((data.itemCount / totalItemUsage) * totalCents)
        : Math.round(totalCents / clientCount),
  }))

  return { success: true, allocations }
}
