import { deriveAllergenFlagsFromText, mergeAllergenFlags } from '@/lib/public-data/allergens'
import {
  getBestFoodDataCentralMatch,
  summarizeFoodNutrition,
  type FoodDataCentralFood,
} from '@/lib/public-data/usda-fooddata'

export type IngredientPublicDataEnrichment = {
  allergenFlags: string[]
  nutrition: {
    caloriesPer100g: number | null
    proteinPer100g: number | null
    carbsPer100g: number | null
    fatPer100g: number | null
    fiberPer100g: number | null
    sodiumMgPer100g: number | null
  } | null
  nutritionSource: string | null
  nutritionUpdatedAt: string | null
  matchedFood: Pick<FoodDataCentralFood, 'fdcId' | 'description' | 'dataType'> | null
}

export async function enrichIngredientWithPublicData(input: {
  name: string
  description?: string | null
  allergenFlags?: string[]
}): Promise<IngredientPublicDataEnrichment> {
  const derivedAllergens = deriveAllergenFlagsFromText(input.name, input.description)
  const allergenFlags = mergeAllergenFlags(input.allergenFlags ?? [], derivedAllergens)

  const matchedFood = await getBestFoodDataCentralMatch(input.name)
  const nutrition = matchedFood ? summarizeFoodNutrition(matchedFood) : null

  return {
    allergenFlags,
    nutrition,
    nutritionSource: matchedFood
      ? `USDA FoodData Central${matchedFood.dataType ? ` (${matchedFood.dataType})` : ''}`
      : null,
    nutritionUpdatedAt: matchedFood ? new Date().toISOString() : null,
    matchedFood: matchedFood
      ? {
          fdcId: matchedFood.fdcId,
          description: matchedFood.description,
          dataType: matchedFood.dataType,
        }
      : null,
  }
}
