export type ConstraintRecipeIngredientCoverage = {
  ingredientId: string
  ingredientName: string
  neededQty: number
  onHandQty: number
  unit: string
  status: 'ready' | 'partial' | 'missing'
}

export type ConstraintRecipePick = {
  recipeId: string
  recipeName: string
  category: string
  servings: number | null
  dietaryTags: string[]
  timesCooked: number
  coveragePct: number
  readyCount: number
  partialCount: number
  missingCount: number
  allergyConflicts: string[]
  ingredientCoverage: ConstraintRecipeIngredientCoverage[]
}

export type ConstraintRecipePickerResult = {
  status: 'ok' | 'empty' | 'error'
  picks: ConstraintRecipePick[]
  dietaryTags: string[]
  allergies: string[]
  filteredOutCount: number
  error?: string
}
