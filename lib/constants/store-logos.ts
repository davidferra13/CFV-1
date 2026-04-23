// Store Logo Map
// Maps known store names (from OpenClaw price data) to static logo files in public/images/stores/.
// Logos should be small PNGs (~5KB, 32x32 or 64x64) placed in public/images/stores/.
// If a store is not in this map, the UI shows the store name as text only (no broken image).

export const STORE_LOGOS: Record<string, string> = {
  // National chains
  Walmart: '/images/stores/walmart.png',
  Kroger: '/images/stores/kroger.png',
  Costco: '/images/stores/costco.png',
  Target: '/images/stores/target.png',
  'Whole Foods': '/images/stores/whole-foods.png',
  'Whole Foods Market': '/images/stores/whole-foods.png',
  "Trader Joe's": '/images/stores/trader-joes.png',
  Aldi: '/images/stores/aldi.png',
  "Sam's Club": '/images/stores/sams-club.png',
  Publix: '/images/stores/publix.png',
  Safeway: '/images/stores/safeway.png',
  Albertsons: '/images/stores/albertsons.png',
  'H-E-B': '/images/stores/heb.png',
  Meijer: '/images/stores/meijer.png',
  Wegmans: '/images/stores/wegmans.png',
  'Food Lion': '/images/stores/food-lion.png',
  Giant: '/images/stores/giant.png',
  'Giant Eagle': '/images/stores/giant-eagle.png',
  Sprouts: '/images/stores/sprouts.png',
  'Sprouts Farmers Market': '/images/stores/sprouts.png',
  WinCo: '/images/stores/winco.png',

  // Regional chains that still appear in current store coverage
  'Stop & Shop': '/images/stores/stop-and-shop.png',
  'Stop and Shop': '/images/stores/stop-and-shop.png',
  'Market Basket': '/images/stores/market-basket.png',
  Hannaford: '/images/stores/hannaford.png',
  "Shaw's": '/images/stores/shaws.png',
  'Big Y': '/images/stores/big-y.png',
  'Price Chopper': '/images/stores/price-chopper.png',

  // Specialty / Natural
  'Fresh Market': '/images/stores/fresh-market.png',
  'The Fresh Market': '/images/stores/fresh-market.png',
  'Natural Grocers': '/images/stores/natural-grocers.png',
  'Fresh Thyme': '/images/stores/fresh-thyme.png',

  // Warehouse / Club
  "BJ's": '/images/stores/bjs.png',
  "BJ's Wholesale": '/images/stores/bjs.png',

  // Restaurant supply
  'Restaurant Depot': '/images/stores/restaurant-depot.png',
  'US Foods': '/images/stores/us-foods.png',
  Sysco: '/images/stores/sysco.png',

  // Online
  'Amazon Fresh': '/images/stores/amazon-fresh.png',
  Instacart: '/images/stores/instacart.png',
}

/**
 * Get the logo URL for a store name, or null if not found.
 * Case-insensitive lookup.
 */
export function getStoreLogo(storeName: string | null | undefined): string | null {
  if (!storeName) return null

  // Exact match first
  if (STORE_LOGOS[storeName]) return STORE_LOGOS[storeName]

  // Case-insensitive match
  const lower = storeName.toLowerCase()
  for (const [key, url] of Object.entries(STORE_LOGOS)) {
    if (key.toLowerCase() === lower) return url
  }

  return null
}
