'use server'

// Allergen Cross-Contamination Warning System
// Pure set comparison: client/guest allergens vs menu dish ingredients.
// No AI. Deterministic. Formula > AI.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { FDA_BIG_9, allergenShortName } from '@/lib/constants/allergens'

// ── Types ────────────────────────────────────────────────────────────────────

export type ConflictingDish = {
  dishName: string
  componentName: string | null
  ingredientName: string
}

export type AllergenConflict = {
  personName: string
  personType: 'client' | 'guest'
  allergen: string
  isFdaBig9: boolean
  conflictingDishes: ConflictingDish[]
}

export type ConflictSummary = {
  totalConflicts: number
  criticalConflicts: number // FDA Big 9
  cautionConflicts: number
}

export type CrossContaminationResult = {
  conflicts: AllergenConflict[]
  safeDishesByPerson: Record<string, string[]>
  summary: ConflictSummary
}

export type AllergenMatrixCell = {
  contains: boolean
  ingredientNames: string[]
}

export type AllergenMatrixResult = {
  allergens: string[] // row headers
  dishes: Array<{ id: string; name: string; courseName: string }> // column headers
  matrix: Record<string, Record<string, AllergenMatrixCell>> // allergen -> dishId -> cell
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const FDA_BIG_9_LOWER = FDA_BIG_9.map((a) => a.toLowerCase())

function isFdaBig9(allergen: string): boolean {
  const lower = allergen.toLowerCase()
  return FDA_BIG_9_LOWER.some((big9) => lower.includes(big9) || big9.includes(lower))
}

/** Normalize allergen strings for comparison (case insensitive, trimmed) */
function normalizeAllergen(raw: string): string {
  return raw.toLowerCase().trim().replace(/[-_]/g, ' ')
}

/** Check if an allergen flag matches a person's restriction */
function allergenMatchesRestriction(flag: string, restriction: string): boolean {
  const normFlag = normalizeAllergen(flag)
  const normRestriction = normalizeAllergen(restriction)

  // Direct match
  if (normFlag === normRestriction) return true

  // Substring containment (e.g., "tree nuts" matches "nuts")
  if (normFlag.includes(normRestriction) || normRestriction.includes(normFlag)) return true

  // Common aliases
  const aliases: Record<string, string[]> = {
    dairy: ['milk', 'lactose', 'cream', 'butter', 'cheese'],
    milk: ['dairy', 'lactose'],
    nuts: ['tree nuts', 'peanuts'],
    'tree nuts': ['nuts'],
    peanuts: ['nuts'],
    gluten: ['wheat', 'barley', 'rye'],
    wheat: ['gluten'],
    shellfish: ['crustacean shellfish', 'shrimp', 'crab', 'lobster'],
    'crustacean shellfish': ['shellfish'],
    soy: ['soybeans', 'soya'],
    soybeans: ['soy', 'soya'],
    eggs: ['egg'],
    egg: ['eggs'],
  }

  const flagAliases = aliases[normFlag] ?? []
  const restrictionAliases = aliases[normRestriction] ?? []

  if (flagAliases.includes(normRestriction)) return true
  if (restrictionAliases.includes(normFlag)) return true

  return false
}

// ── Main Check ───────────────────────────────────────────────────────────────

export async function checkMenuAllergenConflicts(
  eventId: string
): Promise<CrossContaminationResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient() as any

  // 1. Fetch event with client and menu info
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, client_id, menu_id, dietary_restrictions, allergies')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  // 2. Fetch client dietary info
  const { data: client } = await db
    .from('clients')
    .select('full_name, dietary_restrictions, allergies')
    .eq('id', event.client_id)
    .eq('tenant_id', tenantId)
    .single()

  // 3. Fetch guests for this event
  const { data: guests } = await db
    .from('event_guests')
    .select(
      'full_name, dietary_restrictions, allergies, plus_one_name, plus_one_dietary, plus_one_allergies'
    )
    .eq('event_id', eventId)

  // 4. Build person list with their restrictions
  type PersonRestrictions = {
    name: string
    type: 'client' | 'guest'
    restrictions: string[]
  }

  const people: PersonRestrictions[] = []

  // Client restrictions (from client profile + event-level)
  if (client) {
    const clientRestrictions = [
      ...(Array.isArray(client.dietary_restrictions) ? client.dietary_restrictions : []),
      ...(Array.isArray(client.allergies) ? client.allergies : []),
      ...(Array.isArray(event.dietary_restrictions) ? event.dietary_restrictions : []),
      ...(Array.isArray(event.allergies) ? event.allergies : []),
    ].filter(Boolean)

    if (clientRestrictions.length > 0) {
      people.push({
        name: client.full_name ?? 'Client',
        type: 'client',
        restrictions: [...new Set(clientRestrictions)],
      })
    }
  }

  // Guest restrictions
  if (guests && Array.isArray(guests)) {
    for (const guest of guests) {
      const guestRestrictions = [
        ...(Array.isArray(guest.dietary_restrictions) ? guest.dietary_restrictions : []),
        ...(Array.isArray(guest.allergies) ? guest.allergies : []),
      ].filter(Boolean)

      if (guestRestrictions.length > 0) {
        people.push({
          name: guest.full_name ?? 'Guest',
          type: 'guest',
          restrictions: [...new Set(guestRestrictions)],
        })
      }

      // Plus-one
      if (guest.plus_one_name) {
        const plusOneRestrictions = [
          ...(Array.isArray(guest.plus_one_dietary) ? guest.plus_one_dietary : []),
          ...(Array.isArray(guest.plus_one_allergies) ? guest.plus_one_allergies : []),
        ].filter(Boolean)

        if (plusOneRestrictions.length > 0) {
          people.push({
            name: guest.plus_one_name,
            type: 'guest',
            restrictions: [...new Set(plusOneRestrictions)],
          })
        }
      }
    }
  }

  // 5. If no people with restrictions, or no menu, return empty
  if (people.length === 0 || !event.menu_id) {
    return {
      conflicts: [],
      safeDishesByPerson: {},
      summary: { totalConflicts: 0, criticalConflicts: 0, cautionConflicts: 0 },
    }
  }

  // 6. Fetch menu dishes with allergen_flags
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, course_name, allergen_flags')
    .eq('menu_id', event.menu_id)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) {
    return {
      conflicts: [],
      safeDishesByPerson: {},
      summary: { totalConflicts: 0, criticalConflicts: 0, cautionConflicts: 0 },
    }
  }

  // 7. Also fetch allergen flags via the DB function for each dish (recursive through recipes)
  // This catches allergens from recipe ingredients that may not be on the dish directly
  const dishAllergenMap: Record<string, { flags: string[]; ingredientNames: string[] }> = {}

  for (const dish of dishes) {
    const directFlags: string[] = Array.isArray(dish.allergen_flags) ? dish.allergen_flags : []

    // Use DB function for recursive allergen resolution
    let dbFlags: string[] = []
    try {
      const { data: flagResult } = await db.rpc('get_dish_allergen_flags', {
        p_dish_id: dish.id,
      })
      if (Array.isArray(flagResult)) {
        dbFlags = flagResult
      }
    } catch {
      // If the RPC fails, fall back to direct flags only
    }

    // Merge both sources, deduplicate
    const allFlags = [...new Set([...directFlags, ...dbFlags])]
    dishAllergenMap[dish.id] = {
      flags: allFlags,
      ingredientNames: allFlags, // The flags themselves serve as ingredient identifiers
    }
  }

  // 8. Compare: for each person's restrictions, which dishes conflict?
  const conflicts: AllergenConflict[] = []
  const safeDishesByPerson: Record<string, string[]> = {}

  for (const person of people) {
    const safeDishes: string[] = []

    for (const restriction of person.restrictions) {
      const conflictingDishes: ConflictingDish[] = []

      for (const dish of dishes) {
        const dishData = dishAllergenMap[dish.id]
        if (!dishData) continue

        for (const flag of dishData.flags) {
          if (allergenMatchesRestriction(flag, restriction)) {
            conflictingDishes.push({
              dishName: dish.name ?? dish.course_name ?? 'Unnamed dish',
              componentName: null,
              ingredientName: allergenShortName(flag),
            })
            break // One match per dish is enough
          }
        }
      }

      if (conflictingDishes.length > 0) {
        conflicts.push({
          personName: person.name,
          personType: person.type,
          allergen: restriction,
          isFdaBig9: isFdaBig9(restriction),
          conflictingDishes,
        })
      }
    }

    // Figure out which dishes are safe for this person
    const conflictedDishNames = new Set(
      conflicts
        .filter((c) => c.personName === person.name)
        .flatMap((c) => c.conflictingDishes.map((d) => d.dishName))
    )

    for (const dish of dishes) {
      const dishName = dish.name ?? dish.course_name ?? 'Unnamed dish'
      if (!conflictedDishNames.has(dishName)) {
        safeDishes.push(dishName)
      }
    }

    safeDishesByPerson[person.name] = safeDishes
  }

  // 9. Build summary
  const criticalConflicts = conflicts.filter((c) => c.isFdaBig9).length
  const summary: ConflictSummary = {
    totalConflicts: conflicts.length,
    criticalConflicts,
    cautionConflicts: conflicts.length - criticalConflicts,
  }

  return { conflicts, safeDishesByPerson, summary }
}

// ── Allergen Matrix ──────────────────────────────────────────────────────────

export async function getMenuAllergenMatrix(menuId: string): Promise<AllergenMatrixResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient() as any

  // Fetch dishes for this menu
  const { data: dishes, error } = await db
    .from('dishes')
    .select('id, name, course_name, allergen_flags')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error || !dishes || dishes.length === 0) {
    return { allergens: [], dishes: [], matrix: {} }
  }

  // Resolve full allergen flags per dish (including recipe-level)
  const dishColumns: AllergenMatrixResult['dishes'] = []
  const allAllergens = new Set<string>()
  const dishFlagMap: Record<string, string[]> = {}

  for (const dish of dishes) {
    const directFlags: string[] = Array.isArray(dish.allergen_flags) ? dish.allergen_flags : []

    let dbFlags: string[] = []
    try {
      const { data: flagResult } = await db.rpc('get_dish_allergen_flags', {
        p_dish_id: dish.id,
      })
      if (Array.isArray(flagResult)) {
        dbFlags = flagResult
      }
    } catch {
      // Fall back to direct flags
    }

    const mergedFlags = [...new Set([...directFlags, ...dbFlags])]
    dishFlagMap[dish.id] = mergedFlags
    mergedFlags.forEach((f) => allAllergens.add(f))

    dishColumns.push({
      id: dish.id,
      name: dish.name ?? 'Unnamed',
      courseName: dish.course_name,
    })
  }

  // Build the matrix: allergen -> dishId -> cell
  const sortedAllergens = [...allAllergens].sort((a, b) => {
    // FDA Big 9 first
    const aIsBig9 = isFdaBig9(a)
    const bIsBig9 = isFdaBig9(b)
    if (aIsBig9 !== bIsBig9) return aIsBig9 ? -1 : 1
    return a.localeCompare(b)
  })

  const matrix: AllergenMatrixResult['matrix'] = {}

  for (const allergen of sortedAllergens) {
    matrix[allergen] = {}
    for (const dish of dishColumns) {
      const flags = dishFlagMap[dish.id] ?? []
      const matchingFlags = flags.filter((f) => allergenMatchesRestriction(f, allergen))
      matrix[allergen][dish.id] = {
        contains: matchingFlags.length > 0,
        ingredientNames: matchingFlags.map((f) => allergenShortName(f)),
      }
    }
  }

  return { allergens: sortedAllergens, dishes: dishColumns, matrix }
}
