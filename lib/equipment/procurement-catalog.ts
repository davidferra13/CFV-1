// Equipment Procurement Catalog - Static
// Maps canonical equipment names to tiered purchase options.
// Layer 1 resolution: instant, free, no API calls.

import type { ProcurementCatalogEntry } from './types'

export const PROCUREMENT_CATALOG: ProcurementCatalogEntry[] = [
  // ============================================
  // COOKWARE
  // ============================================
  {
    canonical_name: 'Half Sheet Tray',
    category_slug: 'sheet-trays',
    options: [
      {
        name: 'Half Sheet Tray',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [800, 1500],
        brand_hint: 'Nordic Ware',
        search_terms: ['half sheet pan', 'baking sheet 18x13'],
        restaurant_depot: true,
      },
      {
        name: 'Half Sheet Tray',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [1500, 3000],
        brand_hint: 'Vollrath',
        search_terms: ['vollrath half sheet pan', 'commercial half sheet'],
        restaurant_depot: true,
      },
      {
        name: 'Half Sheet Tray',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [3000, 6000],
        brand_hint: 'Matfer Bourgeat',
        search_terms: ['matfer sheet pan', 'french steel sheet pan'],
        restaurant_depot: false,
      },
    ],
  },
  {
    canonical_name: 'Cast Iron Skillet',
    category_slug: 'skillets',
    options: [
      {
        name: 'Cast Iron Skillet 10"',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [1500, 2500],
        brand_hint: 'Lodge',
        search_terms: ['lodge cast iron skillet 10'],
        restaurant_depot: true,
      },
      {
        name: 'Cast Iron Skillet 12"',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [2500, 5000],
        brand_hint: 'Lodge',
        search_terms: ['lodge cast iron skillet 12'],
        restaurant_depot: true,
      },
      {
        name: 'Cast Iron Skillet 12"',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [15000, 30000],
        brand_hint: 'Finex / Butter Pat',
        search_terms: ['finex cast iron', 'butter pat skillet'],
        restaurant_depot: false,
      },
    ],
  },
  {
    canonical_name: 'Saute Pan',
    category_slug: 'saute-pans',
    options: [
      {
        name: 'Saute Pan 10"',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [2500, 4000],
        brand_hint: 'Tramontina',
        search_terms: ['tramontina saute pan'],
        restaurant_depot: true,
      },
      {
        name: 'Saute Pan 12"',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [5000, 10000],
        brand_hint: 'All-Clad D3',
        search_terms: ['all-clad saute pan 12'],
        restaurant_depot: false,
      },
      {
        name: 'Saute Pan 12"',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [15000, 30000],
        brand_hint: 'Mauviel / de Buyer',
        search_terms: ['mauviel saute pan', 'de buyer saute pan'],
        restaurant_depot: false,
      },
    ],
  },
  {
    canonical_name: 'Dutch Oven',
    category_slug: 'dutch-ovens',
    options: [
      {
        name: 'Dutch Oven 6qt',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [4000, 6000],
        brand_hint: 'Lodge',
        search_terms: ['lodge enameled dutch oven'],
        restaurant_depot: true,
      },
      {
        name: 'Dutch Oven 7qt',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [8000, 15000],
        brand_hint: 'Cuisinart / Tramontina',
        search_terms: ['enameled dutch oven 7 qt'],
        restaurant_depot: false,
      },
      {
        name: 'Dutch Oven 7.25qt',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [30000, 40000],
        brand_hint: 'Le Creuset / Staub',
        search_terms: ['le creuset dutch oven', 'staub cocotte'],
        restaurant_depot: false,
      },
    ],
  },
  {
    canonical_name: 'Stockpot',
    category_slug: 'stockpots',
    options: [
      {
        name: 'Stockpot 12qt',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [3000, 5000],
        brand_hint: 'Winware',
        search_terms: ['commercial stockpot 12 qt'],
        restaurant_depot: true,
      },
      {
        name: 'Stockpot 12qt',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [8000, 15000],
        brand_hint: 'Vollrath / Carlisle',
        search_terms: ['vollrath stockpot', 'nsf stockpot'],
        restaurant_depot: true,
      },
      {
        name: 'Stockpot 12qt',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [20000, 35000],
        brand_hint: 'All-Clad',
        search_terms: ['all-clad stockpot'],
        restaurant_depot: false,
      },
    ],
  },

  // ============================================
  // KNIVES
  // ============================================
  {
    canonical_name: "Chef's Knife",
    category_slug: 'chefs-knives',
    options: [
      {
        name: 'Chef\'s Knife 8"',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [2000, 4000],
        brand_hint: 'Victorinox Fibrox',
        search_terms: ['victorinox fibrox chef knife 8'],
        restaurant_depot: true,
      },
      {
        name: 'Chef\'s Knife 8"',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [8000, 15000],
        brand_hint: 'Tojiro / MAC',
        search_terms: ['tojiro dp chef knife', 'mac chef knife'],
        restaurant_depot: false,
      },
      {
        name: 'Chef\'s Knife 10"',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [15000, 40000],
        brand_hint: 'Misono / Masamoto',
        search_terms: ['misono ux10', 'masamoto chef knife'],
        restaurant_depot: false,
      },
    ],
  },

  // ============================================
  // SMALL APPLIANCES
  // ============================================
  {
    canonical_name: 'Immersion Circulator',
    category_slug: 'immersion-circulators',
    options: [
      {
        name: 'Immersion Circulator',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [7000, 10000],
        brand_hint: 'Inkbird',
        search_terms: ['inkbird sous vide'],
        restaurant_depot: false,
      },
      {
        name: 'Immersion Circulator',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [10000, 20000],
        brand_hint: 'Anova Precision',
        search_terms: ['anova precision cooker'],
        restaurant_depot: false,
      },
      {
        name: 'Immersion Circulator',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [30000, 50000],
        brand_hint: 'PolyScience',
        search_terms: ['polyscience sous vide professional'],
        restaurant_depot: false,
      },
    ],
  },
  {
    canonical_name: 'Immersion Blender',
    category_slug: 'blenders',
    options: [
      {
        name: 'Immersion Blender',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [2500, 4000],
        brand_hint: 'Mueller',
        search_terms: ['immersion blender hand blender'],
        restaurant_depot: false,
      },
      {
        name: 'Immersion Blender',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [5000, 10000],
        brand_hint: 'Breville / KitchenAid',
        search_terms: ['breville immersion blender'],
        restaurant_depot: false,
      },
      {
        name: 'Immersion Blender',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [15000, 30000],
        brand_hint: 'Dynamic / Robot Coupe',
        search_terms: ['dynamic immersion blender commercial', 'robot coupe stick blender'],
        restaurant_depot: true,
      },
    ],
  },
  {
    canonical_name: 'Stand Mixer',
    category_slug: 'stand-mixers',
    options: [
      {
        name: 'Stand Mixer 5qt',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [20000, 30000],
        brand_hint: 'Hamilton Beach',
        search_terms: ['hamilton beach stand mixer'],
        restaurant_depot: false,
      },
      {
        name: 'Stand Mixer 5qt',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [30000, 45000],
        brand_hint: 'KitchenAid Artisan',
        search_terms: ['kitchenaid artisan stand mixer'],
        restaurant_depot: false,
      },
      {
        name: 'Stand Mixer 7qt',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [50000, 70000],
        brand_hint: 'KitchenAid Pro / Ankarsrum',
        search_terms: ['kitchenaid pro line mixer', 'ankarsrum mixer'],
        restaurant_depot: false,
      },
    ],
  },
  {
    canonical_name: 'Kitchen Torch',
    category_slug: 'torches',
    options: [
      {
        name: 'Kitchen Torch',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [1500, 2500],
        brand_hint: 'Generic butane',
        search_terms: ['culinary torch brulee'],
        restaurant_depot: false,
      },
      {
        name: 'Kitchen Torch',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [3000, 5000],
        brand_hint: 'Iwatani',
        search_terms: ['iwatani torch'],
        restaurant_depot: false,
      },
      {
        name: 'Kitchen Torch',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [5000, 8000],
        brand_hint: 'Bernzomatic TS8000',
        search_terms: ['bernzomatic ts8000 searzall'],
        restaurant_depot: false,
      },
    ],
  },
  {
    canonical_name: 'Vacuum Sealer',
    category_slug: 'vacuum-sealer-bags',
    options: [
      {
        name: 'Vacuum Sealer',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [3000, 5000],
        brand_hint: 'Nesco',
        search_terms: ['vacuum sealer machine'],
        restaurant_depot: false,
      },
      {
        name: 'Vacuum Sealer',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [8000, 15000],
        brand_hint: 'FoodSaver',
        search_terms: ['foodsaver vacuum sealer'],
        restaurant_depot: false,
      },
      {
        name: 'Vacuum Sealer',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [30000, 60000],
        brand_hint: 'VacMaster / Ary',
        search_terms: ['vacmaster chamber sealer', 'ary vacmaster'],
        restaurant_depot: true,
      },
    ],
  },

  // ============================================
  // PREP TOOLS
  // ============================================
  {
    canonical_name: 'Instant-Read Thermometer',
    category_slug: 'thermometers',
    options: [
      {
        name: 'Instant-Read Thermometer',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [1000, 2000],
        brand_hint: 'ThermoPro',
        search_terms: ['instant read thermometer kitchen'],
        restaurant_depot: true,
      },
      {
        name: 'Instant-Read Thermometer',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [5000, 8000],
        brand_hint: 'ThermoWorks Thermapen ONE',
        search_terms: ['thermapen one'],
        restaurant_depot: false,
      },
      {
        name: 'Instant-Read Thermometer',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [8000, 12000],
        brand_hint: 'ThermoWorks Thermapen Blue',
        search_terms: ['thermapen bluetooth'],
        restaurant_depot: false,
      },
    ],
  },
  {
    canonical_name: 'Digital Scale',
    category_slug: 'scales',
    options: [
      {
        name: 'Digital Scale',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [1000, 2000],
        brand_hint: 'Ozeri',
        search_terms: ['kitchen digital scale'],
        restaurant_depot: true,
      },
      {
        name: 'Digital Scale',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [2500, 5000],
        brand_hint: 'OXO Good Grips',
        search_terms: ['oxo kitchen scale'],
        restaurant_depot: false,
      },
      {
        name: 'Digital Scale',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [8000, 15000],
        brand_hint: 'Ohaus / MyWeigh',
        search_terms: ['ohaus kitchen scale', 'myweigh baker scale'],
        restaurant_depot: true,
      },
    ],
  },
  {
    canonical_name: 'Mandoline',
    category_slug: 'mandolines',
    options: [
      {
        name: 'Mandoline',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [2000, 3500],
        brand_hint: 'Benriner',
        search_terms: ['benriner mandoline'],
        restaurant_depot: false,
      },
      {
        name: 'Mandoline',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [4000, 8000],
        brand_hint: 'Swissmar Borner',
        search_terms: ['swissmar mandoline', 'borner v-slicer'],
        restaurant_depot: false,
      },
      {
        name: 'Mandoline',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [15000, 25000],
        brand_hint: 'de Buyer / Matfer',
        search_terms: ['de buyer mandoline', 'matfer mandoline'],
        restaurant_depot: false,
      },
    ],
  },

  // ============================================
  // SERVING
  // ============================================
  {
    canonical_name: 'Chafing Dish',
    category_slug: 'chafing-dishes',
    options: [
      {
        name: 'Chafing Dish Full Size',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [2500, 4000],
        brand_hint: 'TigerChef',
        search_terms: ['chafing dish full size economy'],
        restaurant_depot: true,
      },
      {
        name: 'Chafing Dish Full Size',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [5000, 10000],
        brand_hint: 'Winco',
        search_terms: ['winco chafing dish stainless'],
        restaurant_depot: true,
      },
      {
        name: 'Chafing Dish Full Size',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [15000, 30000],
        brand_hint: 'Vollrath Orion',
        search_terms: ['vollrath orion chafer', 'spring usa chafing dish'],
        restaurant_depot: false,
      },
    ],
  },

  // ============================================
  // STORAGE & TRANSPORT
  // ============================================
  {
    canonical_name: 'Insulated Carrier',
    category_slug: 'cambros',
    options: [
      {
        name: 'Insulated Carrier',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [3000, 6000],
        brand_hint: 'Choice',
        search_terms: ['insulated food carrier', 'hot food transport'],
        restaurant_depot: true,
      },
      {
        name: 'Insulated Carrier',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [10000, 20000],
        brand_hint: 'Cambro GoBox',
        search_terms: ['cambro gobox', 'cambro insulated carrier'],
        restaurant_depot: true,
      },
      {
        name: 'Insulated Carrier',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [25000, 50000],
        brand_hint: 'Cambro Ultra',
        search_terms: ['cambro ultra pan carrier', 'cambro upcs400'],
        restaurant_depot: true,
      },
    ],
  },
  {
    canonical_name: 'Hotel Pan',
    category_slug: 'hotel-pans',
    options: [
      {
        name: 'Hotel Pan Full Size 4"',
        tier: 'budget',
        label: 'Get It Done',
        price_range_cents: [500, 1000],
        brand_hint: 'Choice / Update',
        search_terms: ['hotel pan full size 4 deep'],
        restaurant_depot: true,
      },
      {
        name: 'Hotel Pan Full Size 4"',
        tier: 'mid',
        label: 'Workhorse',
        price_range_cents: [1200, 2500],
        brand_hint: 'Vollrath Super Pan',
        search_terms: ['vollrath super pan full size'],
        restaurant_depot: true,
      },
      {
        name: 'Hotel Pan Full Size 4"',
        tier: 'premium',
        label: 'Investment',
        price_range_cents: [3000, 6000],
        brand_hint: 'Vollrath Super Pan V',
        search_terms: ['vollrath super pan v 30042'],
        restaurant_depot: true,
      },
    ],
  },
]

/**
 * Find procurement options for an equipment name.
 * Token-based fuzzy matching against canonical names.
 */
export function findProcurementOptions(equipmentName: string): ProcurementCatalogEntry | null {
  const lower = equipmentName.toLowerCase()

  // Exact match first
  const exact = PROCUREMENT_CATALOG.find((e) => e.canonical_name.toLowerCase() === lower)
  if (exact) return exact

  // Token overlap match
  const tokens = lower.split(/[\s-]+/).filter((t) => t.length > 2)
  let bestMatch: ProcurementCatalogEntry | null = null
  let bestScore = 0

  for (const entry of PROCUREMENT_CATALOG) {
    const entryTokens = entry.canonical_name.toLowerCase().split(/[\s-]+/)
    const overlap = tokens.filter((t) =>
      entryTokens.some((et) => et.includes(t) || t.includes(et))
    ).length
    const score = overlap / Math.max(tokens.length, entryTokens.length)
    if (score > bestScore && score >= 0.5) {
      bestScore = score
      bestMatch = entry
    }
  }

  return bestMatch
}
