// Deterministic classification of OSM data into ChefFlow directory categories.
// Formula > AI: OSM tags map directly to our business types and cuisines.
// No LLM needed for structured data.

// ─── OSM amenity/shop -> ChefFlow business_type ──────────────────────────────

const AMENITY_TO_TYPE = {
  restaurant: 'restaurant',
  cafe: 'restaurant',
  fast_food: 'restaurant',
  food_court: 'restaurant',
  ice_cream: 'bakery',
  bar: 'restaurant',
  pub: 'restaurant',
}

const SHOP_TO_TYPE = {
  bakery: 'bakery',
  pastry: 'bakery',
  confectionery: 'bakery',
  butcher: 'restaurant',
  deli: 'restaurant',
}

// ─── OSM cuisine tag -> ChefFlow cuisine_types ───────────────────────────────

const CUISINE_MAP = {
  // Direct matches
  american: 'american',
  burger: 'american',
  steak_house: 'american',
  diner: 'american',
  italian: 'italian',
  pizza: 'italian',
  pasta: 'italian',
  mexican: 'mexican',
  tex_mex: 'mexican',
  burrito: 'mexican',
  taco: 'mexican',
  japanese: 'japanese',
  sushi: 'japanese',
  ramen: 'japanese',
  chinese: 'chinese',
  dim_sum: 'chinese',
  noodles: 'chinese',
  thai: 'thai',
  indian: 'indian',
  curry: 'indian',
  french: 'french',
  mediterranean: 'mediterranean',
  greek: 'mediterranean',
  turkish: 'mediterranean',
  lebanese: 'middle_eastern',
  middle_eastern: 'middle_eastern',
  persian: 'middle_eastern',
  falafel: 'middle_eastern',
  korean: 'korean',
  vietnamese: 'vietnamese',
  pho: 'vietnamese',
  banh_mi: 'vietnamese',
  caribbean: 'caribbean',
  jamaican: 'caribbean',
  cuban: 'caribbean',
  southern: 'southern',
  soul_food: 'southern',
  cajun: 'southern',
  creole: 'southern',
  barbecue: 'bbq',
  bbq: 'bbq',
  seafood: 'seafood',
  fish: 'seafood',
  fish_and_chips: 'seafood',
  vegan: 'vegan',
  vegetarian: 'vegan',
  fusion: 'fusion',
  asian: 'fusion',
  bakery: 'desserts',
  cake: 'desserts',
  ice_cream: 'desserts',
  dessert: 'desserts',
  pastry: 'desserts',
  donut: 'desserts',
  farm_to_table: 'farm_to_table',
  organic: 'farm_to_table',
}

// ─── Classification functions ────────────────────────────────────────────────

export function classifyBusinessType(osmData) {
  if (osmData.amenity && AMENITY_TO_TYPE[osmData.amenity]) {
    return AMENITY_TO_TYPE[osmData.amenity]
  }
  if (osmData.shop && SHOP_TO_TYPE[osmData.shop]) {
    return SHOP_TO_TYPE[osmData.shop]
  }
  return 'restaurant' // Default
}

export function classifyCuisines(osmData) {
  if (!osmData.cuisine) return []

  // OSM cuisine tag can be semicolon-separated: "italian;pizza;pasta"
  const rawCuisines = osmData.cuisine
    .toLowerCase()
    .split(/[;,]/)
    .map((c) => c.trim().replace(/\s+/g, '_'))

  const mapped = new Set()
  for (const raw of rawCuisines) {
    if (CUISINE_MAP[raw]) {
      mapped.add(CUISINE_MAP[raw])
    }
  }

  // If nothing mapped but cuisine tag exists, use 'other'
  if (mapped.size === 0 && osmData.cuisine) {
    mapped.add('other')
  }

  return [...mapped]
}

// Build a full classified listing from raw OSM data + region info
export function classifyListing(osmData, region) {
  return {
    name: osmData.name,
    city: osmData.city || region.name.split(',')[0].trim(),
    state: osmData.state || region.state,
    businessType: classifyBusinessType(osmData),
    cuisineTypes: classifyCuisines(osmData),
    websiteUrl: osmData.website || null,
    sourceId: osmData.osmId,
    // Public facts only, no private data
    phone: null, // Don't store scraped phone numbers
    email: null, // Never store scraped emails
    address: null, // Don't store address without consent
  }
}
