/**
 * Conservative article identity gate. Name similarity and article richness are not
 * identity proof. Non-exact aliases remain review candidates, never discarded.
 * This screens article identity only; it does not verify source claims, nutrition,
 * allergens, or preparation-specific properties.
 */
const PREPARATION = '(?:fresh|dried|frozen|canned|raw|whole|peeled|chopped|sliced|diced|ground)'
// Other leading words can be part of the identity (for example Ground Cherry).
const leadingPreparation = /^fresh\s+/i
const preparationSuffix = new RegExp(',\\s*' + PREPARATION + '(?:\\s*,\\s*' + PREPARATION + ')*$', 'i')
const preparationParens = new RegExp('\\(\\s*' + PREPARATION + '\\s*\\)', 'gi')

function fold(value) {
  return typeof value === 'string'
    ? value.normalize('NFKC').toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
}

export function normalizeIngredientName(value) {
  return fold(value)
    .replace(preparationParens, '')
    .replace(preparationSuffix, '')
    .replace(leadingPreparation, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const NON_INGREDIENT = /\b(?:restaurants?|cocktail bars?|films?|movies?|actors?|actresses|actress|singers?|musicians?|albums?|songs?|software|companies|company|corporations?|surnames?|given names?|colou?rs?|television|video games?|fictional|disambiguation)\b/i
const INGREDIENT_TYPE = /\b(?:plants?|herbs?|spices?|vegetables?|fruits?|seeds?|nuts?|legumes?|cereals?|grains?|foods?|condiments?|seasonings?|sauces?|oils?|fats?|flours?|starches?|sweeteners?|sugars?|salts?|cheeses?|dairy|milks?|meats?|fish|seafoods?|mushrooms?|fungus|fungi|beverages?|drinks?|teas?|coffees?|breads?|pastas?|noodles?|dishes|dish)\b/i

export function assessIngredientIdentity(ingredientName, summary) {
  const rawName = fold(ingredientName)
  const coreName = normalizeIngredientName(ingredientName)
  const articleName = fold(summary?.title)
  const description = typeof summary?.description === 'string' ? summary.description.trim() : ''
  const review = reason => ({ accepted: false, needsReview: true, reason, coreName, articleName })
  if (!rawName || !coreName || !articleName) return review('missing_identity')
  if (summary?.type === 'disambiguation') return review('disambiguation')
  if (NON_INGREDIENT.test(description)) return review('non_ingredient_entity')
  if (articleName !== rawName && articleName !== coreName) return review('unresolved_title')
  if (!description || !INGREDIENT_TYPE.test(description)) return review('article_type_unverified')
  return { accepted: true, needsReview: false, reason: 'whole_name_and_type', coreName, articleName }
}
