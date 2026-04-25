'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  ensureRecurringClientCircle,
  postRecurringLifecycleMessage,
} from '@/lib/recurring/circle-bridge'

// ============================================
// Types
// ============================================

export interface MealPrepProgram {
  id: string
  tenant_id: string
  recurring_service_id: string
  client_id: string
  delivery_day: number
  delivery_window_start: string
  delivery_window_end: string
  delivery_address: string | null
  delivery_instructions: string | null
  containers_out: number
  containers_returned: number
  container_deposit_cents: number
  rotation_weeks: number
  current_rotation_week: number
  status: 'active' | 'paused' | 'ended'
  created_at: string
  updated_at: string
  // Joined fields
  client?: { id: string; full_name: string } | null
  recurring_service?: {
    id: string
    service_type: string
    frequency: string
    rate_cents: number
  } | null
}

export interface MealPrepWeek {
  id: string
  program_id: string
  tenant_id: string
  rotation_week: number
  menu_id: string | null
  custom_dishes: any[]
  notes: string | null
  prepped_at: string | null
  delivered_at: string | null
  containers_sent: number
  containers_back: number
  created_at: string
  updated_at: string
  // Joined
  menu?: { id: string; title: string } | null
}

// ============================================
// Validation Schemas
// ============================================

const createProgramSchema = z.object({
  recurring_service_id: z.string().uuid(),
  client_id: z.string().uuid(),
  delivery_day: z.number().int().min(0).max(6).default(1),
  delivery_window_start: z.string().default('10:00'),
  delivery_window_end: z.string().default('14:00'),
  delivery_address: z.string().optional(),
  delivery_instructions: z.string().optional(),
  container_deposit_cents: z.number().int().min(0).default(0),
  rotation_weeks: z.number().int().min(1).max(12).default(4),
})

const updateProgramSchema = z.object({
  delivery_day: z.number().int().min(0).max(6).optional(),
  delivery_window_start: z.string().optional(),
  delivery_window_end: z.string().optional(),
  delivery_address: z.string().nullable().optional(),
  delivery_instructions: z.string().nullable().optional(),
  container_deposit_cents: z.number().int().min(0).optional(),
  rotation_weeks: z.number().int().min(1).max(12).optional(),
})

const assignWeekMenuSchema = z.object({
  programId: z.string().uuid(),
  rotationWeek: z.number().int().min(1).max(12),
  menuId: z.string().uuid().nullable().optional(),
  customDishes: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        servings: z.number().optional(),
      })
    )
    .optional(),
  notes: z.string().nullable().optional(),
})

// ============================================
// Actions
// ============================================

export async function createMealPrepProgram(input: z.infer<typeof createProgramSchema>) {
  const user = await requireChef()
  const db: any = createServerClient()
  const parsed = createProgramSchema.parse(input)

  // Verify the recurring service belongs to this tenant
  const { data: service, error: serviceErr } = await db
    .from('recurring_services')
    .select('id, client_id')
    .eq('id', parsed.recurring_service_id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (serviceErr || !service) {
    return { error: 'Recurring service not found or not yours' }
  }

  const { data, error } = await db
    .from('meal_prep_programs')
    .insert({
      tenant_id: user.tenantId!,
      recurring_service_id: parsed.recurring_service_id,
      client_id: parsed.client_id,
      delivery_day: parsed.delivery_day,
      delivery_window_start: parsed.delivery_window_start,
      delivery_window_end: parsed.delivery_window_end,
      delivery_address: parsed.delivery_address ?? null,
      delivery_instructions: parsed.delivery_instructions ?? null,
      container_deposit_cents: parsed.container_deposit_cents,
      rotation_weeks: parsed.rotation_weeks,
      current_rotation_week: 1,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  // Pre-create week slots for the rotation
  const weekInserts = Array.from({ length: parsed.rotation_weeks }, (_, i) => ({
    program_id: data.id,
    tenant_id: user.tenantId!,
    rotation_week: i + 1,
    custom_dishes: [],
    containers_sent: 0,
    containers_back: 0,
  }))

  await db.from('meal_prep_weeks').insert(weekInserts)

  revalidatePath('/meal-prep')

  // Bridge: ensure client has a dinner circle for meal prep communication
  try {
    await ensureRecurringClientCircle(user.tenantId!, parsed.client_id, 'Meal Prep')
    await postRecurringLifecycleMessage(
      user.tenantId!,
      parsed.client_id,
      `Meal prep program created with ${parsed.rotation_weeks}-week rotation cycle`
    )
  } catch (err) {
    console.error('[non-blocking] Meal prep circle bridge failed', err)
  }

  return { id: data.id }
}

export async function listMealPrepPrograms(): Promise<MealPrepProgram[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('meal_prep_programs')
    .select(
      `
      *,
      client:clients(id, full_name),
      recurring_service:recurring_services(id, service_type, frequency, rate_cents)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'ended')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[meal-prep] listPrograms error:', error.message)
    return []
  }

  return data ?? []
}

export async function getMealPrepProgram(id: string): Promise<MealPrepProgram | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('meal_prep_programs')
    .select(
      `
      *,
      client:clients(id, full_name),
      recurring_service:recurring_services(id, service_type, frequency, rate_cents)
    `
    )
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) return null
  return data
}

export async function getMealPrepWeeks(programId: string): Promise<MealPrepWeek[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('meal_prep_weeks')
    .select(
      `
      *,
      menu:menus(id, title)
    `
    )
    .eq('program_id', programId)
    .eq('tenant_id', user.tenantId!)
    .order('rotation_week', { ascending: true })

  if (error) {
    console.error('[meal-prep] getWeeks error:', error.message)
    return []
  }

  return data ?? []
}

export async function updateMealPrepProgram(
  id: string,
  updates: z.infer<typeof updateProgramSchema>
) {
  const user = await requireChef()
  const db: any = createServerClient()
  const parsed = updateProgramSchema.parse(updates)

  // Remove undefined fields
  const cleanUpdates = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined))

  if (Object.keys(cleanUpdates).length === 0) {
    return { error: 'No updates provided' }
  }

  const { error } = await db
    .from('meal_prep_programs')
    .update(cleanUpdates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/meal-prep/${id}`)
  revalidatePath('/meal-prep')
  return { success: true }
}

export async function pauseMealPrepProgram(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('meal_prep_programs')
    .update({ status: 'paused' })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'active')

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/meal-prep/${id}`)
  revalidatePath('/meal-prep')
  return { success: true }
}

export async function resumeMealPrepProgram(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('meal_prep_programs')
    .update({ status: 'active' })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'paused')

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/meal-prep/${id}`)
  revalidatePath('/meal-prep')
  return { success: true }
}

export async function endMealPrepProgram(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('meal_prep_programs')
    .update({ status: 'ended' })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/meal-prep/${id}`)
  revalidatePath('/meal-prep')
  return { success: true }
}

export async function recordContainerReturn(programId: string, count: number) {
  const user = await requireChef()
  const db: any = createServerClient()

  if (count <= 0) {
    return { error: 'Count must be positive' }
  }

  // Get current program
  const { data: program, error: fetchErr } = await db
    .from('meal_prep_programs')
    .select('containers_returned, containers_out')
    .eq('id', programId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !program) {
    return { error: 'Program not found' }
  }

  const newReturned = (program.containers_returned ?? 0) + count
  const newOut = Math.max(0, (program.containers_out ?? 0) - count)

  const { error } = await db
    .from('meal_prep_programs')
    .update({
      containers_returned: newReturned,
      containers_out: newOut,
    })
    .eq('id', programId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/meal-prep/${programId}`)
  revalidatePath('/meal-prep')
  return { success: true, containers_out: newOut, containers_returned: newReturned }
}

export async function assignWeekMenu(input: z.infer<typeof assignWeekMenuSchema>) {
  const user = await requireChef()
  const db: any = createServerClient()
  const parsed = assignWeekMenuSchema.parse(input)

  const updates: Record<string, any> = {}
  if (parsed.menuId !== undefined) updates.menu_id = parsed.menuId
  if (parsed.customDishes !== undefined) updates.custom_dishes = parsed.customDishes
  if (parsed.notes !== undefined) updates.notes = parsed.notes

  const { error } = await db
    .from('meal_prep_weeks')
    .update(updates)
    .eq('program_id', parsed.programId)
    .eq('rotation_week', parsed.rotationWeek)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/meal-prep/${parsed.programId}`)
  return { success: true }
}

export async function markWeekPrepped(programId: string, rotationWeek: number) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('meal_prep_weeks')
    .update({ prepped_at: new Date().toISOString() })
    .eq('program_id', programId)
    .eq('rotation_week', rotationWeek)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  // Post prep notification to circle
  try {
    const { data: prog } = await db
      .from('meal_prep_programs')
      .select('client_id')
      .eq('id', programId)
      .eq('tenant_id', user.tenantId!)
      .single()
    if (prog?.client_id) {
      await postRecurringLifecycleMessage(
        user.tenantId!,
        prog.client_id,
        `Week ${rotationWeek} meals prepped and ready`
      )
    }
  } catch (err) {
    console.error('[non-blocking] Prep circle notification failed', err)
  }

  revalidatePath(`/meal-prep/${programId}`)
  return { success: true }
}

export async function markWeekDelivered(
  programId: string,
  rotationWeek: number,
  containersSent: number
) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Mark the week as delivered
  const { error: weekErr } = await db
    .from('meal_prep_weeks')
    .update({
      delivered_at: new Date().toISOString(),
      containers_sent: containersSent,
    })
    .eq('program_id', programId)
    .eq('rotation_week', rotationWeek)
    .eq('tenant_id', user.tenantId!)

  if (weekErr) {
    return { error: weekErr.message }
  }

  // Post delivery notification to circle
  try {
    const { data: prog } = await db
      .from('meal_prep_programs')
      .select('client_id')
      .eq('id', programId)
      .eq('tenant_id', user.tenantId!)
      .single()
    if (prog?.client_id) {
      await postRecurringLifecycleMessage(
        user.tenantId!,
        prog.client_id,
        `Week ${rotationWeek} meals delivered`
      )
    }
  } catch (err) {
    console.error('[non-blocking] Delivery circle notification failed', err)
  }

  // Update the program container count
  const { data: program } = await db
    .from('meal_prep_programs')
    .select('containers_out')
    .eq('id', programId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (program) {
    await db
      .from('meal_prep_programs')
      .update({ containers_out: (program.containers_out ?? 0) + containersSent })
      .eq('id', programId)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath(`/meal-prep/${programId}`)
  revalidatePath('/meal-prep')
  return { success: true }
}

export async function advanceRotation(programId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: program, error: fetchErr } = await db
    .from('meal_prep_programs')
    .select('current_rotation_week, rotation_weeks')
    .eq('id', programId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !program) {
    return { error: 'Program not found' }
  }

  // Wrap around to week 1 after reaching the end
  const nextWeek =
    program.current_rotation_week >= program.rotation_weeks ? 1 : program.current_rotation_week + 1

  const { error } = await db
    .from('meal_prep_programs')
    .update({ current_rotation_week: nextWeek })
    .eq('id', programId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/meal-prep/${programId}`)
  revalidatePath('/meal-prep')
  return { success: true, current_rotation_week: nextWeek }
}

// ============================================
// Smart Rotation: Menu Suggestion
// ============================================

/**
 * Suggests the next menu for a meal prep week by avoiding recently used menus.
 * Looks at the last `repeatWindowWeeks` delivered weeks and excludes their menus.
 * If all menus have been used recently, returns the least recently used one.
 *
 * @param programId  - the meal prep program
 * @param repeatWindowWeeks - how many past deliveries to treat as "recent" (default 3)
 */
export async function suggestNextWeekMenu(
  programId: string,
  repeatWindowWeeks: number = 3
): Promise<{ menuId: string | null; menuTitle: string | null; reason: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch the most recently delivered weeks for this program
  const { data: deliveredWeeks, error: weeksErr } = await db
    .from('meal_prep_weeks')
    .select('menu_id, delivered_at')
    .eq('program_id', programId)
    .eq('tenant_id', user.tenantId!)
    .not('delivered_at', 'is', null)
    .not('menu_id', 'is', null)
    .order('delivered_at', { ascending: false })
    .limit(repeatWindowWeeks)

  if (weeksErr) {
    return { menuId: null, menuTitle: null, reason: 'Could not load delivery history' }
  }

  const recentMenuIds = new Set<string>(
    ((deliveredWeeks ?? []) as { menu_id: string }[]).map((w) => w.menu_id).filter(Boolean)
  )

  // Fetch all menus for this tenant
  const { data: allMenus, error: menusErr } = await db
    .from('menus')
    .select('id, title')
    .eq('tenant_id', user.tenantId!)
    .order('title')

  if (menusErr || !allMenus || (allMenus as { id: string; title: string }[]).length === 0) {
    return { menuId: null, menuTitle: null, reason: 'No menus available' }
  }

  const menus = allMenus as { id: string; title: string }[]

  // AI-enhanced rotation: considers client prefs, season, variety (non-blocking)
  try {
    const { suggestMealPrepRotation } = await import('@/lib/ai/meal-prep-rotation')

    // Fetch client details for AI context
    const { data: program } = await db
      .from('meal_prep_programs')
      .select('client_id')
      .eq('id', programId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (program?.client_id) {
      const { data: client } = await db
        .from('clients')
        .select('full_name, dietary_restrictions, allergies')
        .eq('id', program.client_id)
        .eq('tenant_id', user.tenantId!)
        .single()

      if (client) {
        const recentMenuTitles = menus.filter((m) => recentMenuIds.has(m.id)).map((m) => m.title)

        const aiResult = await suggestMealPrepRotation({
          clientName: client.full_name ?? 'Client',
          dietaryRestrictions: (client.dietary_restrictions as string[]) ?? [],
          allergies: (client.allergies as string[]) ?? [],
          recentMenuTitles,
          availableMenus: menus,
        })

        if (aiResult) {
          const match = menus.find((m) => m.id === aiResult.menuId)
          if (match) {
            return { menuId: match.id, menuTitle: match.title, reason: aiResult.reason }
          }
        }
      }
    }
  } catch {
    // AI unavailable, fall through to deterministic logic
  }

  // Deterministic fallback: prefer menus not in the recent window
  const unused = menus.filter((m) => !recentMenuIds.has(m.id))
  if (unused.length > 0) {
    return {
      menuId: unused[0].id,
      menuTitle: unused[0].title,
      reason: `Not used in the last ${repeatWindowWeeks} deliveries`,
    }
  }

  // All menus used recently: pick the least recently used one
  const recentOrder = ((deliveredWeeks ?? []) as { menu_id: string }[]).map((w) => w.menu_id)
  const lastUsedIndex = (menuId: string) => {
    const idx = recentOrder.indexOf(menuId)
    return idx === -1 ? Infinity : idx
  }
  const lru = [...menus].sort((a, b) => lastUsedIndex(b.id) - lastUsedIndex(a.id))[0]
  return {
    menuId: lru.id,
    menuTitle: lru.title,
    reason: 'All menus used recently - selecting least recent',
  }
}
