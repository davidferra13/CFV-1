// Food & Cocktail Lookup - Server Actions
// Wraps Open Food Facts and TheCocktailDB utilities for use in client components.
// Both APIs are free, no key needed.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { searchProducts, getProductByBarcode, type FoodProduct } from '@/lib/food/open-food-facts'
import {
  searchCocktails,
  searchByIngredient,
  getCocktailById,
  type Cocktail,
} from '@/lib/cocktails/cocktail-db'

// ─── Open Food Facts ─────────────────────────────────────────────────────────

export async function searchFoodProductsAction(
  query: string,
  pageSize = 8
): Promise<FoodProduct[]> {
  await requireChef()
  if (!query.trim()) return []
  try {
    return await searchProducts(query.trim(), pageSize)
  } catch (err) {
    console.error('[non-blocking] Open Food Facts search failed', err)
    return []
  }
}

export async function getFoodProductByBarcodeAction(barcode: string): Promise<FoodProduct | null> {
  await requireChef()
  if (!barcode.trim()) return null
  try {
    return await getProductByBarcode(barcode.trim())
  } catch (err) {
    console.error('[non-blocking] Open Food Facts barcode lookup failed', err)
    return null
  }
}

// ─── TheCocktailDB ───────────────────────────────────────────────────────────

export async function searchCocktailsAction(query: string): Promise<Cocktail[]> {
  await requireChef()
  if (!query.trim()) return []
  try {
    return await searchCocktails(query.trim())
  } catch (err) {
    console.error('[non-blocking] CocktailDB search failed', err)
    return []
  }
}

export async function searchCocktailsByIngredientAction(
  ingredient: string
): Promise<{ id: string; name: string; thumbnail: string }[]> {
  await requireChef()
  if (!ingredient.trim()) return []
  try {
    return await searchByIngredient(ingredient.trim())
  } catch (err) {
    console.error('[non-blocking] CocktailDB ingredient search failed', err)
    return []
  }
}

export async function getCocktailByIdAction(id: string): Promise<Cocktail | null> {
  await requireChef()
  if (!id.trim()) return null
  try {
    return await getCocktailById(id.trim())
  } catch (err) {
    console.error('[non-blocking] CocktailDB lookup failed', err)
    return null
  }
}
