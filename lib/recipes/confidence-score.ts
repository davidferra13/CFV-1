export type RecipeConfidenceInput = {
  hasMethod: boolean
  hasIngredients: boolean
  ingredientCount: number
  hasPrices: boolean
  pricedIngredientPct: number
  hasPeakWindows: boolean
  hasDietaryTags: boolean
  hasPrepTimes: boolean
  hasCategory: boolean
  timesCookedInEvents: number
  hasPhoto: boolean
}

export type RecipeConfidence = {
  score: number
  level: 'sketch' | 'draft' | 'solid' | 'dialed-in'
  label: string
}

export function calculateRecipeConfidence(input: RecipeConfidenceInput): RecipeConfidence {
  let score = 0

  // Foundation (40 points)
  if (input.hasMethod) score += 15
  if (input.hasIngredients) score += 15
  if (input.hasCategory) score += 5
  if (input.hasDietaryTags) score += 5

  // Precision (30 points)
  if (input.hasPrices) score += 5
  score += Math.round(input.pricedIngredientPct * 0.1)
  if (input.hasPeakWindows) score += 10
  if (input.hasPrepTimes) score += 5

  // Battle-tested (20 points)
  const eventPoints = Math.min(input.timesCookedInEvents * 5, 20)
  score += eventPoints

  // Polish (10 points)
  if (input.hasPhoto) score += 5
  if (input.ingredientCount >= 3) score += 3
  if (input.ingredientCount >= 6) score += 2

  score = Math.min(score, 100)

  let level: RecipeConfidence['level']
  let label: string

  if (score >= 80) {
    level = 'dialed-in'
    label = 'Dialed in'
  } else if (score >= 55) {
    level = 'solid'
    label = 'Solid'
  } else if (score >= 30) {
    level = 'draft'
    label = 'Draft'
  } else {
    level = 'sketch'
    label = 'Sketch'
  }

  return { score, level, label }
}
