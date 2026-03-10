// Event-Level Allergen Cross-Check
// Aggregates allergens from all dishes/components/recipes/ingredients
// across an entire menu, then compares against guest dietary restrictions.
// Flags conflicts. Pure data aggregation, no AI.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface AllergenSource {
  allergen: string
  sources: {
    dishName: string
    componentName: string
    ingredientName: string | null
    sourceType: 'dish' | 'recipe' | 'ingredient'
  }[]
}

export interface DietaryConflict {
  restriction: string // what the guest needs (e.g., "nut-free", "gluten-free")
  allergen: string // what's in the menu (e.g., "tree_nuts", "gluten")
  affectedGuests: string[] // guest names
  sources: {
    dishName: string
    componentName: string
    ingredientName: string | null
  }[]
  severity: 'critical' | 'warning'
}

export interface AllergenCheckResult {
  menuId: string
  menuName: string
  eventId: string | null
  // All allergens found across the entire menu
  allAllergens: AllergenSource[]
  // Safe allergens (in menu but no guest has restrictions)
  safeAllergens: string[]
  // Conflicts (allergen in menu AND guest has that restriction)
  conflicts: DietaryConflict[]
  // Guest dietary info
  guestDietary: {
    clientName: string | null
    restrictions: string | null
    allergies: string | null
  } | null
  // Summary
  hasConflicts: boolean
  conflictCount: number
  totalAllergensInMenu: number
}

// ============================================
// ALLERGEN <-> DIETARY RESTRICTION MAPPING
// ============================================

// Maps common dietary restrictions to the allergen flags they conflict with
const RESTRICTION_TO_ALLERGEN: Record<string, string[]> = {
  // Direct allergens
  'nut-free': ['tree_nuts', 'peanuts', 'nuts'],
  'tree-nut-free': ['tree_nuts', 'nuts'],
  'peanut-free': ['peanuts', 'nuts'],
  'dairy-free': ['dairy', 'milk', 'lactose'],
  'gluten-free': ['gluten', 'wheat'],
  'egg-free': ['eggs', 'egg'],
  'soy-free': ['soy', 'soya'],
  'shellfish-free': ['shellfish', 'crustacean'],
  'fish-free': ['fish'],
  'sesame-free': ['sesame'],
  // Lifestyle / dietary
  vegan: ['dairy', 'milk', 'eggs', 'egg', 'honey', 'gelatin', 'fish', 'shellfish'],
  vegetarian: ['meat', 'poultry', 'fish', 'shellfish', 'gelatin'],
  pescatarian: ['meat', 'poultry'],
  // Common typed-out versions
  'no nuts': ['tree_nuts', 'peanuts', 'nuts'],
  'no dairy': ['dairy', 'milk', 'lactose'],
  'no gluten': ['gluten', 'wheat'],
  'no eggs': ['eggs', 'egg'],
  'no shellfish': ['shellfish', 'crustacean'],
  'no soy': ['soy', 'soya'],
  'lactose intolerant': ['dairy', 'milk', 'lactose'],
  celiac: ['gluten', 'wheat'],
  coeliac: ['gluten', 'wheat'],
}

// ============================================
// CORE: Run allergen check for a menu
// ============================================

export async function checkMenuAllergens(menuId: string): Promise<AllergenCheckResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // 1. Get menu
  const { data: menu } = await supabase
    .from('menus')
    .select('id, name, event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (!menu) throw new Error('Menu not found')

  // 2. Get dishes with allergen flags
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, course_name, allergen_flags, dietary_tags')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })

  // 3. Get components
  const dishIds = (dishes || []).map((d: any) => d.id)
  const dishMap = new Map((dishes || []).map((d: any) => [d.id, d]))

  const components =
    dishIds.length > 0
      ? (
          await supabase
            .from('components')
            .select('id, name, dish_id, recipe_id')
            .in('dish_id', dishIds)
            .eq('tenant_id', tenantId)
        ).data || []
      : []

  // 4. Get recipes with allergen data
  const recipeIds = components.map((c: any) => c.recipe_id).filter(Boolean)

  const recipeMap = new Map<string, any>()
  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, name, dietary_tags')
      .in('id', recipeIds)
      .eq('tenant_id', tenantId)

    for (const r of recipes || []) {
      recipeMap.set(r.id, r)
    }
  }

  // 5. Get ingredients with allergen flags
  const ingredientsByRecipe = new Map<string, any[]>()
  if (recipeIds.length > 0) {
    const { data: recipeIngredients } = await supabase
      .from('recipe_ingredients')
      .select(
        `
        recipe_id,
        ingredient:ingredients!inner(
          id,
          name,
          allergen_flags,
          dietary_tags
        )
      `
      )
      .in('recipe_id', recipeIds)

    for (const ri of recipeIngredients || []) {
      const existing = ingredientsByRecipe.get(ri.recipe_id) || []
      existing.push(ri)
      ingredientsByRecipe.set(ri.recipe_id, existing)
    }
  }

  // 6. Aggregate all allergens
  const allergenMap = new Map<string, AllergenSource['sources']>()

  const addAllergen = (allergen: string, source: AllergenSource['sources'][0]) => {
    const normalized = allergen.toLowerCase().trim()
    if (!normalized) return
    const existing = allergenMap.get(normalized) || []
    existing.push(source)
    allergenMap.set(normalized, existing)
  }

  // From dishes
  for (const dish of dishes || []) {
    for (const flag of dish.allergen_flags || []) {
      addAllergen(flag, {
        dishName: dish.course_name,
        componentName: '(dish-level)',
        ingredientName: null,
        sourceType: 'dish',
      })
    }
  }

  // From components' recipes and ingredients
  for (const comp of components) {
    const dish = dishMap.get(comp.dish_id)
    const dishName = dish?.course_name ?? 'Unknown'

    if (comp.recipe_id) {
      const recipe = recipeMap.get(comp.recipe_id)
      // Recipe-level dietary tags that imply allergens
      // (e.g., recipe tagged "contains_nuts")
      // Most allergen data comes from ingredients though

      // Ingredient-level allergens
      const recipeIngs = ingredientsByRecipe.get(comp.recipe_id) || []
      for (const ri of recipeIngs) {
        const ing = ri.ingredient
        for (const flag of ing.allergen_flags || []) {
          addAllergen(flag, {
            dishName,
            componentName: comp.name,
            ingredientName: ing.name,
            sourceType: 'ingredient',
          })
        }
      }
    }
  }

  // 7. Get guest dietary info from event's client
  let guestDietary: AllergenCheckResult['guestDietary'] = null

  if (menu.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('client_id, special_requests')
      .eq('id', menu.event_id)
      .eq('tenant_id', tenantId)
      .single()

    if (event?.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('full_name, dietary_restrictions, allergies')
        .eq('id', event.client_id)
        .eq('tenant_id', tenantId)
        .single()

      if (client) {
        guestDietary = {
          clientName: client.full_name,
          restrictions: (client as any).dietary_restrictions,
          allergies: (client as any).allergies,
        }
      }
    }
  }

  // 8. Check for conflicts
  const conflicts: DietaryConflict[] = []
  const menuAllergens = [...allergenMap.keys()]

  if (guestDietary) {
    // Parse restrictions and allergies into a list
    const restrictionText = [guestDietary.restrictions, guestDietary.allergies]
      .filter(Boolean)
      .join(', ')
      .toLowerCase()

    if (restrictionText) {
      // Check each known restriction pattern
      for (const [restriction, conflictAllergens] of Object.entries(RESTRICTION_TO_ALLERGEN)) {
        if (restrictionText.includes(restriction.toLowerCase())) {
          // This restriction is mentioned. Check if any conflicting allergens are in the menu.
          for (const allergen of conflictAllergens) {
            const sources = allergenMap.get(allergen)
            if (sources && sources.length > 0) {
              conflicts.push({
                restriction,
                allergen,
                affectedGuests: [guestDietary.clientName ?? 'Client'],
                sources: sources.map((s) => ({
                  dishName: s.dishName,
                  componentName: s.componentName,
                  ingredientName: s.ingredientName,
                })),
                severity: isLifeThreatening(allergen) ? 'critical' : 'warning',
              })
            }
          }
        }
      }

      // Also check for direct allergen name matches
      // (e.g., client says "allergic to sesame" and menu has "sesame")
      for (const allergen of menuAllergens) {
        if (restrictionText.includes(allergen) && !conflicts.some((c) => c.allergen === allergen)) {
          const sources = allergenMap.get(allergen)!
          conflicts.push({
            restriction: `allergic to ${allergen}`,
            allergen,
            affectedGuests: [guestDietary.clientName ?? 'Client'],
            sources: sources.map((s) => ({
              dishName: s.dishName,
              componentName: s.componentName,
              ingredientName: s.ingredientName,
            })),
            severity: isLifeThreatening(allergen) ? 'critical' : 'warning',
          })
        }
      }
    }
  }

  // 9. Determine safe allergens (present but no conflict)
  const conflictAllergens = new Set(conflicts.map((c) => c.allergen))
  const safeAllergens = menuAllergens.filter((a) => !conflictAllergens.has(a))

  const allAllergens: AllergenSource[] = [...allergenMap.entries()].map(([allergen, sources]) => ({
    allergen,
    sources,
  }))

  return {
    menuId: menu.id,
    menuName: menu.name,
    eventId: menu.event_id,
    allAllergens,
    safeAllergens,
    conflicts,
    guestDietary,
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length,
    totalAllergensInMenu: menuAllergens.length,
  }
}

// ============================================
// HELPERS
// ============================================

function isLifeThreatening(allergen: string): boolean {
  const critical = [
    'tree_nuts',
    'peanuts',
    'nuts',
    'shellfish',
    'crustacean',
    'fish',
    'eggs',
    'egg',
    'milk',
    'dairy',
    'soy',
    'wheat',
    'sesame',
  ]
  return critical.includes(allergen.toLowerCase())
}
