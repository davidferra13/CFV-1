// Seasonal Menu Builder - Intelligence Layer
// Connects seasonal palettes, recipes, and pricing to suggest
// optimal seasonal menus based on what is in-season, affordable, and proven.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getCurrentSeason, getActiveMicroWindows } from '@/lib/seasonal/helpers'
import type { SeasonalPalette } from '@/lib/seasonal/types'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SeasonalIngredient {
  name: string
  recipeId: string | null
  inSeason: boolean
  microWindowActive: boolean
  microWindowNotes: string | null
  priceCents: number | null
  priceSource: string | null
  seasonScore: number // 0-100, higher = more seasonal and better value
}

export interface SeasonalRecipeMatch {
  id: string
  name: string
  category: string | null
  cuisine: string | null
  rating: number | null
  timesServed: number
  seasonalIngredientCount: number
  totalIngredientCount: number
  seasonalMatchPct: number // 0-100
  estimatedCostCents: number | null
  seasonScore: number // composite score for ranking
}

export interface SeasonalMenuCourse {
  course: string
  recipe: SeasonalRecipeMatch | null
  reason: string
}

export interface SeasonalMenuSuggestion {
  courses: SeasonalMenuCourse[]
  totalEstimatedCostCents: number
  perGuestCostCents: number
  guestCount: number
  seasonName: string
  month: number
  monthName: string
  seasonalCoverage: number // % of menu items using seasonal ingredients
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const COURSE_ORDER = [
  'appetizer', 'salad', 'soup', 'pasta', 'protein', 'vegetable',
  'starch', 'bread', 'dessert', 'beverage',
]

// ── Seasonal Ingredients ───────────────────────────────────────────────────────

export async function getSeasonalIngredients(
  month: number,
  _region: string,
  tenantId: string
): Promise<SeasonalIngredient[]> {
  const db: any = createServerClient()

  // Get the chef's seasonal palettes
  const { data: palettes } = await db
    .from('seasonal_palettes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  if (!palettes || palettes.length === 0) return []

  // Build a date for the target month to find active windows
  const targetDate = new Date(new Date().getFullYear(), month - 1, 15)
  const mapped = (palettes as any[]).map(mapPalette)
  const currentPalette = getCurrentSeason(mapped, targetDate)

  if (!currentPalette) return []

  const activeWindows = getActiveMicroWindows(currentPalette, targetDate)
  const allWindows = currentPalette.micro_windows

  // Get all ingredients in the palette (both active and full-season)
  const windowIngredientNames = new Set(
    allWindows.map((w) => w.ingredient.toLowerCase().trim())
  )
  const activeWindowNames = new Set(
    activeWindows.map((w) => w.ingredient.toLowerCase().trim())
  )

  // Try to resolve prices for these ingredients
  const ingredients: SeasonalIngredient[] = []

  for (const window of allWindows) {
    const name = window.ingredient.trim()
    const isActive = activeWindowNames.has(name.toLowerCase())

    ingredients.push({
      name,
      recipeId: null,
      inSeason: true,
      microWindowActive: isActive,
      microWindowNotes: window.notes || null,
      priceCents: null,
      priceSource: null,
      seasonScore: isActive ? 90 : 60,
    })
  }

  // Also pull ingredients from recipes that the chef uses in this season
  const { data: seasonalRecipeIngredients } = await db
    .from('recipe_ingredients')
    .select(`
      ingredient_name,
      recipe:recipes(id, name, category)
    `)
    .eq('tenant_id', tenantId)
    .not('ingredient_name', 'is', null)
    .limit(500)

  if (seasonalRecipeIngredients) {
    const seen = new Set(windowIngredientNames)
    for (const ri of seasonalRecipeIngredients as any[]) {
      const name = (ri.ingredient_name || '').trim()
      if (!name || seen.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())
      // Check if this is a seasonal category ingredient (rough match)
      const isSeasonalGuess = checkSeasonalGuess(name, month)
      if (isSeasonalGuess) {
        ingredients.push({
          name,
          recipeId: ri.recipe?.id ?? null,
          inSeason: true,
          microWindowActive: false,
          microWindowNotes: null,
          priceCents: null,
          priceSource: null,
          seasonScore: 40,
        })
      }
    }
  }

  return ingredients.sort((a, b) => b.seasonScore - a.seasonScore)
}

// ── Seasonal Recipes ──────────────────────────────────────────────────────────

export async function suggestSeasonalRecipes(
  month: number,
  region: string,
  tenantId: string
): Promise<SeasonalRecipeMatch[]> {
  const db: any = createServerClient()

  // Get seasonal ingredients first
  const seasonalIngredients = await getSeasonalIngredients(month, region, tenantId)
  const seasonalNames = new Set(
    seasonalIngredients.map((i) => i.name.toLowerCase().trim())
  )

  if (seasonalNames.size === 0) return []

  // Get all recipes with their ingredients
  const { data: recipes } = await db
    .from('recipes')
    .select(`
      id, name, category, cuisine, rating, times_served,
      recipe_ingredients(ingredient_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)
    .order('rating', { ascending: false, nullsFirst: false })

  if (!recipes || recipes.length === 0) return []

  const matches: SeasonalRecipeMatch[] = []

  for (const recipe of recipes as any[]) {
    const ingredients = (recipe.recipe_ingredients || []) as any[]
    const totalCount = ingredients.length
    if (totalCount === 0) continue

    const seasonalCount = ingredients.filter((ri: any) => {
      const name = (ri.ingredient_name || '').toLowerCase().trim()
      return seasonalNames.has(name)
    }).length

    if (seasonalCount === 0) continue

    const matchPct = Math.round((seasonalCount / totalCount) * 100)
    const ratingBonus = (recipe.rating ?? 3) * 5
    const servedBonus = Math.min(20, (recipe.times_served ?? 0) * 2)
    const seasonScore = matchPct * 0.6 + ratingBonus + servedBonus

    matches.push({
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      cuisine: recipe.cuisine,
      rating: recipe.rating,
      timesServed: recipe.times_served ?? 0,
      seasonalIngredientCount: seasonalCount,
      totalIngredientCount: totalCount,
      seasonalMatchPct: matchPct,
      estimatedCostCents: null,
      seasonScore,
    })
  }

  return matches.sort((a, b) => b.seasonScore - a.seasonScore)
}

// ── Auto-Build Menu ─────────────────────────────────────────────────────────

export async function buildSeasonalMenu(
  month: number,
  region: string,
  guestCount: number,
  tenantId: string
): Promise<SeasonalMenuSuggestion> {
  const recipes = await suggestSeasonalRecipes(month, region, tenantId)
  const monthName = MONTH_NAMES[month - 1] || 'Unknown'

  // Determine which season we are in
  const seasonName = getSeasonNameForMonth(month)

  // Pick top recipe per course category for variety
  const usedIds = new Set<string>()
  const courses: SeasonalMenuCourse[] = []
  let totalCost = 0
  let seasonalItemCount = 0
  let totalItemCount = 0

  for (const course of COURSE_ORDER) {
    const candidate = recipes.find(
      (r) => r.category === course && !usedIds.has(r.id)
    )
    if (candidate) {
      usedIds.add(candidate.id)
      const recipeCost = candidate.estimatedCostCents ?? 0
      totalCost += recipeCost
      seasonalItemCount += candidate.seasonalIngredientCount
      totalItemCount += candidate.totalIngredientCount

      courses.push({
        course,
        recipe: candidate,
        reason: `${candidate.seasonalMatchPct}% seasonal ingredients${candidate.rating ? `, rated ${candidate.rating}/5` : ''}`,
      })
    }
  }

  // If we got fewer than 4 courses, fill with top remaining
  if (courses.length < 4) {
    for (const recipe of recipes) {
      if (usedIds.has(recipe.id)) continue
      if (courses.length >= 6) break

      usedIds.add(recipe.id)
      const courseName = recipe.category || 'entree'
      totalCost += recipe.estimatedCostCents ?? 0
      seasonalItemCount += recipe.seasonalIngredientCount
      totalItemCount += recipe.totalIngredientCount

      courses.push({
        course: courseName,
        recipe,
        reason: `${recipe.seasonalMatchPct}% seasonal ingredients`,
      })
    }
  }

  const coverage = totalItemCount > 0
    ? Math.round((seasonalItemCount / totalItemCount) * 100)
    : 0

  return {
    courses,
    totalEstimatedCostCents: totalCost,
    perGuestCostCents: guestCount > 0 ? Math.round(totalCost / guestCount) : 0,
    guestCount,
    seasonName,
    month,
    monthName,
    seasonalCoverage: coverage,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSeasonNameForMonth(month: number): string {
  if (month <= 2 || month === 12) return 'Winter'
  if (month <= 5) return 'Spring'
  if (month <= 8) return 'Summer'
  return 'Autumn'
}

function mapPalette(row: Record<string, unknown>): SeasonalPalette {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    season_name: row.season_name as string,
    sort_order: (row.sort_order as number) ?? 0,
    is_active: (row.is_active as boolean) ?? false,
    start_month_day: row.start_month_day as string,
    end_month_day: row.end_month_day as string,
    sensory_anchor: (row.sensory_anchor as string) ?? null,
    micro_windows: (row.micro_windows as any[]) ?? [],
    proven_wins: (row.proven_wins as any[]) ?? [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

// Rough heuristic for seasonal ingredients by month (New England bias)
function checkSeasonalGuess(name: string, month: number): boolean {
  const n = name.toLowerCase()
  const seasonalMap: Record<string, number[]> = {
    asparagus: [4, 5, 6],
    strawberr: [5, 6, 7],
    blueberr: [7, 8],
    tomato: [7, 8, 9],
    corn: [7, 8, 9],
    peach: [7, 8],
    apple: [9, 10, 11],
    pumpkin: [9, 10, 11],
    squash: [9, 10, 11],
    cranberr: [10, 11, 12],
    'sweet potato': [10, 11, 12],
    butternut: [9, 10, 11],
    rhubarb: [4, 5, 6],
    pea: [5, 6],
    radish: [4, 5, 6],
    beet: [6, 7, 8, 9, 10],
    carrot: [6, 7, 8, 9, 10],
    zucchini: [6, 7, 8],
    eggplant: [7, 8, 9],
    pepper: [7, 8, 9],
    kale: [9, 10, 11, 12, 1, 2],
    brussels: [10, 11, 12],
    parsnip: [10, 11, 12, 1, 2],
    turnip: [10, 11, 12],
    'celery root': [10, 11, 12, 1],
    fig: [8, 9, 10],
    plum: [7, 8, 9],
    melon: [7, 8],
    cucumber: [6, 7, 8],
    basil: [6, 7, 8, 9],
    mint: [5, 6, 7, 8],
    dill: [5, 6, 7],
    chive: [4, 5, 6],
  }

  for (const [key, months] of Object.entries(seasonalMap)) {
    if (n.includes(key) && months.includes(month)) {
      return true
    }
  }

  return false
}
