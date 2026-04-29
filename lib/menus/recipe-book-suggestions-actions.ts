'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

const RecipeBookSuggestionContextSchema = z.object({
  sceneType: z.string().trim().max(120).optional(),
  cuisineType: z.string().trim().max(120).optional(),
  serviceStyle: z.string().trim().max(80).optional(),
  guestCount: z.number().int().positive().max(10000).optional(),
  season: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
  allergies: z.union([z.array(z.string().trim().max(100)), z.string().trim().max(1000)]).optional(),
})

type RecipeRow = {
  id: string
  name: string | null
  category: string | null
  description: string | null
  dietary_tags: string[] | null
  allergen_flags: string[] | null
  times_cooked: number | null
  last_cooked_at: string | null
}

const CATEGORY_COURSE_LABELS: Record<string, string> = {
  appetizer: 'Appetizer',
  beverage: 'Beverage',
  bread: 'Bread',
  condiment: 'Condiment',
  dessert: 'Dessert',
  fruit: 'Fruit',
  pasta: 'Pasta',
  protein: 'Main Course',
  salad: 'Salad',
  sauce: 'Sauce',
  soup: 'Soup',
  starch: 'Side',
  vegetable: 'Vegetable',
}

function tokenize(value: string | null | undefined): string[] {
  return (value ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
}

function normalizeList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function normalizeConstraintTokens(values: string[]): Set<string> {
  return new Set(values.flatMap((value) => tokenize(value)))
}

function extractAllergyTokens(context: z.infer<typeof RecipeBookSuggestionContextSchema>): Set<string> {
  const explicit = Array.isArray(context.allergies)
    ? context.allergies
    : typeof context.allergies === 'string'
      ? [context.allergies]
      : []

  const noteAllergyLines = (context.notes ?? '')
    .split(/\r?\n/)
    .filter((line) => /\ballerg/i.test(line) && !/\b(no|none|not specified)\b/i.test(line))
    .map((line) => {
      const [, afterColon] = line.split(/:(.*)/s)
      return afterColon ?? line
    })

  return normalizeConstraintTokens([...explicit, ...noteAllergyLines])
}

function hasBlockedAllergen(recipe: RecipeRow, blockedAllergyTokens: Set<string>): boolean {
  if (blockedAllergyTokens.size === 0) return false
  const recipeAllergenTokens = normalizeConstraintTokens(normalizeList(recipe.allergen_flags))
  for (const token of blockedAllergyTokens) {
    if (recipeAllergenTokens.has(token)) return true
  }
  return false
}

function courseLabelFor(recipe: RecipeRow): string {
  const category = (recipe.category ?? '').toLowerCase()
  return CATEGORY_COURSE_LABELS[category] ?? 'Course'
}

function scoreRecipe(recipe: RecipeRow, contextTokens: Set<string>): number {
  const searchable = [
    recipe.name,
    recipe.category,
    recipe.description,
    ...normalizeList(recipe.dietary_tags),
  ].join(' ')

  const recipeTokens = new Set(tokenize(searchable))
  let score = 0

  for (const token of contextTokens) {
    if (recipeTokens.has(token)) score += 5
  }

  const timesCooked = Number(recipe.times_cooked ?? 0)
  if (timesCooked > 0) score += Math.min(6, Math.ceil(Math.log2(timesCooked + 1)))
  if (recipe.last_cooked_at) score += 2
  if (recipe.description) score += 1

  return score
}

function buildSuggestionName(index: number, hasContext: boolean): string {
  if (!hasContext) {
    return index === 0
      ? 'Recipe Book Picks'
      : index === 1
        ? 'Additional Recipe Matches'
        : 'More Recipe Book Matches'
  }
  return index === 0 ? 'Closest Recipe Matches' : index === 1 ? 'Service-Ready Matches' : 'Additional Recipe Matches'
}

export async function getRecipeBookMenuSuggestions(context: unknown) {
  const user = await requireChef()
  const validated = RecipeBookSuggestionContextSchema.parse(context)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('recipes')
    .select(
      'id, name, category, description, dietary_tags, allergen_flags, times_cooked, last_cooked_at'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .order('name', { ascending: true })
    .limit(75)

  if (error) {
    console.error('[recipe-book-suggestions] Recipe query failed:', error)
    throw new Error('Could not load recipe book matches')
  }

  const recipes = ((data ?? []) as RecipeRow[]).filter((recipe) => recipe.id && recipe.name)
  if (recipes.length === 0) return []

  const contextTokens = new Set(
    tokenize(
      [
        validated.sceneType,
        validated.cuisineType,
        validated.serviceStyle,
        validated.season,
        validated.notes,
      ].join(' ')
    )
  )
  const hasContext = contextTokens.size > 0 || Boolean(validated.guestCount)
  const blockedAllergyTokens = extractAllergyTokens(validated)

  const ranked = recipes
    .filter((recipe) => !hasBlockedAllergen(recipe, blockedAllergyTokens))
    .map((recipe) => ({ recipe, score: scoreRecipe(recipe, contextTokens) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (a.recipe.name ?? '').localeCompare(b.recipe.name ?? '')
    })
    .map((entry) => entry.recipe)

  const suggestions = []
  const used = new Set<string>()

  for (let groupIndex = 0; groupIndex < 3; groupIndex++) {
    const group = ranked.filter((recipe) => !used.has(recipe.id)).slice(0, 5)
    if (group.length === 0) break
    for (const recipe of group) used.add(recipe.id)

    suggestions.push({
      name: buildSuggestionName(groupIndex, hasContext),
      rationale: hasContext
        ? 'These are existing recipes from your book ranked against the menu details you entered.'
        : 'These are existing recipes from your book. Add more menu details to narrow the match.',
      courses: group.map((recipe) => ({
        course: courseLabelFor(recipe),
        dish: recipe.name ?? 'Recipe',
        description: recipe.description ?? '',
        recipeId: recipe.id,
        dietaryTags: normalizeList(recipe.dietary_tags),
        allergenFlags: normalizeList(recipe.allergen_flags),
      })),
    })
  }

  return suggestions
}
