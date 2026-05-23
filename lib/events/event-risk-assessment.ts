'use server'

// Event Risk Assessment - Server Actions
// Hydrates DishRiskInput and EventRiskInput from real event data,
// then delegates to the pure scoring engine in lib/costing/operational-risk.ts.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import {
  assessEventRisk,
  assessDishRisk,
  type DishRiskInput,
  type EventRiskInput,
  type WeatherRiskInput,
  type RiskAssessmentResult,
} from '@/lib/costing/operational-risk'
import { getEventWeatherForecast } from '@/lib/weather/weather-actions'
import { getEventBase } from '@/lib/events/shared-event-query'

// ─── Public Actions ─────────────────────────────────────────────────────────────

/**
 * Compute operational risk assessment for an event.
 * Gathers all relevant context from the database, scores each dish,
 * and returns the aggregate event risk.
 */
export async function getEventRiskAssessment(
  eventId: string
): Promise<{ data: RiskAssessmentResult | null; error: string | null }> {
  try {
    const chef = await requireChef()
    const tenantId = chef.tenantId!
    const db: any = createServerClient()

    // 1. Load event details via shared query helper
    const { data: event, error: eventError } = await getEventBase(db, eventId, tenantId)

    if (eventError || !event) {
      return { data: null, error: 'Event not found' }
    }

    // 2. Load menu and dishes for this event
    const { data: menus } = await db
      .from('menus')
      .select('id, target_guest_count')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)

    if (!menus || menus.length === 0) {
      return { data: null, error: 'No menu attached to this event' }
    }

    const menuIds = menus.map((m: any) => m.id)

    const { data: dishes } = await db
      .from('dishes')
      .select('id, menu_id, course_number')
      .in('menu_id', menuIds)
      .eq('tenant_id', tenantId)

    if (!dishes || dishes.length === 0) {
      return { data: null, error: 'Menu has no dishes' }
    }

    // 3. Load components and their recipes
    const dishIds = dishes.map((d: any) => d.id)
    const { data: components } = await db
      .from('dish_components')
      .select('id, dish_id, recipe_id')
      .in('dish_id', dishIds)

    const recipeIds = (components ?? []).map((c: any) => c.recipe_id).filter(Boolean) as string[]
    const uniqueRecipeIds = [...new Set(recipeIds)]

    // 4. Load recipe details
    let recipes: any[] = []
    if (uniqueRecipeIds.length > 0) {
      const { data: recipeData } = await db
        .from('recipes')
        .select(
          'id, prep_time_minutes, cook_time_minutes, dietary_tags, ' +
            'method, yield_quantity, cost_computed_at'
        )
        .in('id', uniqueRecipeIds)
        .eq('tenant_id', tenantId)

      recipes = recipeData ?? []
    }

    // 5. Load recipe ingredient counts and sub-recipe counts
    const recipeMetrics = await getRecipeMetrics(db, uniqueRecipeIds)

    // 5.5 Load PIE volatility and seasonal data for recipe ingredients
    const eventMonth = event.event_date
      ? new Date(event.event_date).getMonth() + 1
      : new Date().getMonth() + 1
    const [volatileRecipes, seasonalMismatches] = await Promise.all([
      getVolatileRecipes(db, uniqueRecipeIds),
      getSeasonalMismatches(db, uniqueRecipeIds, eventMonth),
    ])

    // 6. Load production log (times cooked) for each recipe
    const productionCounts = await getProductionCounts(db, uniqueRecipeIds, tenantId)

    // 7. Load client history
    const clientContext = await getClientContext(db, event.client_id, tenantId)

    // 8. Load venue visit history
    const venueContext = await getVenueContext(db, event.venue_name, tenantId)

    // 8.5 Load venue equipment from venue_profiles
    const venueEquipment = await getVenueEquipment(db, event.venue_name, tenantId, eventId)

    // 8.6 Fetch weather risk (3-second timeout, non-blocking)
    const weatherRiskInput = await fetchWeatherRiskInput(db, eventId, tenantId)

    // 9. Load dietary restriction count for this event
    const dietaryCount = await getDietaryRestrictionCount(db, eventId, tenantId)

    // 10. Build EventRiskInput
    const eventRiskInput: EventRiskInput = {
      isFirstTimeVenue: venueContext.isFirstTime,
      venueHasFullKitchen: venueEquipment.venueHasFullKitchen,
      venueOvenCount: venueEquipment.venueOvenCount,
      venueBurnerCount: venueEquipment.venueBurnerCount,
      hasRefrigeration: venueEquipment.hasRefrigeration,
      travelDistanceMinutes: event.travel_time_minutes ?? null,
      weather: weatherRiskInput,
      totalServiceHours: event.service_hours ?? null,
      courseCount: getUniqueCourseCount(dishes),
      simultaneousServings: event.guest_count ?? null,
      staffCount: event.staff_count ?? null,
      hasExperiencedSousChef: null, // not tracked yet
      isFirstTimeClient: clientContext.isFirstTime,
      clientChangeRequestCount: clientContext.changeRequestCount,
      clientEventsCompleted: clientContext.completedEvents,
      totalDishCount: dishes.length,
      totalComponentCount: components?.length ?? null,
      guestCount: event.guest_count ?? null,
      dietaryRestrictionCount: dietaryCount,
    }

    // 11. Build DishRiskInput for each dish (grouped by recipe)
    const dishRiskInputs: DishRiskInput[] = buildDishRiskInputs(
      dishes,
      components ?? [],
      recipes,
      recipeMetrics,
      productionCounts,
      event.guest_count,
      volatileRecipes,
      seasonalMismatches
    )

    // 12. Run assessment
    const result = assessEventRisk(dishRiskInputs, eventRiskInput)

    // 13. Optionally persist (if table exists)
    await persistAssessment(db, eventId, tenantId, result)

    return { data: result, error: null }
  } catch (err: any) {
    console.error('[event-risk-assessment] Error:', err?.message ?? err)
    return { data: null, error: 'Failed to compute risk assessment' }
  }
}

/**
 * Quick risk check for a single dish in event context.
 * Useful for menu editing: "what happens if I add this dish?"
 */
export async function getDishRiskPreview(
  eventId: string,
  recipeId: string
): Promise<{ data: RiskAssessmentResult | null; error: string | null }> {
  try {
    const chef = await requireChef()
    const tenantId = chef.tenantId!
    const db: any = createServerClient()

    const { data: event } = await db
      .from('events')
      .select(
        'id, guest_count, service_hours, travel_time_minutes, client_id, venue_name, staff_count'
      )
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!event) return { data: null, error: 'Event not found' }

    const { data: recipe } = await db
      .from('recipes')
      .select('id, prep_time_minutes, cook_time_minutes, method')
      .eq('id', recipeId)
      .eq('tenant_id', tenantId)
      .single()

    if (!recipe) return { data: null, error: 'Recipe not found' }

    const recipeMetrics = await getRecipeMetrics(db, [recipeId])
    const productionCounts = await getProductionCounts(db, [recipeId], tenantId)
    const clientContext = await getClientContext(db, event.client_id, tenantId)
    const venueContext = await getVenueContext(db, event.venue_name, tenantId)
    const venueEquipment = await getVenueEquipment(db, event.venue_name, tenantId, eventId)

    // Fetch PIE data for the single recipe
    const eventMonth = new Date().getMonth() + 1
    const [volatileRecipes, seasonalMismatches] = await Promise.all([
      getVolatileRecipes(db, [recipeId]),
      getSeasonalMismatches(db, [recipeId], eventMonth),
    ])

    const dishInput: DishRiskInput = {
      targetGuestCount: event.guest_count ?? null,
      maxPreviousGuestCount: null, // would need production log analysis
      timesCookedInEvents: productionCounts.get(recipeId) ?? 0,
      ingredientCount: recipeMetrics.get(recipeId)?.ingredientCount ?? null,
      subRecipeCount: recipeMetrics.get(recipeId)?.subRecipeCount ?? null,
      prepTimeMinutes: recipe.prep_time_minutes ?? null,
      cookTimeMinutes: recipe.cook_time_minutes ?? null,
      hasMultipleTemperatureStages: inferTemperatureStages(recipe.method),
      requiresPrecisionTiming: inferPrecisionTiming(recipe.method),
      hasVolatilePricing: volatileRecipes.has(recipeId),
      seasonalMismatchCount: seasonalMismatches.get(recipeId) ?? 0,
      hardToSourceCount: null,
      mustBeServedImmediately: null,
      holdTimeMinutes: null,
      allergenCount: null,
      crossContaminationRisk: null,
    }

    const eventInput: EventRiskInput = {
      isFirstTimeVenue: venueContext.isFirstTime,
      venueHasFullKitchen: venueEquipment.venueHasFullKitchen,
      venueOvenCount: venueEquipment.venueOvenCount,
      venueBurnerCount: venueEquipment.venueBurnerCount,
      hasRefrigeration: venueEquipment.hasRefrigeration,
      travelDistanceMinutes: event.travel_time_minutes ?? null,
      weather: null, // Quick preview skips weather fetch
      totalServiceHours: event.service_hours ?? null,
      courseCount: null,
      simultaneousServings: event.guest_count ?? null,
      staffCount: event.staff_count ?? null,
      hasExperiencedSousChef: null,
      isFirstTimeClient: clientContext.isFirstTime,
      clientChangeRequestCount: clientContext.changeRequestCount,
      clientEventsCompleted: clientContext.completedEvents,
      totalDishCount: null,
      totalComponentCount: null,
      guestCount: event.guest_count ?? null,
      dietaryRestrictionCount: null,
    }

    const result = assessDishRisk(dishInput, eventInput)
    return { data: result, error: null }
  } catch (err: any) {
    console.error('[dish-risk-preview] Error:', err?.message ?? err)
    return { data: null, error: 'Failed to compute dish risk' }
  }
}

// ─── Data Hydration Helpers ─────────────────────────────────────────────────────

async function getRecipeMetrics(
  db: any,
  recipeIds: string[]
): Promise<Map<string, { ingredientCount: number; subRecipeCount: number }>> {
  const map = new Map<string, { ingredientCount: number; subRecipeCount: number }>()
  if (recipeIds.length === 0) return map

  // Ingredient counts
  const { data: ingredientCounts } = await db
    .from('recipe_ingredients')
    .select('recipe_id')
    .in('recipe_id', recipeIds)

  const ingCountMap = new Map<string, number>()
  for (const row of ingredientCounts ?? []) {
    ingCountMap.set(row.recipe_id, (ingCountMap.get(row.recipe_id) ?? 0) + 1)
  }

  // Sub-recipe counts
  const { data: subRecipeCounts } = await db
    .from('recipe_sub_recipes')
    .select('parent_recipe_id')
    .in('parent_recipe_id', recipeIds)

  const subCountMap = new Map<string, number>()
  for (const row of subRecipeCounts ?? []) {
    subCountMap.set(row.parent_recipe_id, (subCountMap.get(row.parent_recipe_id) ?? 0) + 1)
  }

  for (const id of recipeIds) {
    map.set(id, {
      ingredientCount: ingCountMap.get(id) ?? 0,
      subRecipeCount: subCountMap.get(id) ?? 0,
    })
  }

  return map
}

async function getProductionCounts(
  db: any,
  recipeIds: string[],
  tenantId: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (recipeIds.length === 0) return map

  // Count events where each recipe was used (via dish_components)
  const { data: usages } = await db
    .from('dish_components')
    .select('recipe_id, dish_id, dishes!inner(menu_id, menus!inner(event_id))')
    .in('recipe_id', recipeIds)

  if (!usages) return map

  // Count unique events per recipe
  const recipeEventSets = new Map<string, Set<string>>()
  for (const row of usages) {
    const eventId = row.dishes?.menus?.event_id
    if (!eventId || !row.recipe_id) continue
    if (!recipeEventSets.has(row.recipe_id)) {
      recipeEventSets.set(row.recipe_id, new Set())
    }
    recipeEventSets.get(row.recipe_id)!.add(eventId)
  }

  for (const [recipeId, events] of recipeEventSets) {
    map.set(recipeId, events.size)
  }

  return map
}

async function getClientContext(
  db: any,
  clientId: string | null,
  tenantId: string
): Promise<{ isFirstTime: boolean; changeRequestCount: number; completedEvents: number }> {
  if (!clientId) {
    return { isFirstTime: true, changeRequestCount: 0, completedEvents: 0 }
  }

  const { data: pastEvents, count } = await db
    .from('events')
    .select('id', { count: 'exact' })
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')

  const completedEvents = count ?? 0

  // Check menu revisions as proxy for change requests
  const { data: revisions, count: revCount } = await db
    .from('menu_revisions')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .in(
      'event_id',
      (pastEvents ?? []).map((e: any) => e.id)
    )

  return {
    isFirstTime: completedEvents === 0,
    changeRequestCount: revCount ?? 0,
    completedEvents,
  }
}

async function getVenueContext(
  db: any,
  venueName: string | null,
  tenantId: string
): Promise<{ isFirstTime: boolean; visitCount: number }> {
  if (!venueName) {
    return { isFirstTime: true, visitCount: 0 }
  }

  // Count past events at this venue
  const { count } = await db
    .from('events')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('venue_name', venueName)
    .eq('status', 'completed')

  const visitCount = count ?? 0

  return {
    isFirstTime: visitCount === 0,
    visitCount,
  }
}

interface VenueEquipment {
  venueHasFullKitchen: boolean | null
  venueOvenCount: number | null
  venueBurnerCount: number | null
  hasRefrigeration: boolean | null
}

const NULL_VENUE_EQUIPMENT: VenueEquipment = {
  venueHasFullKitchen: null,
  venueOvenCount: null,
  venueBurnerCount: null,
  hasRefrigeration: null,
}

async function getVenueEquipment(
  db: any,
  venueName: string | null,
  tenantId: string,
  eventId?: string
): Promise<VenueEquipment> {
  // Try venue_profiles first (general venue data)
  if (venueName) {
    try {
      const { data } = await db
        .from('venue_profiles')
        .select('has_full_kitchen, oven_count, burner_count, has_refrigeration')
        .eq('tenant_id', tenantId)
        .eq('venue_name', venueName)
        .single()

      if (data) {
        return {
          venueHasFullKitchen: data.has_full_kitchen ?? null,
          venueOvenCount: data.oven_count ?? null,
          venueBurnerCount: data.burner_count ?? null,
          hasRefrigeration: data.has_refrigeration ?? null,
        }
      }
    } catch {
      // Table may not exist or query failed; try fallback
    }
  }

  // Fallback: read from event_site_assessments (per-event site survey)
  if (eventId) {
    try {
      const { data: site } = await db
        .from('event_site_assessments')
        .select('has_oven, has_stovetop, has_refrigeration, kitchen_size')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (site) {
        return {
          venueHasFullKitchen:
            site.kitchen_size === 'commercial' || site.kitchen_size === 'large'
              ? true
              : site.kitchen_size === 'none'
                ? false
                : null,
          venueOvenCount: site.has_oven ? 1 : 0,
          venueBurnerCount: site.has_stovetop ? 1 : 0,
          hasRefrigeration: site.has_refrigeration ?? null,
        }
      }
    } catch {
      // Degrade gracefully
    }
  }

  return NULL_VENUE_EQUIPMENT
}

async function getDietaryRestrictionCount(
  db: any,
  eventId: string,
  tenantId: string
): Promise<number | null> {
  // Check guest dietary profiles for this event
  const { data: guests } = await db
    .from('event_guests')
    .select('dietary_restrictions')
    .eq('event_id', eventId)

  if (!guests || guests.length === 0) return null

  const allRestrictions = new Set<string>()
  for (const guest of guests) {
    const restrictions = guest.dietary_restrictions
    if (Array.isArray(restrictions)) {
      for (const r of restrictions) {
        if (r) allRestrictions.add(r.toLowerCase())
      }
    }
  }

  return allRestrictions.size
}

// ─── PIE Data Bridges ───────────────────────────────────────────────────────────

/**
 * Find which recipes contain ingredients with volatile pricing.
 * Bridges ChefFlow ingredients to OpenClaw canonical ingredients by name,
 * then checks ingredient_trends for volatile direction or high volatility.
 */
async function getVolatileRecipes(_db: any, recipeIds: string[]): Promise<Set<string>> {
  const volatileSet = new Set<string>()
  if (recipeIds.length === 0) return volatileSet

  try {
    const rows = await pgClient`
      SELECT DISTINCT ri.recipe_id
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      JOIN openclaw.canonical_ingredients ci ON LOWER(ci.name) = LOWER(i.name)
      JOIN openclaw.ingredient_trends it ON it.ingredient_id = ci.ingredient_id
      WHERE ri.recipe_id = ANY(${recipeIds})
        AND (it.direction = 'volatile' OR it.volatility > 0.25)
    `
    for (const row of rows) {
      volatileSet.add(row.recipe_id)
    }
  } catch {
    // OpenClaw tables may not exist in all environments; degrade gracefully
  }

  return volatileSet
}

/**
 * Count ingredients per recipe that are out of season for a given month.
 * Uses OpenClaw seasonal_patterns monthly_indices (1-indexed array).
 * An index > 120 for the event month means the ingredient is significantly
 * more expensive than average, indicating seasonal mismatch.
 */
async function getSeasonalMismatches(
  _db: any,
  recipeIds: string[],
  eventMonth: number
): Promise<Map<string, number>> {
  const mismatchMap = new Map<string, number>()
  if (recipeIds.length === 0) return mismatchMap

  try {
    const rows = await pgClient`
      SELECT ri.recipe_id, COUNT(*)::int AS mismatch_count
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      JOIN openclaw.canonical_ingredients ci ON LOWER(ci.name) = LOWER(i.name)
      JOIN openclaw.seasonal_patterns sp ON sp.ingredient_id = ci.ingredient_id
      WHERE ri.recipe_id = ANY(${recipeIds})
        AND sp.monthly_indices[${eventMonth}] > 120
        AND sp.seasonal_swing_pct > 20
      GROUP BY ri.recipe_id
    `
    for (const row of rows) {
      mismatchMap.set(row.recipe_id, Number(row.mismatch_count))
    }
  } catch {
    // OpenClaw tables may not exist in all environments; degrade gracefully
  }

  return mismatchMap
}

// ─── Input Building ─────────────────────────────────────────────────────────────

function buildDishRiskInputs(
  dishes: any[],
  components: any[],
  recipes: any[],
  recipeMetrics: Map<string, { ingredientCount: number; subRecipeCount: number }>,
  productionCounts: Map<string, number>,
  guestCount: number | null,
  volatileRecipes: Set<string>,
  seasonalMismatches: Map<string, number>
): DishRiskInput[] {
  const recipeMap = new Map(recipes.map((r: any) => [r.id, r]))
  const dishComponentMap = new Map<string, any[]>()

  for (const comp of components) {
    if (!dishComponentMap.has(comp.dish_id)) {
      dishComponentMap.set(comp.dish_id, [])
    }
    dishComponentMap.get(comp.dish_id)!.push(comp)
  }

  const inputs: DishRiskInput[] = []

  for (const dish of dishes) {
    const comps = dishComponentMap.get(dish.id) ?? []
    // Use the primary recipe (first component with a recipe_id)
    const primaryRecipeId = comps.find((c: any) => c.recipe_id)?.recipe_id
    const recipe = primaryRecipeId ? recipeMap.get(primaryRecipeId) : null
    const metrics = primaryRecipeId ? recipeMetrics.get(primaryRecipeId) : null

    inputs.push({
      targetGuestCount: guestCount,
      maxPreviousGuestCount: null, // future: derive from production log max guest counts
      timesCookedInEvents: primaryRecipeId ? (productionCounts.get(primaryRecipeId) ?? 0) : 0,
      ingredientCount: metrics?.ingredientCount ?? null,
      subRecipeCount: metrics?.subRecipeCount ?? null,
      prepTimeMinutes: recipe?.prep_time_minutes ?? null,
      cookTimeMinutes: recipe?.cook_time_minutes ?? null,
      hasMultipleTemperatureStages: recipe ? inferTemperatureStages(recipe.method) : null,
      requiresPrecisionTiming: recipe ? inferPrecisionTiming(recipe.method) : null,
      hasVolatilePricing: primaryRecipeId ? volatileRecipes.has(primaryRecipeId) : null,
      seasonalMismatchCount: primaryRecipeId
        ? (seasonalMismatches.get(primaryRecipeId) ?? 0)
        : null,
      hardToSourceCount: null, // future: wire to ingredient availability
      mustBeServedImmediately: null, // future: recipe metadata
      holdTimeMinutes: null, // future: recipe metadata
      allergenCount: null, // future: count distinct allergens in recipe ingredients
      crossContaminationRisk: null, // future: infer from allergen overlap
    })
  }

  return inputs
}

function getUniqueCourseCount(dishes: any[]): number {
  const courses = new Set(dishes.map((d: any) => d.course_number))
  return courses.size
}

// ─── Method Text Inference ──────────────────────────────────────────────────────
// Cheap heuristics to detect technique complexity from recipe method text.

const PRECISION_KEYWORDS = [
  'temper',
  'souffle',
  'soufflé',
  'emulsif',
  'caramel',
  'candy thermometer',
  'ice bath',
  'bloom gelatin',
  'fold gently',
  'ribbon stage',
  'soft peak',
  'stiff peak',
  'deglaze immediately',
  'flambe',
  'flambé',
]

const TEMPERATURE_KEYWORDS = [
  'then increase',
  'then decrease',
  'reduce heat',
  'raise heat',
  'preheat to',
  'bring to a boil then simmer',
  'sear then bake',
  'start cold',
  'shock in ice',
  'rest at room temp',
  'chill then',
]

function inferPrecisionTiming(method: string | null): boolean | null {
  if (!method) return null
  const lower = method.toLowerCase()
  return PRECISION_KEYWORDS.some((kw) => lower.includes(kw))
}

function inferTemperatureStages(method: string | null): boolean | null {
  if (!method) return null
  const lower = method.toLowerCase()
  let stageCount = 0
  for (const kw of TEMPERATURE_KEYWORDS) {
    if (lower.includes(kw)) stageCount++
  }
  return stageCount >= 2
}

// ─── Weather Risk Bridge ────────────────────────────────────────────────────────

/**
 * Fetch weather forecast and convert to WeatherRiskInput.
 * Uses Promise.race with 3-second timeout. Returns null on timeout, error,
 * or if weather data is unavailable (no coords, event too far out, etc.).
 */
async function fetchWeatherRiskInput(
  db: any,
  eventId: string,
  tenantId: string
): Promise<WeatherRiskInput | null> {
  try {
    const TIMEOUT_MS = 3000
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), TIMEOUT_MS)
    )
    const weatherPromise = getEventWeatherForecast(eventId)

    // Fetch site assessment for weather_exposure in parallel with weather forecast
    const siteAssessmentPromise = db
      .from('event_site_assessments')
      .select('weather_exposure, outdoor_space')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
      .then((r: any) => r?.data ?? null)
      .catch(() => null)

    const [result, siteAssessment] = await Promise.all([
      Promise.race([weatherPromise, timeoutPromise]),
      siteAssessmentPromise,
    ])

    if (!result) return null

    // Use actual weather_exposure from site assessment; fall back to outdoor_space;
    // default to true (conservative) if no assessment exists
    const isOutdoor = siteAssessment?.weather_exposure ?? siteAssessment?.outdoor_space ?? true

    return {
      weatherRiskScore: result.risk.score,
      weatherWarnings: result.risk.warnings.length > 0 ? result.risk.warnings : null,
      isOutdoor,
    }
  } catch {
    return null
  }
}

// ─── Persistence ────────────────────────────────────────────────────────────────

async function persistAssessment(
  db: any,
  eventId: string,
  tenantId: string,
  result: RiskAssessmentResult
): Promise<void> {
  try {
    await db.from('event_risk_assessments').upsert(
      {
        event_id: eventId,
        tenant_id: tenantId,
        assessed_at: new Date().toISOString(),
        overall_score: result.overallScore,
        overall_level: result.overallLevel,
        factors: result.factors,
        top_risks: result.topRisks,
        mitigation_priorities: result.mitigationPriorities,
        confidence_in_assessment: result.confidenceInAssessment,
      },
      { onConflict: 'event_id, tenant_id' }
    )
  } catch {
    // Non-critical: if table doesn't exist yet, just skip persistence
    // The assessment still works as a live computation
  }
}
