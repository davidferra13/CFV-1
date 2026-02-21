'use server'

import { requireChef } from '@/lib/auth/get-user'
import { searchNutrition, type NutritionResult } from '@/lib/nutrition/open-food-facts'
import { searchFdc, type FdcNutritionResult } from '@/lib/nutrition/usda-fdc'

export async function searchNutritionAction(query: string): Promise<NutritionResult[]> {
  await requireChef()
  return searchNutrition(query)
}

export async function searchFdcAction(query: string): Promise<FdcNutritionResult[]> {
  await requireChef()
  return searchFdc(query)
}
