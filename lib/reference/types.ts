// Culinary Reference Library - Shared Types
// Phase 1: static JSON seed data, no database dependency

// ── Module 1: Food Safety ──

export type FoodSafetyCategory =
  | 'protein'
  | 'produce'
  | 'dairy'
  | 'seafood'
  | 'egg'
  | 'grain'
  | 'prepared'

export type FoodSafetyEntry = {
  id: string
  category: FoodSafetyCategory
  item: string
  internalTempF: number | null
  internalTempC: number | null
  restTimeMinutes: number | null
  holdTempMinF: number | null
  holdTempMaxF: number | null
  dangerZoneNotes: string | null
  coolingProtocol: string | null
  thawingMethods: string[]
  storageFridge: string | null
  storageFreezer: string | null
  sourceUrl: string
  sourceLabel: string
  lastVerified: string
  keywords: string[]
}

// ── Module 2: Substitution Engine ──

export type SubstitutionReason =
  | 'allergy_dairy'
  | 'allergy_egg'
  | 'allergy_gluten'
  | 'allergy_nut'
  | 'allergy_shellfish'
  | 'allergy_soy'
  | 'allergy_fish'
  | 'allergy_sesame'
  | 'dietary_vegan'
  | 'dietary_vegetarian'
  | 'dietary_keto'
  | 'dietary_kosher'
  | 'dietary_halal'
  | 'dietary_low_sodium'
  | 'dietary_paleo'
  | 'availability'
  | 'cost'
  | 'preference'

export type QualityImpact = 'none' | 'minor' | 'moderate' | 'significant'
export type SubstitutionConfidence = 'verified' | 'common' | 'experimental'

export type SubstitutionRule = {
  id: string
  sourceIngredient: string
  sourceIngredientFormId: string | null
  targetIngredient: string
  targetIngredientFormId: string | null
  ratio: string
  reasons: SubstitutionReason[]
  behaviorNotes: string
  qualityImpact: QualityImpact
  cuisineContext: string | null
  limitations: string | null
  confidence: SubstitutionConfidence
  sources: string[]
}

// ── Module 3: Dietary Conditions ──

export type ConditionCategory =
  | 'allergy'
  | 'intolerance'
  | 'autoimmune'
  | 'religious'
  | 'lifestyle'
  | 'metabolic'

export type ConditionSeverity = 'life_threatening' | 'medical' | 'strict_observance' | 'preference'

export type DietaryConditionReference = {
  id: string
  slug: string
  name: string
  category: ConditionCategory
  severity: ConditionSeverity
  summary: string
  avoidList: string[]
  avoidDetails: string
  safeAlternatives: string[]
  crossContactRisk: boolean
  crossContactNotes: string | null
  commonMistakes: string[]
  clientQuestions: string[]
  sources: string[]
  linkedAllergenTags: string[]
  linkedDietFlags: string[]
}

// ── Module 4: Nutritional Data ──

export type NutritionEntry = {
  id: string
  usdaFdcId: number | null
  ingredientName: string
  ingredientFormId: string | null
  servingSize: number
  servingLabel: string
  calories: number
  protein: number
  fat: number
  saturatedFat: number | null
  carbohydrates: number
  fiber: number | null
  sugar: number | null
  sodium: number | null
  cholesterol: number | null
  source: string
  sourceId: string
}

export type MacroSummary = {
  calories: number
  protein: number
  fat: number
  carbohydrates: number
  fiber: number | null
}

export type RecipeNutritionSummary = {
  recipeId: string
  servings: number
  perServing: MacroSummary
  totalRecipe: MacroSummary
  coverage: number
  missingIngredients: string[]
  disclaimer: string
}

export const NUTRITION_DISCLAIMER =
  'Approximate values for planning purposes. Based on USDA reference data for raw ingredients. Actual values vary by brand, preparation method, and serving size. Not suitable for medical dietary planning.'
