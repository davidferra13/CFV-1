/**
 * Ingredient Name Normalizer
 * Pure function: no database, no auth, no side effects.
 * Used by Pi sync, recipe matching, and universal price lookup
 * to improve match rates across the entire resolution chain.
 */

// --- Synonym Map ---
// Canonical name -> all known aliases. Bidirectional lookup built at load time.
const SYNONYM_GROUPS: string[][] = [
  ['scallion', 'green onion', 'spring onion'],
  ['cilantro', 'coriander leaves', 'fresh coriander'],
  ['bell pepper', 'capsicum', 'sweet pepper'],
  ['eggplant', 'aubergine'],
  ['zucchini', 'courgette'],
  ['arugula', 'rocket', 'roquette'],
  ['chickpea', 'garbanzo', 'garbanzo bean', 'ceci'],
  ['shrimp', 'prawn'],
  ['heavy cream', 'heavy whipping cream', 'double cream'],
  ['confectioners sugar', 'powdered sugar', 'icing sugar'],
  ['all purpose flour', 'ap flour', 'plain flour'],
  ['baking soda', 'bicarbonate of soda', 'bicarb'],
  ['cornstarch', 'corn starch', 'corn flour'],
  ['extra virgin olive oil', 'evoo'],
  ['parmesan', 'parmigiano reggiano', 'parmigiano'],
  ['greek yogurt', 'greek style yogurt', 'strained yogurt'],
  ['half and half', 'half & half', 'half n half'],
  ['snow pea', 'mangetout'],
  ['bok choy', 'pak choi', 'pak choy'],
  ['serrano pepper', 'serrano chile', 'serrano chili'],
  ['jalapeno', 'jalapeño', 'jalapeno pepper'],
  ['habanero', 'habanero pepper', 'scotch bonnet'],
  ['poblano', 'poblano pepper', 'ancho chile'],
  ['chipotle', 'chipotle pepper'],
  ['cremini mushroom', 'cremini', 'baby bella', 'baby portobello'],
  ['portobello mushroom', 'portobello', 'portabella'],
  ['shiitake mushroom', 'shiitake'],
  ['sour cream', 'crème fraîche', 'creme fraiche'],
  ['ketchup', 'catsup'],
  ['molasses', 'treacle'],
  ['ground beef', 'minced beef', 'hamburger meat'],
  ['italian sausage', 'sweet italian sausage'],
  ['bacon', 'streaky bacon'],
  ['canadian bacon', 'back bacon', 'peameal bacon'],
  ['kosher salt', 'coarse salt', 'koshering salt'],
  ['sea salt', 'flaky salt', 'fleur de sel'],
  ['vegetable oil', 'canola oil', 'rapeseed oil'],
  ['granulated sugar', 'white sugar', 'table sugar', 'caster sugar'],
  ['brown sugar', 'light brown sugar'],
  ['dark brown sugar', 'muscovado'],
  ['chicken breast', 'chicken cutlet', 'chicken paillard', 'chicken tender', 'chicken tenderloin'],
  ['chicken thigh', 'chicken leg quarter', 'chicken leg'],
  ['pork chop', 'pork cutlet', 'pork loin chop'],
  ['pork belly', 'uncured bacon', 'fresh bacon'],
  ['filet mignon', 'beef tenderloin', 'tenderloin steak'],
  ['ribeye', 'rib eye', 'ribeye steak', 'delmonico steak'],
  ['new york strip', 'ny strip', 'strip steak', 'kansas city strip'],
  ['flank steak', 'london broil'],
  ['skirt steak', 'fajita meat'],
  ['short rib', 'short ribs', 'beef short rib'],
  ['lamb chop', 'lamb loin chop', 'lamb rib chop'],
  ['lamb shank', 'lamb shanks'],
  ['salmon fillet', 'salmon filet', 'atlantic salmon'],
  ['tuna steak', 'ahi tuna', 'yellowfin tuna'],
  ['cod fillet', 'cod filet', 'atlantic cod'],
  ['sea bass', 'branzino', 'european sea bass', 'loup de mer'],
  ['halibut', 'halibut fillet', 'halibut filet'],
  ['scallop', 'sea scallop', 'diver scallop', 'dry scallop'],
  ['lobster tail', 'lobster tails'],
  ['crab meat', 'crabmeat', 'lump crab', 'jumbo lump crab'],
  ['mascarpone', 'mascarpone cheese'],
  ['ricotta', 'ricotta cheese'],
  ['goat cheese', 'chevre', 'chèvre'],
  ['gruyere', 'gruyère', 'gruyere cheese'],
  ['brie', 'brie cheese'],
  ['mozzarella', 'fresh mozzarella', 'mozzarella cheese', 'burrata'],
  ['creme fraiche', 'crème fraîche'],
  ['dijon mustard', 'dijon'],
  ['balsamic vinegar', 'balsamic', 'aged balsamic'],
  ['rice vinegar', 'rice wine vinegar', 'seasoned rice vinegar'],
  ['soy sauce', 'shoyu', 'tamari'],
  ['fish sauce', 'nam pla', 'nuoc mam'],
  ['sesame oil', 'toasted sesame oil', 'dark sesame oil'],
  ['coconut milk', 'coconut cream'],
  ['panko', 'panko breadcrumbs', 'panko bread crumbs'],
  ['breadcrumbs', 'bread crumbs', 'dried breadcrumbs'],
  ['polenta', 'cornmeal', 'yellow cornmeal', 'grits'],
  ['arborio rice', 'risotto rice', 'carnaroli rice'],
  ['basmati rice', 'basmati'],
  ['jasmine rice', 'thai jasmine rice'],
  ['penne', 'penne pasta', 'penne rigate'],
  ['spaghetti', 'spaghetti pasta', 'thin spaghetti', 'spaghettini'],
  ['linguine', 'linguine pasta', 'linguini'],
  ['fettuccine', 'fettuccine pasta', 'fettucine', 'tagliatelle'],
  ['capers', 'caper berries', 'caperberries'],
  ['anchovy', 'anchovies', 'anchovy fillet', 'anchovy fillets'],
  ['sun dried tomato', 'sun-dried tomato', 'sundried tomato'],
  ['kalamata olive', 'kalamata olives', 'black olive', 'black olives'],
  ['pine nut', 'pine nuts', 'pignoli', 'pinoli'],
  ['walnut', 'walnuts', 'walnut halves'],
  ['almond', 'almonds', 'whole almonds', 'blanched almonds'],
  ['pistachio', 'pistachios', 'pistachio nut'],
  ['vanilla extract', 'pure vanilla extract', 'vanilla'],
  ['cocoa powder', 'unsweetened cocoa', 'dutch process cocoa'],
  ['chocolate chips', 'semi sweet chocolate chips', 'semisweet chocolate chips'],
  ['heavy cream', 'whipping cream', 'heavy whipping cream'],
  ['whole milk', 'vitamin d milk', 'full fat milk'],
  ['buttermilk', 'cultured buttermilk'],
  ['crème fraîche', 'sour cream', 'mexican crema'],
  ['microgreen', 'microgreens', 'micro greens'],
  ['edible flower', 'edible flowers'],
  ['truffle oil', 'black truffle oil', 'white truffle oil'],
  ['wagyu', 'wagyu beef', 'a5 wagyu', 'japanese wagyu'],
]

// Build reverse lookup: any alias -> canonical (first in group)
const SYNONYM_LOOKUP = new Map<string, string>()
for (const group of SYNONYM_GROUPS) {
  const canonical = group[0]
  for (const alias of group) {
    SYNONYM_LOOKUP.set(alias, canonical)
  }
}

// --- Abbreviation Dictionary ---
const ABBREVIATIONS: Record<string, string> = {
  evoo: 'extra virgin olive oil',
  'ap flour': 'all purpose flour',
  'e.v.o.o.': 'extra virgin olive oil',
  chx: 'chicken',
  'brn sugar': 'brown sugar',
  parm: 'parmesan',
  'parm reg': 'parmigiano reggiano',
  sq: 'squash',
  tom: 'tomato',
  toms: 'tomatoes',
  cuke: 'cucumber',
  cukes: 'cucumbers',
  zucc: 'zucchini',
  mush: 'mushroom',
  mushs: 'mushrooms',
  pep: 'pepper',
  peps: 'peppers',
  chick: 'chicken',
  bf: 'beef',
  pnb: 'peanut butter',
  pb: 'peanut butter',
  oj: 'orange juice',
  worcs: 'worcestershire sauce',
  worchestershire: 'worcestershire sauce',
  mayo: 'mayonnaise',
  lite: 'light',
  tbsp: 'tablespoon',
  tsp: 'teaspoon',
}

// --- Brand Patterns ---
// Common brand prefixes to strip (case-insensitive, applied after lowercase)
const BRAND_PATTERNS = [
  /^(kraft|heinz|dole|del monte|libby|campbells|progresso|hunts|barilla|de cecco)\s+/,
  /^(hellmanns|hellmann's|best foods|hidden valley|french's|franks|frank's)\s+/,
  /^(pillsbury|betty crocker|duncan hines|jiffy|bisquick)\s+/,
  /^(kikkoman|la choy|lee kum kee|sriracha|huy fong)\s+/,
  /^(land o lakes|land o'lakes|kerrygold|tillamook|cabot|organic valley)\s+/,
  /^(tyson|perdue|foster farms|butterball|jennie-o)\s+/,
  /^(ocean spray|tropicana|minute maid|simply|welchs|welch's)\s+/,
  /^(store brand|house brand|generic|private label|great value|kirkland|365)\s+/,
]

// --- Pluralization ---
const IRREGULAR_PLURALS: Record<string, string> = {
  tomatoes: 'tomato',
  potatoes: 'potato',
  mangoes: 'mango',
  avocados: 'avocado',
  leaves: 'leaf',
  loaves: 'loaf',
  halves: 'half',
  knives: 'knife',
  wolves: 'wolf',
  shelves: 'shelf',
  calves: 'calf',
  geese: 'goose',
  teeth: 'tooth',
  feet: 'foot',
  mice: 'mouse',
  dice: 'die',
  anchovies: 'anchovy',
  cherries: 'cherry',
  berries: 'berry',
  strawberries: 'strawberry',
  blueberries: 'blueberry',
  raspberries: 'raspberry',
  blackberries: 'blackberry',
  cranberries: 'cranberry',
}

function singularize(word: string): string {
  if (IRREGULAR_PLURALS[word]) return IRREGULAR_PLURALS[word]
  // -ies -> -y (but not if preceded by a vowel: "days" != "day" via this rule)
  if (word.endsWith('ies') && word.length > 4) {
    const stem = word.slice(0, -3)
    const lastChar = stem[stem.length - 1]
    if (!'aeiou'.includes(lastChar)) return stem + 'y'
  }
  // -es after s, x, z, ch, sh
  if (word.endsWith('es') && word.length > 3) {
    const stem = word.slice(0, -2)
    if (/[sxz]$/.test(stem) || /[cs]h$/.test(stem)) return stem
  }
  // Basic -s
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) {
    return word.slice(0, -1)
  }
  return word
}

/**
 * Normalize an ingredient name for matching purposes.
 * Strips brands, prefixes, quantities, parentheticals, and applies
 * synonym resolution + singularization for maximum match rates.
 *
 * Examples:
 *   "Fresh Organic Cilantro (chopped)" -> "cilantro"
 *   "Kraft Shredded Cheddar" -> "cheddar"
 *   "2 lbs chicken thighs" -> "chicken thigh"
 *   "evoo" -> "extra virgin olive oil"
 *   "Green Onions" -> "scallion"
 *   "3 large Yellow Onions, diced" -> "yellow onion"
 */
export function normalizeIngredientName(name: string): string {
  let n = name.toLowerCase().trim()

  // Strip leading quantities: "2 lbs", "1/2 cup", "3-4", "one", etc.
  // Note: single-letter units (g, l) require a following space/end to avoid eating words like "large"
  n = n.replace(
    /^[\d½¼¾⅓⅔⅛]+[\s\-\/]*[\d½¼¾⅓⅔⅛]*\s*(lbs?|oz|ounces?|cups?|tbsp|tsp|tablespoons?|teaspoons?|cloves?|heads?|bunche?s?|stalks?|pieces?|slices?|cans?|jars?|bottles?|packages?|bags?|pounds?|grams?|kg|ml|liters?|gallons?|quarts?|pints?|pinche?s?|dashe?s?|sprigs?|handfuls?|each|[gl](?=\s|$))?\s*/,
    ''
  )
  // Strip number words at start
  n = n.replace(/^(one|two|three|four|five|six|seven|eight|nine|ten|dozen|half|quarter)\s+/, '')

  // Strip brand names
  for (const pattern of BRAND_PATTERNS) {
    n = n.replace(pattern, '')
  }

  // Expand abbreviations (exact match on full string or first word)
  if (ABBREVIATIONS[n]) return ABBREVIATIONS[n]
  const firstWord = n.split(/\s+/)[0]
  if (ABBREVIATIONS[firstWord]) {
    n = n.replace(firstWord, ABBREVIATIONS[firstWord])
  }

  // Strip common preparation/state prefixes
  const prefixPattern =
    /^(fresh|organic|homemade|dried|frozen|canned|raw|cooked|roasted|grilled|steamed|boiled|fried|baked|smoked|pickled|marinated|minced|diced|chopped|sliced|shredded|grated|crushed|ground|whole|large|medium|small|extra|fine|coarse|thick|thin|boneless|skinless|trimmed|peeled|deveined|pitted|seeded|hulled|toasted|blanched|unsweetened|sweetened|salted|unsalted|low-fat|nonfat|fat-free|reduced-fat|lite|light)\s+/
  for (let i = 0; i < 5; i++) {
    const stripped = n.replace(prefixPattern, '')
    if (stripped === n) break
    n = stripped
  }

  // Strip parenthetical qualifiers: "cilantro (fresh)" -> "cilantro"
  n = n.replace(/\s*\([^)]*\)\s*/g, ' ')

  // Strip bracket recipe suffixes: "Lemons [Lemon Olive Oil Cake]" -> "lemons"
  n = n.replace(/\s*\[[^\]]*\]\s*/g, ' ')

  // Strip trailing preparation instructions after comma
  n = n.replace(
    /,\s*(diced|chopped|sliced|minced|crushed|grated|julienned|cubed|torn|halved|quartered|trimmed|peeled|seeded|deveined|pitted|melted|softened|room temp|at room temperature|to taste|divided|optional|plus more|for garnish|for serving|for frying|for drizzling|brand|store|generic|organic|local|imported|domestic).*$/i,
    ''
  )

  // Normalize whitespace
  n = n.replace(/\s+/g, ' ').trim()

  // Singularize each word for consistent matching
  n = n.split(' ').map(singularize).join(' ')

  // Synonym resolution (check full string first, then try without last word)
  if (SYNONYM_LOOKUP.has(n)) return SYNONYM_LOOKUP.get(n)!
  // Try with common suffixes removed for synonym matching
  for (const suffix of [' leaf', ' seed', ' powder', ' flake']) {
    const base = n.replace(new RegExp(suffix + '$'), '')
    if (base !== n && SYNONYM_LOOKUP.has(base)) {
      return SYNONYM_LOOKUP.get(base)! + suffix
    }
  }

  return n
}

/**
 * Check if two ingredient names refer to the same thing.
 * Normalizes both and compares, also checks synonym groups.
 */
export function ingredientNamesMatch(a: string, b: string): boolean {
  return normalizeIngredientName(a) === normalizeIngredientName(b)
}

/**
 * Get the canonical name for a synonym (or return normalized input).
 */
export function getCanonicalName(name: string): string {
  return normalizeIngredientName(name)
}
