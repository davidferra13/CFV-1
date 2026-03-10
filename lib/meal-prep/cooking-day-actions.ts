// Cooking Day Execution Workflow
// Assembly-line task breakdown for batch cooking day.
// All task generation is deterministic (Formula > AI).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- Types ----

export type CookingTaskPhase = 'prep' | 'cook' | 'portion' | 'label' | 'pack'

export type CookingTask = {
  taskKey: string
  phase: CookingTaskPhase
  title: string
  recipe: string | null
  totalPortions: number
  clients: string[]
  estimatedMinutes: number
  notes: string | null
  dependsOn: string[]
  completed: boolean
}

export type CookingDayPlan = {
  weekStartDate: string
  tasks: CookingTask[]
  createdAt: string
  completedAt: string | null
}

export type CookingDayProgress = {
  completed: number
  total: number
}

// Phase ordering for display
const PHASE_ORDER: CookingTaskPhase[] = ['prep', 'cook', 'portion', 'label', 'pack']

const PHASE_LABELS: Record<CookingTaskPhase, string> = {
  prep: 'Prep',
  cook: 'Cook',
  portion: 'Portion',
  label: 'Label',
  pack: 'Pack',
}

// Estimated minutes by phase type
const PHASE_BASE_MINUTES: Record<CookingTaskPhase, number> = {
  prep: 15,
  cook: 30,
  portion: 10,
  label: 5,
  pack: 5,
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

// ---- Actions ----

/**
 * Generate a cooking day task breakdown for all active meal prep programs.
 * Groups by recipe/dish, scales to total portions, orders by prep time.
 */
export async function generateCookingDayPlan(weekStartDate: string): Promise<CookingDayPlan> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // 1. Get all active meal prep programs with client info
  const { data: programs, error: progErr } = await supabase
    .from('meal_prep_programs')
    .select(
      `
      id,
      client_id,
      current_rotation_week,
      client:clients(id, full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'active')

  if (progErr) {
    console.error('[generateCookingDayPlan] Programs error:', progErr)
    throw new Error('Failed to load meal prep programs')
  }

  if (!programs || programs.length === 0) {
    return {
      weekStartDate,
      tasks: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
  }

  const programIds = programs.map((p: any) => p.id)

  // 2. Get current rotation weeks
  const { data: weeks } = await supabase
    .from('meal_prep_weeks')
    .select('id, program_id, rotation_week, menu_id, custom_dishes')
    .in('program_id', programIds)
    .eq('tenant_id', user.tenantId!)

  const currentWeeks = (weeks || []).filter((w: any) =>
    programs.some((p: any) => p.id === w.program_id && p.current_rotation_week === w.rotation_week)
  )

  // 3. Collect all dishes across all programs
  type DishInfo = {
    name: string
    recipeId: string | null
    recipeName: string | null
    clients: string[]
    portionsPerClient: number
  }

  const dishMap = new Map<string, DishInfo>()
  const menuIds = currentWeeks.filter((w: any) => w.menu_id).map((w: any) => w.menu_id)

  // Get dishes from menus
  if (menuIds.length > 0) {
    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, name, menu_id, recipe_id')
      .in('menu_id', menuIds)
      .eq('tenant_id', user.tenantId!)

    // Get recipe details
    const recipeIds = (dishes || []).filter((d: any) => d.recipe_id).map((d: any) => d.recipe_id)

    let recipeMap = new Map<
      string,
      { name: string; servings: number; prep_time_minutes: number | null }
    >()
    if (recipeIds.length > 0) {
      const { data: recipes } = await supabase
        .from('recipes')
        .select('id, title, servings, prep_time_minutes')
        .in('id', recipeIds)
        .eq('tenant_id', user.tenantId!)

      if (recipes) {
        for (const r of recipes) {
          recipeMap.set(r.id, {
            name: r.title,
            servings: r.servings || 1,
            prep_time_minutes: r.prep_time_minutes,
          })
        }
      }
    }

    for (const dish of dishes || []) {
      // Find which program this belongs to
      const week = currentWeeks.find((w: any) => w.menu_id === dish.menu_id)
      if (!week) continue
      const program = programs.find((p: any) => p.id === week.program_id)
      if (!program) continue

      const clientName = (program.client as any)?.full_name || 'Unknown'
      const recipe = dish.recipe_id ? recipeMap.get(dish.recipe_id) : null
      const key = dish.recipe_id || `custom_${slugify(dish.name)}`

      if (dishMap.has(key)) {
        const existing = dishMap.get(key)!
        if (!existing.clients.includes(clientName)) {
          existing.clients.push(clientName)
        }
        existing.portionsPerClient += recipe?.servings || 1
      } else {
        dishMap.set(key, {
          name: dish.name,
          recipeId: dish.recipe_id,
          recipeName: recipe?.name || null,
          clients: [clientName],
          portionsPerClient: recipe?.servings || 1,
        })
      }
    }
  }

  // Add custom dishes from weeks
  for (const week of currentWeeks) {
    const customDishes = week.custom_dishes || []
    if (!Array.isArray(customDishes)) continue

    const program = programs.find((p: any) => p.id === week.program_id)
    if (!program) continue
    const clientName = (program.client as any)?.full_name || 'Unknown'

    for (const cd of customDishes) {
      if (!cd.name) continue
      const key = `custom_${slugify(cd.name)}`

      if (dishMap.has(key)) {
        const existing = dishMap.get(key)!
        if (!existing.clients.includes(clientName)) {
          existing.clients.push(clientName)
        }
        existing.portionsPerClient += cd.servings || 1
      } else {
        dishMap.set(key, {
          name: cd.name,
          recipeId: null,
          recipeName: null,
          clients: [clientName],
          portionsPerClient: cd.servings || 1,
        })
      }
    }
  }

  // 4. Generate tasks for each dish across all 5 phases
  const tasks: CookingTask[] = []
  const dishEntries = Array.from(dishMap.entries())

  // Sort dishes: longest prep first (proteins before vegetables conceptually)
  dishEntries.sort((a, b) => {
    // Proteins and large items first
    const aName = a[1].name.toLowerCase()
    const bName = b[1].name.toLowerCase()
    const proteinKeywords = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'steak', 'turkey']
    const aIsProtein = proteinKeywords.some((k) => aName.includes(k))
    const bIsProtein = proteinKeywords.some((k) => bName.includes(k))
    if (aIsProtein && !bIsProtein) return -1
    if (!aIsProtein && bIsProtein) return 1
    return aName.localeCompare(bName)
  })

  for (const [key, dish] of dishEntries) {
    const dishSlug = slugify(dish.name)
    const totalPortions = dish.portionsPerClient * dish.clients.length
    const clientList = dish.clients.join(', ')
    const portionText = `${dish.clients.length} client${dish.clients.length > 1 ? 's' : ''}, ${totalPortions} portions`

    // Prep phase
    tasks.push({
      taskKey: `prep_${dishSlug}`,
      phase: 'prep',
      title: `Prep: Wash, chop, season for ${dish.name} (${portionText})`,
      recipe: dish.recipeName || dish.name,
      totalPortions,
      clients: dish.clients,
      estimatedMinutes: Math.max(10, Math.round(PHASE_BASE_MINUTES.prep * (totalPortions / 4))),
      notes: dish.recipeId ? 'Follow recipe instructions for prep' : null,
      dependsOn: [],
      completed: false,
    })

    // Cook phase
    tasks.push({
      taskKey: `cook_${dishSlug}`,
      phase: 'cook',
      title: `Cook: ${dish.name} (${portionText})`,
      recipe: dish.recipeName || dish.name,
      totalPortions,
      clients: dish.clients,
      estimatedMinutes: Math.max(15, Math.round(PHASE_BASE_MINUTES.cook * (totalPortions / 4))),
      notes: null,
      dependsOn: [`prep_${dishSlug}`],
      completed: false,
    })

    // Portion phase
    tasks.push({
      taskKey: `portion_${dishSlug}`,
      phase: 'portion',
      title: `Portion: Divide ${dish.name} into ${totalPortions} containers`,
      recipe: dish.recipeName || dish.name,
      totalPortions,
      clients: dish.clients,
      estimatedMinutes: Math.max(5, Math.round(PHASE_BASE_MINUTES.portion * (totalPortions / 4))),
      notes: `${dish.clients.map((c) => `${c}: ${dish.portionsPerClient} portions`).join('; ')}`,
      dependsOn: [`cook_${dishSlug}`],
      completed: false,
    })
  }

  // Add global label and pack tasks (one per client, not per dish)
  const allClients = new Set<string>()
  for (const dish of dishMap.values()) {
    for (const c of dish.clients) allClients.add(c)
  }

  const clientArray = Array.from(allClients)
  const totalContainers = Array.from(dishMap.values()).reduce(
    (sum, d) => sum + d.portionsPerClient * d.clients.length,
    0
  )

  // All portion tasks must complete before labeling
  const allPortionKeys = dishEntries.map(([, d]) => `portion_${slugify(d.name)}`)

  tasks.push({
    taskKey: 'label_all',
    phase: 'label',
    title: `Label: Print and apply labels for ${totalContainers} containers`,
    recipe: null,
    totalPortions: totalContainers,
    clients: clientArray,
    estimatedMinutes: Math.max(5, Math.round(totalContainers * 1.5)),
    notes: 'Include dish name, date, reheating instructions, allergens',
    dependsOn: allPortionKeys,
    completed: false,
  })

  // Pack per client
  for (const clientName of clientArray) {
    const clientSlug = slugify(clientName)
    const clientPortions = Array.from(dishMap.values())
      .filter((d) => d.clients.includes(clientName))
      .reduce((sum, d) => sum + d.portionsPerClient, 0)

    tasks.push({
      taskKey: `pack_${clientSlug}`,
      phase: 'pack',
      title: `Pack: Organize ${clientPortions} containers for ${clientName}`,
      recipe: null,
      totalPortions: clientPortions,
      clients: [clientName],
      estimatedMinutes: Math.max(3, Math.round(clientPortions * 1)),
      notes: 'Group by storage type (fridge vs freezer), add delivery notes',
      dependsOn: ['label_all'],
      completed: false,
    })
  }

  // Sort tasks by phase order
  tasks.sort((a, b) => {
    const phaseA = PHASE_ORDER.indexOf(a.phase)
    const phaseB = PHASE_ORDER.indexOf(b.phase)
    return phaseA - phaseB
  })

  // Save the plan
  const plan: CookingDayPlan = {
    weekStartDate,
    tasks,
    createdAt: new Date().toISOString(),
    completedAt: null,
  }

  // Store in shopping_lists table with a special name prefix for identification
  const { error: saveErr } = await supabase.from('shopping_lists').upsert(
    {
      chef_id: user.tenantId!,
      name: `__cooking_day_plan__${weekStartDate}`,
      event_id: null,
      items: JSON.stringify(plan),
      status: 'active',
      total_estimated_cents: null,
    },
    {
      onConflict: 'chef_id,name',
      ignoreDuplicates: false,
    }
  )

  // If upsert fails (no unique constraint on name), try insert or update manually
  if (saveErr) {
    // Check if exists
    const { data: existing } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('chef_id', user.tenantId!)
      .eq('name', `__cooking_day_plan__${weekStartDate}`)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('shopping_lists')
        .update({ items: JSON.stringify(plan) })
        .eq('id', existing.id)
        .eq('chef_id', user.tenantId!)
    } else {
      const { error: insertErr } = await supabase.from('shopping_lists').insert({
        chef_id: user.tenantId!,
        name: `__cooking_day_plan__${weekStartDate}`,
        event_id: null,
        items: JSON.stringify(plan),
        status: 'active',
        total_estimated_cents: null,
      })

      if (insertErr) {
        console.error('[generateCookingDayPlan] Save error:', insertErr)
        // Don't throw, the plan is still usable in memory
      }
    }
  }

  revalidatePath('/meal-prep/cooking-day')
  return plan
}

/**
 * Retrieve a saved cooking day plan for a given week.
 */
export async function getCookingDayPlan(weekStartDate: string): Promise<CookingDayPlan | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('shopping_lists')
    .select('items')
    .eq('chef_id', user.tenantId!)
    .eq('name', `__cooking_day_plan__${weekStartDate}`)
    .maybeSingle()

  if (error || !data) return null

  try {
    const plan = typeof data.items === 'string' ? JSON.parse(data.items) : data.items
    return plan as CookingDayPlan
  } catch {
    return null
  }
}

/**
 * Toggle a cooking task's completion status.
 */
export async function toggleCookingTask(
  weekStartDate: string,
  taskKey: string
): Promise<{ completed: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch current plan
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('id, items')
    .eq('chef_id', user.tenantId!)
    .eq('name', `__cooking_day_plan__${weekStartDate}`)
    .single()

  if (error || !data) {
    throw new Error('Cooking day plan not found')
  }

  const plan: CookingDayPlan = typeof data.items === 'string' ? JSON.parse(data.items) : data.items

  const task = plan.tasks.find((t) => t.taskKey === taskKey)
  if (!task) {
    throw new Error('Task not found in plan')
  }

  task.completed = !task.completed

  // Check if all tasks are complete
  const allDone = plan.tasks.every((t) => t.completed)
  if (allDone) {
    plan.completedAt = new Date().toISOString()
  } else {
    plan.completedAt = null
  }

  // Save updated plan
  const { error: updateErr } = await supabase
    .from('shopping_lists')
    .update({ items: JSON.stringify(plan) })
    .eq('id', data.id)
    .eq('chef_id', user.tenantId!)

  if (updateErr) {
    console.error('[toggleCookingTask] Update error:', updateErr)
    throw new Error('Failed to update task')
  }

  revalidatePath('/meal-prep/cooking-day')
  return { completed: task.completed }
}

/**
 * Get cooking day progress for a given week.
 */
export async function getCookingDayProgress(weekStartDate: string): Promise<CookingDayProgress> {
  const plan = await getCookingDayPlan(weekStartDate)
  if (!plan) return { completed: 0, total: 0 }

  return {
    completed: plan.tasks.filter((t) => t.completed).length,
    total: plan.tasks.length,
  }
}
