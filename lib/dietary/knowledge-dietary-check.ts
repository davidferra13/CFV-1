'use server'

/**
 * Knowledge-enhanced dietary flag check.
 *
 * Uses ingredient_knowledge.dietary_flags (sourced from Wikidata/Wikipedia)
 * to show which menu ingredients have confirmed dietary classifications,
 * cross-referenced against guest/client restrictions.
 *
 * This supplements the allergen check (which uses allergen_flags from the
 * ingredients table). Dietary flags cover broader compatibility categories:
 * vegan, vegetarian, halal, kosher, gluten-free, dairy-free.
 *
 * Formula > AI: pure SQL joins, no LLM calls.
 */

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DietaryFlagIngredient = {
  ingredientName: string
  flags: string[]
}

export type RestrictionCoverage = {
  restriction: string
  confirmedSafe: string[] // ingredient names confirmed compatible
  unverified: string[] // ingredient names with no knowledge data
}

export type KnowledgeDietaryResult = {
  hasMenu: boolean
  hasRestrictions: boolean
  totalMenuIngredients: number
  enrichedIngredients: number
  restrictionCoverage: RestrictionCoverage[]
  flaggedIngredients: DietaryFlagIngredient[] // all ingredients with any flags
}

// ---------------------------------------------------------------------------
// Dietary restriction -> flag mapping
// "Confirmed safe" means ingredient has at least one of these flags.
// ---------------------------------------------------------------------------

const RESTRICTION_FLAG_MAP: Record<string, string[]> = {
  vegan: ['vegan'],
  vegetarian: ['vegetarian', 'vegan'],
  'gluten-free': ['gluten-free'],
  'gluten free': ['gluten-free'],
  celiac: ['gluten-free'],
  'dairy-free': ['dairy-free'],
  'dairy free': ['dairy-free'],
  'lactose intolerant': ['dairy-free'],
  halal: ['halal'],
  kosher: ['kosher'],
}

function normalizeRestriction(r: string): string {
  return r.toLowerCase().trim()
}

function flagsForRestriction(restriction: string): string[] {
  const norm = normalizeRestriction(restriction)
  return RESTRICTION_FLAG_MAP[norm] ?? []
}

function ingredientSafeForRestriction(flags: string[], restriction: string): boolean {
  const required = flagsForRestriction(restriction)
  if (required.length === 0) return false // unknown restriction, cannot confirm
  return required.some((f) => flags.includes(f))
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function getKnowledgeDietaryCheck(eventId: string): Promise<KnowledgeDietaryResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const empty: KnowledgeDietaryResult = {
    hasMenu: false,
    hasRestrictions: false,
    totalMenuIngredients: 0,
    enrichedIngredients: 0,
    restrictionCoverage: [],
    flaggedIngredients: [],
  }

  // 1. Fetch event + menu
  const events = await pgClient`
    SELECT e.menu_id,
           e.dietary_restrictions,
           e.allergies,
           c.dietary_restrictions AS client_dietary,
           c.allergies             AS client_allergies
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id AND c.tenant_id = ${tenantId}
    WHERE e.id = ${eventId}
      AND e.tenant_id = ${tenantId}
    LIMIT 1
  `
  const event = (events as any[])[0]
  if (!event || !event.menu_id) return empty

  // 2. Fetch guest restrictions
  const guests = await pgClient`
    SELECT dietary_restrictions, allergies,
           plus_one_dietary, plus_one_allergies
    FROM event_guests
    WHERE event_id = ${eventId}
  `

  // 3. Collect all restrictions from all sources
  const allRestrictions: string[] = [
    ...(Array.isArray(event.dietary_restrictions) ? event.dietary_restrictions : []),
    ...(Array.isArray(event.allergies) ? event.allergies : []),
    ...(Array.isArray(event.client_dietary) ? event.client_dietary : []),
    ...(Array.isArray(event.client_allergies) ? event.client_allergies : []),
    ...(guests as any[]).flatMap((g: any) => [
      ...(Array.isArray(g.dietary_restrictions) ? g.dietary_restrictions : []),
      ...(Array.isArray(g.allergies) ? g.allergies : []),
      ...(Array.isArray(g.plus_one_dietary) ? g.plus_one_dietary : []),
      ...(Array.isArray(g.plus_one_allergies) ? g.plus_one_allergies : []),
    ]),
  ].filter(Boolean)

  // Filter to restrictions we can map to dietary_flags
  const mappableRestrictions = [
    ...new Set(allRestrictions.filter((r) => flagsForRestriction(r).length > 0)),
  ]

  if (mappableRestrictions.length === 0) {
    return { ...empty, hasMenu: true, hasRestrictions: false }
  }

  // 4. Fetch all recipe ingredients for this menu via the component chain:
  //    menu -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
  //    Then join to system_ingredients -> ingredient_knowledge for dietary_flags
  const rows = await pgClient`
    SELECT DISTINCT
      i.name                  AS ingredient_name,
      COALESCE(k.dietary_flags, ARRAY[]::TEXT[]) AS dietary_flags,
      k.id IS NOT NULL        AS has_knowledge
    FROM dishes d
    JOIN components comp ON comp.dish_id = d.id
    JOIN recipe_ingredients ri ON ri.recipe_id = comp.recipe_id
    JOIN ingredients i ON i.id = ri.ingredient_id AND i.tenant_id = ${tenantId}
    LEFT JOIN system_ingredients si ON si.id = i.system_ingredient_id
    LEFT JOIN ingredient_knowledge k
           ON k.system_ingredient_id = si.id
          AND k.needs_review = false
    WHERE d.menu_id = ${event.menu_id}
    ORDER BY i.name
  `

  const ingredientRows = rows as unknown as Array<{
    ingredient_name: string
    dietary_flags: string[]
    has_knowledge: boolean
  }>

  if (ingredientRows.length === 0) {
    return { ...empty, hasMenu: true, hasRestrictions: true }
  }

  const totalMenuIngredients = ingredientRows.length
  const enrichedIngredients = ingredientRows.filter((r) => r.has_knowledge).length

  // 5. Build flagged ingredient list
  const flaggedIngredients: DietaryFlagIngredient[] = ingredientRows
    .filter((r) => r.dietary_flags.length > 0)
    .map((r) => ({ ingredientName: r.ingredient_name, flags: r.dietary_flags }))

  // 6. Build restriction coverage
  const restrictionCoverage: RestrictionCoverage[] = mappableRestrictions.map((restriction) => {
    const confirmedSafe: string[] = []
    const unverified: string[] = []

    for (const row of ingredientRows) {
      if (!row.has_knowledge) {
        unverified.push(row.ingredient_name)
      } else if (ingredientSafeForRestriction(row.dietary_flags, restriction)) {
        confirmedSafe.push(row.ingredient_name)
      } else {
        // Has knowledge data but flag is absent - could still be safe
        // (flag absence != incompatible, just unclassified in Wikidata)
        unverified.push(row.ingredient_name)
      }
    }

    return { restriction, confirmedSafe, unverified }
  })

  return {
    hasMenu: true,
    hasRestrictions: true,
    totalMenuIngredients,
    enrichedIngredients,
    restrictionCoverage,
    flaggedIngredients,
  }
}
