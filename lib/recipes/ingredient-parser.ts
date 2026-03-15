// Ingredient String Parser
// Parses natural language ingredient strings into structured data
// e.g. "2 cups all-purpose flour, sifted" -> { quantity: 2, unit: "cups", name: "flour", preparation: "sifted" }
// No AI needed: pure regex + deterministic logic

export type ParsedIngredient = {
  quantity: number | null
  unit: string | null
  name: string
  preparation: string | null
}

// Unicode fraction map
const UNICODE_FRACTIONS: Record<string, number> = {
  '\u00BD': 0.5, // ½
  '\u2153': 1 / 3, // ⅓
  '\u2154': 2 / 3, // ⅔
  '\u00BC': 0.25, // ¼
  '\u00BE': 0.75, // ¾
  '\u2155': 0.2, // ⅕
  '\u2156': 0.4, // ⅖
  '\u2157': 0.6, // ⅗
  '\u2158': 0.8, // ⅘
  '\u2159': 1 / 6, // ⅙
  '\u215A': 5 / 6, // ⅚
  '\u215B': 0.125, // ⅛
  '\u215C': 0.375, // ⅜
  '\u215D': 0.625, // ⅝
  '\u215E': 0.875, // ⅞
}

// Common units (normalized forms)
const UNIT_MAP: Record<string, string> = {
  // Volume
  cup: 'cup',
  cups: 'cup',
  c: 'cup',
  'c.': 'cup',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsp: 'tbsp',
  tbsps: 'tbsp',
  tbs: 'tbsp',
  'tbs.': 'tbsp',
  'tbsp.': 'tbsp',
  tb: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsp: 'tsp',
  tsps: 'tsp',
  'tsp.': 'tsp',
  t: 'tsp',
  liter: 'liter',
  liters: 'liter',
  litre: 'liter',
  litres: 'liter',
  l: 'liter',
  milliliter: 'ml',
  milliliters: 'ml',
  ml: 'ml',
  gallon: 'gallon',
  gallons: 'gallon',
  gal: 'gallon',
  quart: 'quart',
  quarts: 'quart',
  qt: 'quart',
  'qt.': 'quart',
  pint: 'pint',
  pints: 'pint',
  pt: 'pint',
  'pt.': 'pint',
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  'fl oz': 'fl oz',
  'fl. oz.': 'fl oz',
  // Weight
  pound: 'lb',
  pounds: 'lb',
  lb: 'lb',
  lbs: 'lb',
  'lb.': 'lb',
  'lbs.': 'lb',
  ounce: 'oz',
  ounces: 'oz',
  oz: 'oz',
  'oz.': 'oz',
  gram: 'g',
  grams: 'g',
  g: 'g',
  'g.': 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  kg: 'kg',
  'kg.': 'kg',
  // Count / Other
  piece: 'piece',
  pieces: 'piece',
  pc: 'piece',
  pcs: 'piece',
  slice: 'slice',
  slices: 'slice',
  clove: 'clove',
  cloves: 'clove',
  head: 'head',
  heads: 'head',
  bunch: 'bunch',
  bunches: 'bunch',
  sprig: 'sprig',
  sprigs: 'sprig',
  stalk: 'stalk',
  stalks: 'stalk',
  stick: 'stick',
  sticks: 'stick',
  can: 'can',
  cans: 'can',
  jar: 'jar',
  jars: 'jar',
  package: 'package',
  packages: 'package',
  pkg: 'package',
  bag: 'bag',
  bags: 'bag',
  box: 'box',
  boxes: 'box',
  bottle: 'bottle',
  bottles: 'bottle',
  handful: 'handful',
  handfuls: 'handful',
  dash: 'dash',
  dashes: 'dash',
  pinch: 'pinch',
  pinches: 'pinch',
  drop: 'drop',
  drops: 'drop',
  leaf: 'leaf',
  leaves: 'leaf',
  whole: 'whole',
  large: 'large',
  medium: 'medium',
  small: 'small',
}

// Size descriptors that are NOT units (they modify the ingredient name)
const SIZE_DESCRIPTORS = new Set(['large', 'medium', 'small', 'extra-large', 'jumbo'])

/**
 * Parse a fraction string like "1/2" or "3/4" into a number.
 */
function parseFraction(str: string): number | null {
  const parts = str.split('/')
  if (parts.length !== 2) return null
  const num = parseFloat(parts[0])
  const den = parseFloat(parts[1])
  if (isNaN(num) || isNaN(den) || den === 0) return null
  return num / den
}

/**
 * Parse a quantity string that may contain whole numbers, fractions, decimals,
 * unicode fractions, or ranges.
 * For ranges like "2-3", takes the first value.
 */
function parseQuantity(str: string): number | null {
  let s = str.trim()
  if (!s) return null

  // Handle "to taste", "pinch", "dash" as quantity-less
  if (/^(to taste|as needed|some|a few)$/i.test(s)) return null

  // Handle ranges: take the first value (e.g., "2-3" -> 2)
  const rangeMatch = s.match(/^([\d\s\/½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞.]+)\s*[-–]\s*[\d\s\/½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞.]+$/)
  if (rangeMatch) {
    s = rangeMatch[1].trim()
  }

  // Replace unicode fractions
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(char)) {
      // Could be "1½" (whole + fraction)
      const idx = s.indexOf(char)
      const before = s.slice(0, idx).trim()
      const whole = before ? parseFloat(before) : 0
      if (!isNaN(whole)) {
        return whole + val
      }
      return val
    }
  }

  // Handle "1 1/2" (whole + fraction with space)
  const mixedMatch = s.match(/^(\d+)\s+(\d+\/\d+)$/)
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1])
    const frac = parseFraction(mixedMatch[2])
    if (!isNaN(whole) && frac !== null) return whole + frac
  }

  // Handle simple fraction "1/2"
  if (s.includes('/')) {
    const frac = parseFraction(s)
    if (frac !== null) return frac
  }

  // Handle decimal or integer
  const num = parseFloat(s)
  if (!isNaN(num)) return num

  return null
}

/**
 * Extract preparation notes from an ingredient string.
 * Looks for text after commas, or parenthetical notes.
 */
function extractPreparation(name: string): { cleanName: string; preparation: string | null } {
  let preparation: string | null = null
  let cleanName = name

  // Extract parenthetical content like "(about 2 cups)" or "(14 oz)"
  // Keep parenthetical size info (e.g., "(14 oz) can") as part of the name
  const parenMatch = cleanName.match(/\(([^)]+)\)/)
  if (parenMatch) {
    // If it looks like a size specification (contains numbers + units), keep it
    const parenContent = parenMatch[1]
    if (/^\d/.test(parenContent) && /\b(oz|ounce|lb|pound|g|gram|ml|liter)/i.test(parenContent)) {
      // Keep in name, it's a size spec like "(14 oz)"
    } else {
      // It's a preparation note
      preparation = parenContent.trim()
      cleanName = cleanName.replace(/\s*\([^)]+\)\s*/, ' ').trim()
    }
  }

  // Extract text after comma as preparation
  const commaIdx = cleanName.indexOf(',')
  if (commaIdx > 0) {
    const afterComma = cleanName.slice(commaIdx + 1).trim()
    if (afterComma) {
      preparation = preparation ? `${preparation}, ${afterComma}` : afterComma
    }
    cleanName = cleanName.slice(0, commaIdx).trim()
  }

  return { cleanName, preparation }
}

/**
 * Parse an ingredient string into structured components.
 *
 * Handles formats like:
 * - "2 cups all-purpose flour"
 * - "1/2 tsp salt"
 * - "3 large eggs"
 * - "1 (14 oz) can diced tomatoes"
 * - "pinch of cayenne"
 * - "salt and pepper to taste"
 * - "2-3 tablespoons olive oil"
 */
export function parseIngredientString(str: string): ParsedIngredient {
  let s = str.trim()
  if (!s) return { quantity: null, unit: null, name: '', preparation: null }

  // Handle "to taste" / "pinch of X" / "dash of X" special cases
  const toTasteMatch = s.match(/^(.+?)[\s,]+to taste$/i)
  if (toTasteMatch) {
    const { cleanName, preparation } = extractPreparation(toTasteMatch[1])
    return { quantity: null, unit: 'to taste', name: cleanName, preparation }
  }

  const pinchMatch = s.match(/^(a\s+)?(pinch|dash|splash|drizzle)\s+(?:of\s+)?(.+)$/i)
  if (pinchMatch) {
    const unitWord = pinchMatch[2].toLowerCase()
    const normalized = UNIT_MAP[unitWord] || unitWord
    const { cleanName, preparation } = extractPreparation(pinchMatch[3])
    return { quantity: 1, unit: normalized, name: cleanName, preparation }
  }

  // Main parsing: quantity + unit + name
  // Pattern: optional quantity, optional unit, then the rest is the name

  // Step 1: Extract quantity from the beginning
  // Matches: "2", "1/2", "1 1/2", "2.5", "2-3", unicode fractions, combinations
  const qtyPattern = /^([\d]+\s+\d+\/\d+|[\d]*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|[\d.\/]+(?:\s*[-–]\s*[\d.\/]+)?)\s*/
  const qtyMatch = s.match(qtyPattern)

  let quantity: number | null = null
  let rest = s

  if (qtyMatch) {
    quantity = parseQuantity(qtyMatch[1])
    rest = s.slice(qtyMatch[0].length)
  }

  // Step 2: Handle parenthetical size before the unit, like "(14 oz) can"
  const parenSizeMatch = rest.match(/^\(([^)]+)\)\s*/)
  let parenSize = ''
  if (parenSizeMatch) {
    parenSize = parenSizeMatch[1]
    rest = rest.slice(parenSizeMatch[0].length)
  }

  // Step 3: Try to extract a unit
  let unit: string | null = null

  // Try multi-word units first (e.g., "fluid ounce", "fl oz", "fl. oz.")
  const multiWordUnitMatch = rest.match(/^(fluid\s+ounces?|fl\.?\s*oz\.?)\s+/i)
  if (multiWordUnitMatch) {
    const rawUnit = multiWordUnitMatch[1].toLowerCase().replace(/\.\s*/g, ' ').trim()
    unit = UNIT_MAP[rawUnit] || rawUnit
    rest = rest.slice(multiWordUnitMatch[0].length)
  } else {
    // Try single-word unit
    const unitMatch = rest.match(/^([a-zA-Z]+\.?)\s+/)
    if (unitMatch) {
      const rawUnit = unitMatch[1].toLowerCase().replace(/\.$/, '')
      const normalized = UNIT_MAP[rawUnit]
      if (normalized) {
        // If it's a size descriptor (large, medium, small), include it in the name
        if (SIZE_DESCRIPTORS.has(rawUnit)) {
          // "3 large eggs" -> quantity=3, unit=null, name="large eggs"
          // Don't consume it as a unit
        } else {
          unit = normalized
          rest = rest.slice(unitMatch[0].length)
        }
      }
    }
  }

  // If we captured a parenthetical size but no unit, reconstruct
  if (parenSize && !unit) {
    rest = `(${parenSize}) ${rest}`
  }

  // Step 4: Extract preparation from the remaining name
  const { cleanName, preparation } = extractPreparation(rest)

  // Clean up the name
  let finalName = cleanName.replace(/\s+/g, ' ').trim()

  // Remove leading "of " (from "pinch of salt" patterns that weren't caught)
  finalName = finalName.replace(/^of\s+/i, '')

  return {
    quantity,
    unit,
    name: finalName,
    preparation,
  }
}
