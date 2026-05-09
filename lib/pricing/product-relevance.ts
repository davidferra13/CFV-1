import { normalizeIngredientName } from './name-normalizer'
import { isNonFood } from './non-food-filter'

const PREPARED_FOOD_HINTS = new Set([
  'bowl',
  'cake',
  'candy',
  'cereal',
  'cookie',
  'cookies',
  'cream',
  'dessert',
  'dip',
  'dressing',
  'entree',
  'flavor',
  'flavored',
  'ice',
  'kit',
  'meal',
  'mix',
  'pizza',
  'popcorn',
  'salad',
  'sandwich',
  'sauce',
  'seasoning',
  'snack',
  'soup',
  'spread',
  'syrup',
])

const RAW_FOOD_ALLOWLIST = new Set([
  'almond',
  'apple',
  'arugula',
  'asparagus',
  'bacon',
  'basil',
  'bean',
  'beef',
  'bell',
  'brie',
  'broccoli',
  'butter',
  'carrot',
  'cheddar',
  'cheese',
  'chicken',
  'cilantro',
  'cod',
  'corn',
  'cream',
  'cucumber',
  'egg',
  'flour',
  'garlic',
  'ginger',
  'gruyere',
  'ham',
  'kale',
  'lamb',
  'lemon',
  'lettuce',
  'lime',
  'milk',
  'mushroom',
  'oil',
  'onion',
  'parmesan',
  'parsley',
  'pasta',
  'pepper',
  'pork',
  'potato',
  'rice',
  'salmon',
  'sausage',
  'scallop',
  'shrimp',
  'spinach',
  'steak',
  'sugar',
  'tomato',
  'tuna',
  'turkey',
  'vinegar',
  'yogurt',
])

const SINGLE_TOKEN_FALSE_FOLLOWERS: Record<string, Set<string>> = {
  butter: new Set(['lettuce', 'pecan', 'cookie', 'cookies', 'cake', 'popcorn', 'sauce', 'syrup']),
  cilantro: new Set(['lime', 'chicken', 'dressing', 'sauce', 'dip']),
  basil: new Set(['pesto', 'sauce', 'tomato', 'chicken']),
  garlic: new Set(['bread', 'sauce', 'dip', 'spread']),
  lemon: new Set(['cake', 'cookie', 'cookies', 'bar', 'bars', 'ade', 'juice']),
  lime: new Set(['chips', 'soda', 'juice', 'ade']),
  onion: new Set(['dip', 'ring', 'rings', 'soup']),
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function containsOrderedSubsequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0) return false
  let cursor = 0
  for (const token of haystack) {
    if (token === needle[cursor]) cursor++
    if (cursor === needle.length) return true
  }
  return false
}

/**
 * Guard product-to-ingredient matching before a price can influence PIE.
 * This protects ingredient pricing from grocery-catalog false positives like
 * "cocoa butter lotion" for butter or "cilantro lime chicken" for cilantro.
 */
export function isProductRelevantToIngredient(
  productName: string | null | undefined,
  ingredientName: string
): boolean {
  if (!productName) return false
  if (isNonFood(productName)) return false

  const productTokens = tokenize(normalizeIngredientName(productName))
  const ingredientTokens = tokenize(normalizeIngredientName(ingredientName))
  if (productTokens.length === 0 || ingredientTokens.length === 0) return false

  const phrase = ingredientTokens.join(' ')
  const productPhrase = productTokens.join(' ')
  if (productPhrase === phrase) return true
  if (!containsOrderedSubsequence(productTokens, ingredientTokens)) return false

  if (ingredientTokens.length === 1) {
    const ingredient = ingredientTokens[0]
    const idx = productTokens.indexOf(ingredient)
    const next = idx >= 0 ? productTokens[idx + 1] : undefined
    if (next && SINGLE_TOKEN_FALSE_FOLLOWERS[ingredient]?.has(next)) return false

    const nonIngredientSignals = productTokens.filter(
      (token) =>
        token !== ingredient && !RAW_FOOD_ALLOWLIST.has(token) && PREPARED_FOOD_HINTS.has(token)
    )
    if (nonIngredientSignals.length > 0) return false
  }

  return true
}
