'use server'

// Seasonal Menu Builder - Server Actions
// Exposes the seasonal menu intelligence layer to the UI.

import { requireChef } from '@/lib/auth/get-user'
import {
  getSeasonalIngredients,
  suggestSeasonalRecipes,
  buildSeasonalMenu,
  type SeasonalIngredient,
  type SeasonalRecipeMatch,
  type SeasonalMenuSuggestion,
} from './seasonal-menu'

export async function fetchSeasonalIngredients(
  month: number,
  region: string
): Promise<SeasonalIngredient[]> {
  const user = await requireChef()
  return getSeasonalIngredients(month, region, user.tenantId!)
}

export async function fetchSeasonalRecipes(
  month: number,
  region: string
): Promise<SeasonalRecipeMatch[]> {
  const user = await requireChef()
  return suggestSeasonalRecipes(month, region, user.tenantId!)
}

export async function fetchSeasonalMenuSuggestion(
  month: number,
  region: string,
  guestCount: number
): Promise<SeasonalMenuSuggestion> {
  const user = await requireChef()
  return buildSeasonalMenu(month, region, guestCount, user.tenantId!)
}
