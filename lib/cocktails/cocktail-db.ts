// TheCocktailDB - free cocktail recipe API, no key required
// https://www.thecocktaildb.com/api.php
// Free for personal/educational use, no signup

const COCKTAIL_BASE = 'https://www.thecocktaildb.com/api/json/v1/1'

export interface Cocktail {
  id: string
  name: string
  category: string
  glass: string
  instructions: string
  thumbnail: string
  ingredients: { ingredient: string; measure: string }[]
  alcoholic: boolean
}

/**
 * Search cocktails by name.
 * e.g. "margarita", "old fashioned", "mojito"
 */
export async function searchCocktails(query: string): Promise<Cocktail[]> {
  try {
    const res = await fetch(`${COCKTAIL_BASE}/search.php?s=${encodeURIComponent(query)}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.drinks ?? []).map(mapCocktail)
  } catch {
    return []
  }
}

/**
 * Get a cocktail by its ID.
 */
export async function getCocktailById(id: string): Promise<Cocktail | null> {
  try {
    const res = await fetch(`${COCKTAIL_BASE}/lookup.php?i=${id}`, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.drinks?.length) return null
    return mapCocktail(data.drinks[0])
  } catch {
    return null
  }
}

/**
 * Get a random cocktail - great for "cocktail of the day" features.
 */
export async function getRandomCocktail(): Promise<Cocktail | null> {
  try {
    const res = await fetch(`${COCKTAIL_BASE}/random.php`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.drinks?.length) return null
    return mapCocktail(data.drinks[0])
  } catch {
    return null
  }
}

/**
 * Search cocktails by ingredient.
 * e.g. "vodka", "gin", "tequila"
 * Returns simplified results (name + thumbnail only).
 */
export async function searchByIngredient(
  ingredient: string
): Promise<{ id: string; name: string; thumbnail: string }[]> {
  try {
    const res = await fetch(`${COCKTAIL_BASE}/filter.php?i=${encodeURIComponent(ingredient)}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.drinks ?? []).map((d: any) => ({
      id: d.idDrink,
      name: d.strDrink,
      thumbnail: d.strDrinkThumb ?? '',
    }))
  } catch {
    return []
  }
}

/**
 * List all cocktail categories.
 */
export async function getCategories(): Promise<string[]> {
  try {
    const res = await fetch(`${COCKTAIL_BASE}/list.php?c=list`, { next: { revalidate: 86400 * 7 } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.drinks ?? []).map((d: any) => d.strCategory)
  } catch {
    return []
  }
}

function mapCocktail(raw: any): Cocktail {
  // Extract ingredients - API stores them as strIngredient1..15
  const ingredients: { ingredient: string; measure: string }[] = []
  for (let i = 1; i <= 15; i++) {
    const ingredient = raw[`strIngredient${i}`]
    if (ingredient && ingredient.trim()) {
      ingredients.push({
        ingredient: ingredient.trim(),
        measure: (raw[`strMeasure${i}`] ?? '').trim(),
      })
    }
  }

  return {
    id: raw.idDrink,
    name: raw.strDrink ?? '',
    category: raw.strCategory ?? '',
    glass: raw.strGlass ?? '',
    instructions: raw.strInstructions ?? '',
    thumbnail: raw.strDrinkThumb ?? '',
    ingredients,
    alcoholic: raw.strAlcoholic === 'Alcoholic',
  }
}
