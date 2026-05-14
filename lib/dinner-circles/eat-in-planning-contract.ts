import type { DerivedPreferenceProfile } from '@/lib/discovery/preference-contract'
import type { DinnerFulfillmentMode } from './fulfillment-mode-contract'

export type EatInIngredientAngle =
  | 'pantry_first'
  | 'leftovers'
  | 'peak_ingredients'
  | 'budget_friendly'
  | 'dietary_fit'
  | 'open'

export type EatInMealDirectionInput = {
  fulfillmentMode: DinnerFulfillmentMode
  prompt?: string | null
  cuisines?: readonly string[]
  moods?: readonly string[]
  ingredientAngles?: readonly EatInIngredientAngle[]
  pantryItems?: readonly string[]
  dietaryConstraints?: readonly string[]
  preferenceProfile?: Pick<DerivedPreferenceProfile, 'positives' | 'hardConstraints'> | null
}

export type EatInMealDirection = {
  id: string
  title: string
  cuisine: string
  vibe: string
  ingredientAngle: EatInIngredientAngle
  pantryUses: string[]
  dietaryConstraints: string[]
  recipeExpansionEligible: boolean
  reasonCodes: string[]
}

function cleanList(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))]
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function firstKnown(values: readonly string[], fallback: string): string {
  return values.find(Boolean) ?? fallback
}

export function buildEatInMealDirections(input: EatInMealDirectionInput): EatInMealDirection[] {
  if (input.fulfillmentMode === 'eat_out') return []

  const prompt = input.prompt?.toLowerCase() ?? ''
  const cuisines = cleanList(input.cuisines)
  const moods = cleanList(input.moods)
  const pantryItems = cleanList(input.pantryItems)
  const dietaryConstraints = [
    ...cleanList(input.dietaryConstraints),
    ...cleanList(input.preferenceProfile?.hardConstraints.map((signal) => signal.rawValue)),
  ]
  const positiveTerms = cleanList(
    input.preferenceProfile?.positives.map((signal) => signal.rawValue)
  )

  const inferredCuisine = prompt.includes('northern european')
    ? 'Northern European'
    : prompt.includes('italian') || prompt.includes('pasta')
      ? 'Italian'
      : firstKnown(cuisines, firstKnown(positiveTerms, 'Seasonal home cooking'))

  const inferredVibe = prompt.includes('cozy')
    ? 'cozy'
    : prompt.includes('quick')
      ? 'quick'
      : firstKnown(moods, 'balanced')
  const mealFocus = prompt.includes('pasta') ? 'pasta night' : 'dinner direction'

  const requestedAngles = input.ingredientAngles?.length
    ? [...input.ingredientAngles]
    : prompt.includes('peak') || prompt.includes('seasonal')
      ? (['peak_ingredients'] satisfies EatInIngredientAngle[])
      : pantryItems.length
        ? (['pantry_first'] satisfies EatInIngredientAngle[])
        : (['open'] satisfies EatInIngredientAngle[])

  return requestedAngles.map((angle) => {
    const title = [
      inferredCuisine,
      inferredVibe,
      mealFocus,
      angle === 'open' ? '' : angle.replace(/_/g, ' '),
    ]
      .filter(Boolean)
      .join(' ')

    return {
      id: slug(`${inferredCuisine}-${inferredVibe}-${angle}`),
      title,
      cuisine: inferredCuisine,
      vibe: inferredVibe,
      ingredientAngle: angle,
      pantryUses: pantryItems.slice(0, 5),
      dietaryConstraints,
      recipeExpansionEligible: dietaryConstraints.length === 0 || angle === 'dietary_fit',
      reasonCodes: [
        prompt ? 'prompt_direction' : 'structured_direction',
        pantryItems.length ? 'pantry_context_available' : 'pantry_context_missing',
        dietaryConstraints.length ? 'dietary_constraints_present' : 'no_dietary_constraints',
      ],
    }
  })
}

export type EatInRecipeExpansionInput = {
  direction: EatInMealDirection
  maxOptions?: number
  allowGeneratedGuidance?: boolean
  trustedRecipeLinks?: readonly string[]
  acknowledgedDietaryConstraints?: readonly string[]
}

export type EatInRecipeExpansion = {
  directionId: string
  status: 'ready' | 'needs_review'
  qualityGate: {
    hasTrustedSource: boolean
    dietaryReviewed: boolean
    quantitySpecific: boolean
    substitutionReviewed: boolean
  }
  options: Array<{
    title: string
    source: 'trusted_link' | 'generated_guidance'
    href?: string
    requiredPantryItems: string[]
    needsGroceryItems: string[]
  }>
  blockers: string[]
}

export function expandEatInMealDirectionToRecipes(
  input: EatInRecipeExpansionInput
): EatInRecipeExpansion {
  const trustedLinks = cleanList(input.trustedRecipeLinks)
  const acknowledged = new Set(
    cleanList(input.acknowledgedDietaryConstraints).map((item) => item.toLowerCase())
  )
  const dietaryReviewed = input.direction.dietaryConstraints.every((constraint) =>
    acknowledged.has(constraint.toLowerCase())
  )
  const maxOptions = Math.max(1, Math.min(input.maxOptions ?? 3, 5))
  const options: EatInRecipeExpansion['options'] = []

  for (const href of trustedLinks.slice(0, maxOptions)) {
    options.push({
      title: `${input.direction.title} recipe`,
      source: 'trusted_link',
      href,
      requiredPantryItems: input.direction.pantryUses,
      needsGroceryItems: inferGroceryNeeds(input.direction).slice(0, 4),
    })
  }

  if (options.length < maxOptions && input.allowGeneratedGuidance) {
    options.push({
      title: `${input.direction.title} cooking outline`,
      source: 'generated_guidance',
      requiredPantryItems: input.direction.pantryUses,
      needsGroceryItems: inferGroceryNeeds(input.direction).slice(0, 4),
    })
  }

  const qualityGate = {
    hasTrustedSource: trustedLinks.length > 0,
    dietaryReviewed,
    quantitySpecific: false,
    substitutionReviewed: input.direction.dietaryConstraints.length === 0,
  }
  const blockers = Object.entries(qualityGate)
    .filter(([, ready]) => !ready)
    .map(([key]) => key)

  return {
    directionId: input.direction.id,
    status: blockers.length === 0 ? 'ready' : 'needs_review',
    qualityGate,
    options,
    blockers,
  }
}

function inferGroceryNeeds(direction: EatInMealDirection): string[] {
  const base = ['fresh herbs', 'acid', 'main protein']
  if (direction.title.toLowerCase().includes('pasta')) base.push('pasta')
  if (direction.ingredientAngle === 'peak_ingredients') base.push('seasonal produce')
  return base.filter(
    (item) => !direction.pantryUses.some((pantryItem) => pantryItem.toLowerCase().includes(item))
  )
}
