// Dietary Conflict Detection Server Actions
// Checks event menu items against guest dietary restrictions and tracks alerts.
// Table: dietary_conflict_alerts — event_id FK (CASCADE), chef_id FK,
//   guest_name TEXT, allergy TEXT, conflicting_dish TEXT,
//   severity ('critical'|'warning'|'info'), acknowledged BOOLEAN DEFAULT false

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type DietaryConflictSeverity = 'critical' | 'warning' | 'info'

export type DietaryConflict = {
  id: string
  eventId: string
  chefId: string
  guestName: string
  allergy: string
  conflictingDish: string
  severity: DietaryConflictSeverity
  acknowledged: boolean
  createdAt: string
}

// --- Schemas ---

const EventIdSchema = z.string().uuid()
const AlertIdSchema = z.string().uuid()

// --- Severity classification ---

// Common critical allergens (life-threatening)
const CRITICAL_ALLERGENS = [
  'peanut',
  'peanuts',
  'tree nut',
  'tree nuts',
  'nuts',
  'shellfish',
  'anaphylaxis',
  'epipen',
  'sesame',
  'soy',
  'fish',
]

// Significant but typically not life-threatening
const WARNING_ALLERGENS = ['gluten', 'dairy', 'lactose', 'egg', 'eggs', 'wheat', 'corn']

function classifySeverity(allergy: string): DietaryConflictSeverity {
  const lower = allergy.toLowerCase().trim()
  if (CRITICAL_ALLERGENS.some((a) => lower.includes(a))) return 'critical'
  if (WARNING_ALLERGENS.some((a) => lower.includes(a))) return 'warning'
  return 'info'
}

// --- Actions ---

/**
 * Check event menu items against guest dietary restrictions.
 * Scans the event's dietary_restrictions and allergies arrays,
 * then cross-references dish names and ingredients for potential conflicts.
 * Inserts found conflicts into dietary_conflict_alerts and returns the list.
 */
export async function checkDietaryConflicts(eventId: string): Promise<DietaryConflict[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const validatedEventId = EventIdSchema.parse(eventId)

  // Fetch event with dietary info
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, dietary_restrictions, allergies, client:clients(full_name)')
    .eq('id', validatedEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  const restrictions: string[] = (event.dietary_restrictions as string[]) || []
  const allergies: string[] = (event.allergies as string[]) || []
  const guestName = (event.client as any)?.full_name ?? 'Guest'
  const allConcerns = [...restrictions, ...allergies]

  if (allConcerns.length === 0) {
    return []
  }

  // Fetch menus and dishes for this event
  const { data: menus } = await supabase.from('menus').select('id').eq('event_id', validatedEventId)

  if (!menus || menus.length === 0) {
    return []
  }

  const menuIds = menus.map((m) => m.id)

  const { data: dishesRaw } = await supabase
    .from('dishes')
    .select('id, name, description')
    .in('menu_id', menuIds)

  const dishes = dishesRaw as unknown as Array<{
    id: string
    name: string
    description: string | null
  }> | null

  if (!dishes || dishes.length === 0) {
    return []
  }

  // Also fetch recipe ingredients if available
  const dishIds = dishes.map((d) => d.id)
  const { data: recipeLinks } = await supabase
    .from('dish_recipes' as any)
    .select('dish_id, recipe_id')
    .in('dish_id', dishIds)

  const recipeIds = (recipeLinks || []).map((r: any) => r.recipe_id).filter(Boolean)

  let ingredientNames: string[] = []
  if (recipeIds.length > 0) {
    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select('name, recipe_id')
      .in('recipe_id', recipeIds)

    ingredientNames = (ingredients || []).map((i: any) => (i.name || '').toLowerCase())
  }

  // Cross-reference: for each concern, check all dish names, descriptions, and ingredients
  const conflicts: Array<{
    guestName: string
    allergy: string
    conflictingDish: string
    severity: DietaryConflictSeverity
  }> = []

  for (const concern of allConcerns) {
    const concernLower = concern.toLowerCase().trim()
    if (!concernLower) continue

    for (const dish of dishes) {
      const dishNameLower = (dish.name || '').toLowerCase()
      const dishDescLower = (dish.description || '').toLowerCase()

      // Check if dish name or description mentions the allergen
      const nameMatch = dishNameLower.includes(concernLower)
      const descMatch = dishDescLower.includes(concernLower)

      // Check ingredients
      const ingredientMatch = ingredientNames.some(
        (ing) => ing.includes(concernLower) || concernLower.includes(ing)
      )

      if (nameMatch || descMatch || ingredientMatch) {
        conflicts.push({
          guestName,
          allergy: concern,
          conflictingDish: dish.name,
          severity: classifySeverity(concern),
        })
      }
    }
  }

  if (conflicts.length === 0) {
    return []
  }

  // Clear previous alerts for this event before inserting new ones
  await supabase
    .from('dietary_conflict_alerts')
    .delete()
    .eq('event_id', validatedEventId)
    .eq('chef_id', user.tenantId!)

  // Insert new conflicts
  const insertPayload = conflicts.map((c) => ({
    event_id: validatedEventId,
    chef_id: user.tenantId!,
    guest_name: c.guestName,
    allergy: c.allergy,
    conflicting_dish: c.conflictingDish,
    severity: c.severity,
    acknowledged: false,
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('dietary_conflict_alerts')
    .insert(insertPayload)
    .select()

  if (insertError) {
    console.error('[checkDietaryConflicts] Error:', insertError)
    throw new Error('Failed to save dietary conflict alerts')
  }

  revalidatePath(`/events/${validatedEventId}`)

  return (inserted || []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    chefId: row.chef_id,
    guestName: row.guest_name,
    allergy: row.allergy,
    conflictingDish: row.conflicting_dish,
    severity: row.severity as DietaryConflictSeverity,
    acknowledged: row.acknowledged,
    createdAt: row.created_at,
  }))
}

/**
 * Acknowledge a dietary conflict alert (mark as reviewed).
 */
export async function acknowledgeDietaryConflict(alertId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const validatedAlertId = AlertIdSchema.parse(alertId)

  const { error } = await supabase
    .from('dietary_conflict_alerts')
    .update({ acknowledged: true })
    .eq('id', validatedAlertId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[acknowledgeDietaryConflict] Error:', error)
    throw new Error('Failed to acknowledge dietary conflict')
  }

  revalidatePath('/events')

  return { success: true }
}

/**
 * Get all dietary conflict alerts for an event.
 */
export async function getDietaryConflicts(eventId: string): Promise<DietaryConflict[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const validatedEventId = EventIdSchema.parse(eventId)

  const { data, error } = await supabase
    .from('dietary_conflict_alerts')
    .select('*')
    .eq('event_id', validatedEventId)
    .eq('chef_id', user.tenantId!)
    .order('severity', { ascending: true })

  if (error) {
    console.error('[getDietaryConflicts] Error:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    chefId: row.chef_id,
    guestName: row.guest_name,
    allergy: row.allergy,
    conflictingDish: row.conflicting_dish,
    severity: row.severity as DietaryConflictSeverity,
    acknowledged: row.acknowledged,
    createdAt: row.created_at,
  }))
}
