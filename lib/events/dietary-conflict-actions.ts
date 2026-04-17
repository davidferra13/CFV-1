// Dietary Conflict Detection Server Actions
// Checks event menu items against guest dietary restrictions and tracks alerts.
// Table: dietary_conflict_alerts - event_id FK (CASCADE), chef_id FK,
//   guest_name TEXT, allergy TEXT, conflicting_dish TEXT,
//   severity ('critical'|'warning'|'info'), acknowledged BOOLEAN DEFAULT false

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { DIETARY_RULES, type DietId } from '@/lib/constants/dietary-rules'

// Recognized diet names that can be checked with the dietary rule sets
const RECOGNIZED_DIETS = new Set(Object.keys(DIETARY_RULES))

/** Check if a concern string maps to a known diet ID */
function matchDietId(concern: string): DietId | null {
  const lower = concern.toLowerCase().trim().replace(/[-_]/g, '-').replace(/\s+/g, '-')
  if (RECOGNIZED_DIETS.has(lower)) return lower as DietId
  // Common aliases
  const aliases: Record<string, DietId> = {
    vegan: 'vegan',
    vegetarian: 'vegetarian',
    pescatarian: 'pescatarian',
    keto: 'keto',
    ketogenic: 'keto',
    paleo: 'paleo',
    paleolithic: 'paleo',
    whole30: 'whole30',
    'whole 30': 'whole30',
    'gluten free': 'gluten-free',
    'gluten-free': 'gluten-free',
    celiac: 'gluten-free',
    coeliac: 'gluten-free',
    'dairy free': 'dairy-free',
    'dairy-free': 'dairy-free',
    'lactose free': 'dairy-free',
    'low fodmap': 'low-fodmap',
    'low-fodmap': 'low-fodmap',
    fodmap: 'low-fodmap',
    kosher: 'kosher',
    halal: 'halal',
    'low sodium': 'low-sodium',
    'low-sodium': 'low-sodium',
    'low salt': 'low-sodium',
    'low sugar': 'low-sugar',
    'low-sugar': 'low-sugar',
    diabetic: 'low-sugar',
  }
  return aliases[lower] ?? null
}

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
export async function generateAndPersistDietaryAlerts(eventId: string): Promise<DietaryConflict[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validatedEventId = EventIdSchema.parse(eventId)

  // Fetch event with dietary info
  const { data: event, error: eventError } = await db
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

  // Also pull dietary data from RSVP guests (event_guests table)
  const { data: rsvpGuests } = await db
    .from('event_guests')
    .select(
      'full_name, dietary_restrictions, allergies, plus_one_dietary, plus_one_allergies, plus_one_name, rsvp_status'
    )
    .eq('event_id', validatedEventId)

  // Build per-guest concern maps for attribution
  type GuestConcern = { guestName: string; concern: string }
  const guestConcerns: GuestConcern[] = []

  // Event-level concerns (from client record)
  for (const c of [...restrictions, ...allergies]) {
    guestConcerns.push({ guestName, concern: c })
  }

  // RSVP guest concerns
  if (rsvpGuests) {
    for (const g of rsvpGuests) {
      if (g.rsvp_status !== 'attending') continue
      const name = g.full_name || 'Guest'
      for (const c of (g.dietary_restrictions as string[]) || []) {
        guestConcerns.push({ guestName: name, concern: c })
      }
      for (const c of (g.allergies as string[]) || []) {
        guestConcerns.push({ guestName: name, concern: c })
      }
      // Plus-one dietary data
      if (g.plus_one_name || g.plus_one_dietary?.length || g.plus_one_allergies?.length) {
        const plusName = g.plus_one_name || `${name}'s guest`
        for (const c of (g.plus_one_dietary as string[]) || []) {
          guestConcerns.push({ guestName: plusName, concern: c })
        }
        for (const c of (g.plus_one_allergies as string[]) || []) {
          guestConcerns.push({ guestName: plusName, concern: c })
        }
      }
    }
  }

  const allConcerns = [...restrictions, ...allergies]
  // Add RSVP-sourced concerns to allConcerns for backward compat
  for (const gc of guestConcerns) {
    if (!allConcerns.includes(gc.concern)) {
      allConcerns.push(gc.concern)
    }
  }

  if (allConcerns.length === 0 && guestConcerns.length === 0) {
    return []
  }

  // Fetch menus and dishes for this event
  const { data: menus } = await db.from('menus').select('id').eq('event_id', validatedEventId)

  if (!menus || menus.length === 0) {
    return []
  }

  const menuIds = menus.map((m: any) => m.id)

  const { data: dishesRaw } = await db
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
  const { data: recipeLinks } = await db
    .from('dish_recipes' as any)
    .select('dish_id, recipe_id')
    .in('dish_id', dishIds)

  const recipeIds = (recipeLinks || []).map((r: any) => r.recipe_id).filter(Boolean)

  let ingredientNames: string[] = []
  if (recipeIds.length > 0) {
    const { data: ingredients } = await db
      .from('recipe_ingredients')
      .select('name, recipe_id')
      .in('recipe_id', recipeIds)

    ingredientNames = (ingredients || []).map((i: any) => (i.name || '').toLowerCase())
  }

  // Cross-reference: for each concern, check all dish names, descriptions, and ingredients
  // Enhanced: if the concern is a recognized diet (vegan, keto, etc.), use the dietary rule
  // sets for deep ingredient-level checking instead of just string matching.
  const conflicts: Array<{
    guestName: string
    allergy: string
    conflictingDish: string
    severity: DietaryConflictSeverity
  }> = []

  // Use per-guest concerns for attribution (includes event-level + RSVP guests)
  const seenConflicts = new Set<string>()
  for (const gc of guestConcerns) {
    const concernLower = gc.concern.toLowerCase().trim()
    if (!concernLower) continue

    // Check if this concern maps to a recognized dietary rule set
    const dietId = matchDietId(concernLower)

    for (const dish of dishes) {
      const conflictKey = `${gc.guestName}:${concernLower}:${dish.name}`
      if (seenConflicts.has(conflictKey)) continue

      const dishNameLower = (dish.name || '').toLowerCase()
      const dishDescLower = (dish.description || '').toLowerCase()
      const dishText = `${dishNameLower} ${dishDescLower}`

      let matched = false

      if (dietId) {
        // Use dietary rule sets for deep ingredient-level checking
        const rules = DIETARY_RULES[dietId]
        const hasViolation = rules.violationKeywords.some((kw) => dishText.includes(kw))
        const hasCaution =
          !hasViolation && rules.cautionKeywords.some((kw) => dishText.includes(kw))
        // Also check actual ingredient names against the rule set
        const ingredientViolation = ingredientNames.some((ing) =>
          rules.violationKeywords.some((kw) => ing.includes(kw) || kw.includes(ing))
        )

        if (hasViolation || ingredientViolation) {
          matched = true
        } else if (hasCaution) {
          // Caution-level: still flag but as info severity
          seenConflicts.add(conflictKey)
          conflicts.push({
            guestName: gc.guestName,
            allergy: gc.concern,
            conflictingDish: dish.name,
            severity: 'info',
          })
          continue
        }
      } else {
        // Fallback: basic string matching for allergens and other concerns
        const nameMatch = dishNameLower.includes(concernLower)
        const descMatch = dishDescLower.includes(concernLower)
        const ingredientMatch = ingredientNames.some(
          (ing) => ing.includes(concernLower) || concernLower.includes(ing)
        )
        matched = nameMatch || descMatch || ingredientMatch
      }

      if (matched) {
        seenConflicts.add(conflictKey)
        conflicts.push({
          guestName: gc.guestName,
          allergy: gc.concern,
          conflictingDish: dish.name,
          severity: classifySeverity(gc.concern),
        })
      }
    }
  }

  if (conflicts.length === 0) {
    return []
  }

  // Clear previous alerts for this event before inserting new ones
  await db
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

  const { data: inserted, error: insertError } = await db
    .from('dietary_conflict_alerts')
    .insert(insertPayload)
    .select()

  if (insertError) {
    console.error('[generateAndPersistDietaryAlerts] Error:', insertError)
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
  const db: any = createServerClient()
  const validatedAlertId = AlertIdSchema.parse(alertId)

  const { error } = await db
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
  const db: any = createServerClient()
  const validatedEventId = EventIdSchema.parse(eventId)

  const { data, error } = await db
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
