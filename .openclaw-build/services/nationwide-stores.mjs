/**
 * OpenClaw - Nationwide Store Registry
 *
 * EVERY major US grocery chain. EVERY US state covered.
 * Used by scraper-instacart-bulk.mjs and catalog orchestrator.
 *
 * Architecture: The Instacart scraper sets a zip code, then searches
 * a store slug. Instacart shows products available for delivery in
 * that area. One zip per metro is sufficient (Instacart serves the
 * same inventory in a ~15-mile zone).
 *
 * To get nationwide coverage we need:
 *   1. Every chain's Instacart slug
 *   2. At least one zip code per state where that chain operates
 *
 * RULE: If a chef in America shops there, it MUST be in this list.
 */

// ── ZIP CODE GRID ──
// At least one representative metro per US state.
// Multiple zips for large/diverse states.
const STATE_ZIPS = {
  // Northeast
  MA: [{ zip: '01835', label: 'Haverhill' }, { zip: '02101', label: 'Boston' }],
  CT: [{ zip: '06101', label: 'Hartford' }],
  RI: [{ zip: '02901', label: 'Providence' }],
  NH: [{ zip: '03101', label: 'Manchester' }],
  VT: [{ zip: '05401', label: 'Burlington' }],
  ME: [{ zip: '04101', label: 'Portland' }],
  NY: [{ zip: '10001', label: 'New York City' }, { zip: '14604', label: 'Rochester' }, { zip: '12203', label: 'Albany' }],
  NJ: [{ zip: '07102', label: 'Newark' }, { zip: '08901', label: 'New Brunswick' }],
  PA: [{ zip: '19101', label: 'Philadelphia' }, { zip: '15201', label: 'Pittsburgh' }, { zip: '17101', label: 'Harrisburg' }],
  DE: [{ zip: '19801', label: 'Wilmington' }],
  MD: [{ zip: '21201', label: 'Baltimore' }],
  DC: [{ zip: '20001', label: 'Washington' }],

  // Southeast
  VA: [{ zip: '23219', label: 'Richmond' }, { zip: '22901', label: 'Charlottesville' }, { zip: '23451', label: 'Virginia Beach' }],
  WV: [{ zip: '25301', label: 'Charleston' }],
  NC: [{ zip: '28202', label: 'Charlotte' }, { zip: '27601', label: 'Raleigh' }, { zip: '27101', label: 'Winston-Salem' }],
  SC: [{ zip: '29201', label: 'Columbia' }, { zip: '29401', label: 'Charleston' }, { zip: '29601', label: 'Greenville' }],
  GA: [{ zip: '30301', label: 'Atlanta' }, { zip: '31401', label: 'Savannah' }, { zip: '30901', label: 'Augusta' }],
  FL: [{ zip: '33101', label: 'Miami' }, { zip: '32801', label: 'Orlando' }, { zip: '33601', label: 'Tampa' }, { zip: '32201', label: 'Jacksonville' }],
  AL: [{ zip: '35201', label: 'Birmingham' }, { zip: '36101', label: 'Montgomery' }],
  MS: [{ zip: '39201', label: 'Jackson' }],
  TN: [{ zip: '37201', label: 'Nashville' }, { zip: '37901', label: 'Knoxville' }, { zip: '38101', label: 'Memphis' }],
  KY: [{ zip: '40201', label: 'Louisville' }, { zip: '40501', label: 'Lexington' }],
  LA: [{ zip: '70112', label: 'New Orleans' }, { zip: '70801', label: 'Baton Rouge' }],
  AR: [{ zip: '72201', label: 'Little Rock' }],

  // Midwest
  OH: [{ zip: '43201', label: 'Columbus' }, { zip: '44101', label: 'Cleveland' }, { zip: '45201', label: 'Cincinnati' }],
  MI: [{ zip: '48201', label: 'Detroit' }, { zip: '49501', label: 'Grand Rapids' }],
  IN: [{ zip: '46201', label: 'Indianapolis' }, { zip: '47901', label: 'Lafayette' }],
  IL: [{ zip: '60601', label: 'Chicago' }, { zip: '62701', label: 'Springfield' }],
  WI: [{ zip: '53201', label: 'Milwaukee' }, { zip: '53701', label: 'Madison' }],
  MN: [{ zip: '55401', label: 'Minneapolis' }],
  IA: [{ zip: '50309', label: 'Des Moines' }, { zip: '52401', label: 'Cedar Rapids' }],
  MO: [{ zip: '63101', label: 'St. Louis' }, { zip: '64101', label: 'Kansas City' }],
  KS: [{ zip: '67201', label: 'Wichita' }, { zip: '66101', label: 'Kansas City' }],
  NE: [{ zip: '68101', label: 'Omaha' }, { zip: '68501', label: 'Lincoln' }],
  SD: [{ zip: '57101', label: 'Sioux Falls' }],
  ND: [{ zip: '58102', label: 'Fargo' }],

  // South / Southwest
  TX: [{ zip: '75201', label: 'Dallas' }, { zip: '77001', label: 'Houston' }, { zip: '78201', label: 'San Antonio' }, { zip: '73301', label: 'Austin' }, { zip: '79901', label: 'El Paso' }],
  OK: [{ zip: '73101', label: 'Oklahoma City' }, { zip: '74101', label: 'Tulsa' }],
  NM: [{ zip: '87101', label: 'Albuquerque' }],

  // Mountain / West
  CO: [{ zip: '80201', label: 'Denver' }, { zip: '80901', label: 'Colorado Springs' }],
  UT: [{ zip: '84101', label: 'Salt Lake City' }],
  AZ: [{ zip: '85001', label: 'Phoenix' }, { zip: '85701', label: 'Tucson' }],
  NV: [{ zip: '89101', label: 'Las Vegas' }, { zip: '89501', label: 'Reno' }],
  ID: [{ zip: '83701', label: 'Boise' }],
  MT: [{ zip: '59601', label: 'Helena' }, { zip: '59101', label: 'Billings' }],
  WY: [{ zip: '82001', label: 'Cheyenne' }],

  // Pacific
  CA: [{ zip: '90001', label: 'Los Angeles' }, { zip: '94102', label: 'San Francisco' }, { zip: '92101', label: 'San Diego' }, { zip: '95814', label: 'Sacramento' }, { zip: '93301', label: 'Bakersfield' }],
  WA: [{ zip: '98101', label: 'Seattle' }, { zip: '99201', label: 'Spokane' }],
  OR: [{ zip: '97201', label: 'Portland' }, { zip: '97401', label: 'Eugene' }],
  AK: [{ zip: '99501', label: 'Anchorage' }],
  HI: [{ zip: '96813', label: 'Honolulu' }],
};

// ── CHAIN DEFINITIONS ──
// Each chain: slug (Instacart), chainSlug (our DB), name, markupPct, tier, states[]
// states[] = which states this chain operates in. We scrape one zip per state.

const CHAIN_DEFINITIONS = [

  // ════════════════════════════════════════════════
  // KROGER FAMILY
  // ════════════════════════════════════════════════
  { slug: 'kroger', chainSlug: 'kroger', name: 'Kroger', markupPct: 12, tier: 'retail',
    states: ['OH','MI','IN','IL','KY','TN','GA','AL','MS','SC','NC','VA','WV','TX','CO','AZ','NV','NM','OR','WA','CA','AR','LA','MO','KS'] },
  { slug: 'frys', chainSlug: 'frys_food', name: "Fry's Food", markupPct: 12, tier: 'retail',
    states: ['AZ'] },
  { slug: 'king-soopers', chainSlug: 'king_soopers', name: 'King Soopers', markupPct: 12, tier: 'retail',
    states: ['CO','WY'] },
  { slug: 'smiths', chainSlug: 'smiths', name: "Smith's", markupPct: 12, tier: 'retail',
    states: ['UT','NV','NM','MT','ID','WY'] },
  { slug: 'dillons', chainSlug: 'dillons', name: 'Dillons', markupPct: 12, tier: 'retail',
    states: ['KS'] },
  { slug: 'marianos', chainSlug: 'marianos', name: "Mariano's", markupPct: 12, tier: 'retail',
    states: ['IL'] },
  { slug: 'pick-n-save', chainSlug: 'pick_n_save', name: "Pick 'n Save", markupPct: 12, tier: 'retail',
    states: ['WI'] },
  { slug: 'food4less', chainSlug: 'food_4_less', name: 'Food 4 Less', markupPct: 15, tier: 'retail',
    states: ['CA','IL','IN','OH'] },
  { slug: 'fred-meyer', chainSlug: 'fred_meyer', name: 'Fred Meyer', markupPct: 12, tier: 'retail',
    states: ['OR','WA','ID','AK'] },
  { slug: 'qfc', chainSlug: 'qfc', name: 'QFC', markupPct: 12, tier: 'retail',
    states: ['WA','OR'] },
  { slug: 'harristeeter', chainSlug: 'harris_teeter', name: 'Harris Teeter', markupPct: 12, tier: 'retail',
    states: ['NC','SC','VA','DC','MD','DE','GA','FL'] },
  { slug: 'ralphs', chainSlug: 'ralphs', name: 'Ralphs', markupPct: 12, tier: 'retail',
    states: ['CA'] },
  { slug: 'city-market', chainSlug: 'city_market', name: 'City Market', markupPct: 12, tier: 'retail',
    states: ['CO'] },
  { slug: 'bakers', chainSlug: 'bakers', name: "Baker's", markupPct: 12, tier: 'retail',
    states: ['NE'] },
  { slug: 'ruler-foods', chainSlug: 'ruler_foods', name: 'Ruler Foods', markupPct: 15, tier: 'retail',
    states: ['IL','IN','KY','OH'] },
  { slug: 'gerbes', chainSlug: 'gerbes', name: 'Gerbes', markupPct: 12, tier: 'retail',
    states: ['MO'] },
  { slug: 'jay-c', chainSlug: 'jay_c', name: 'Jay C', markupPct: 12, tier: 'retail',
    states: ['IN'] },
  { slug: 'pay-less', chainSlug: 'pay_less', name: 'Pay Less', markupPct: 12, tier: 'retail',
    states: ['IN'] },

  // ════════════════════════════════════════════════
  // ALBERTSONS / SAFEWAY FAMILY
  // ════════════════════════════════════════════════
  { slug: 'albertsons', chainSlug: 'albertsons', name: 'Albertsons', markupPct: 12, tier: 'retail',
    states: ['CA','CO','TX','LA','AR','ID','MT','WY','NV','NM','OR','WA','UT','AZ'] },
  { slug: 'safeway', chainSlug: 'safeway', name: 'Safeway', markupPct: 12, tier: 'retail',
    states: ['CA','CO','OR','WA','AZ','DC','MD','VA','HI','AK'] },
  { slug: 'vons', chainSlug: 'vons', name: 'Vons', markupPct: 12, tier: 'retail',
    states: ['CA','NV'] },
  { slug: 'pavilions', chainSlug: 'pavilions', name: 'Pavilions', markupPct: 10, tier: 'retail',
    states: ['CA'] },
  { slug: 'jewel-osco', chainSlug: 'jewel_osco', name: 'Jewel-Osco', markupPct: 12, tier: 'retail',
    states: ['IL','IN','IA'] },
  { slug: 'shaws', chainSlug: 'shaws', name: "Shaw's", markupPct: 15, tier: 'retail',
    states: ['MA','ME','NH','VT','CT','RI'] },
  { slug: 'acme-markets', chainSlug: 'acme', name: 'ACME Markets', markupPct: 12, tier: 'retail',
    states: ['PA','NJ','DE','MD','CT'] },
  { slug: 'star-market', chainSlug: 'star_market', name: 'Star Market', markupPct: 12, tier: 'retail',
    states: ['MA'] },
  { slug: 'tom-thumb', chainSlug: 'tom_thumb', name: 'Tom Thumb', markupPct: 12, tier: 'retail',
    states: ['TX'] },
  { slug: 'randalls', chainSlug: 'randalls', name: 'Randalls', markupPct: 12, tier: 'retail',
    states: ['TX'] },
  { slug: 'carrs', chainSlug: 'carrs', name: 'Carrs', markupPct: 12, tier: 'retail',
    states: ['AK'] },
  { slug: 'haggen', chainSlug: 'haggen', name: 'Haggen', markupPct: 10, tier: 'retail',
    states: ['WA','OR'] },
  { slug: 'united-supermarkets', chainSlug: 'united_supermarkets', name: 'United Supermarkets', markupPct: 12, tier: 'retail',
    states: ['TX'] },

  // ════════════════════════════════════════════════
  // AHOLD DELHAIZE
  // ════════════════════════════════════════════════
  { slug: 'stop-shop', chainSlug: 'stop_and_shop', name: 'Stop & Shop', markupPct: 15, tier: 'retail',
    states: ['MA','CT','RI','NJ','NY'] },
  { slug: 'giant', chainSlug: 'giant_food', name: 'Giant Food', markupPct: 12, tier: 'retail',
    states: ['DC','MD','VA','DE','PA'] },
  { slug: 'giant-food-stores', chainSlug: 'giant_martins', name: 'Giant / Martin\'s', markupPct: 12, tier: 'retail',
    states: ['PA','VA','WV','MD'] },
  { slug: 'food-lion', chainSlug: 'food_lion', name: 'Food Lion', markupPct: 12, tier: 'retail',
    states: ['NC','SC','VA','GA','TN','KY','WV','MD','DE','PA'] },
  { slug: 'hannaford', chainSlug: 'hannaford', name: 'Hannaford', markupPct: 12, tier: 'retail',
    states: ['ME','NH','VT','MA','NY'] },

  // ════════════════════════════════════════════════
  // SOUTHEASTERN GROCERS
  // ════════════════════════════════════════════════
  { slug: 'winn-dixie', chainSlug: 'winn_dixie', name: 'Winn-Dixie', markupPct: 12, tier: 'retail',
    states: ['FL','AL','LA','GA','MS'] },
  { slug: 'harveys', chainSlug: 'harveys', name: 'Harvey\'s', markupPct: 12, tier: 'retail',
    states: ['GA','FL','SC'] },
  { slug: 'fresco-y-mas', chainSlug: 'fresco_y_mas', name: 'Fresco y Más', markupPct: 12, tier: 'retail',
    states: ['FL'] },

  // ════════════════════════════════════════════════
  // NATIONAL CHAINS
  // ════════════════════════════════════════════════
  { slug: 'aldi', chainSlug: 'aldi', name: 'Aldi', markupPct: 18, tier: 'retail',
    states: ['MA','CT','NY','NJ','PA','DE','MD','DC','VA','NC','SC','GA','FL','AL','TN','KY','OH','MI','IN','IL','WI','MN','IA','MO','KS','NE','TX','OK','CA'] },
  { slug: 'whole-foods', chainSlug: 'whole_foods', name: 'Whole Foods', markupPct: 10, tier: 'retail',
    states: ['MA','CT','RI','NY','NJ','PA','MD','DC','VA','NC','SC','GA','FL','TN','OH','MI','IL','MN','MO','TX','CO','AZ','NV','CA','OR','WA','HI'] },
  { slug: 'walmart', chainSlug: 'walmart', name: 'Walmart', markupPct: 15, tier: 'retail',
    states: Object.keys(STATE_ZIPS) }, // every state
  { slug: 'target', chainSlug: 'target', name: 'Target', markupPct: 15, tier: 'retail',
    states: Object.keys(STATE_ZIPS) }, // every state
  { slug: 'lidl', chainSlug: 'lidl', name: 'Lidl', markupPct: 18, tier: 'retail',
    states: ['NJ','NY','PA','DE','MD','DC','VA','NC','SC','GA'] },
  { slug: 'sprouts', chainSlug: 'sprouts', name: 'Sprouts Farmers Market', markupPct: 10, tier: 'retail',
    states: ['CA','AZ','NV','CO','TX','OK','GA','FL','AL','TN','NC','SC','VA','MD','PA','NJ'] },
  { slug: 'natural-grocers', chainSlug: 'natural_grocers', name: 'Natural Grocers', markupPct: 10, tier: 'retail',
    states: ['CO','TX','OK','KS','NE','MO','IA','MN','WI','MT','WY','ID','UT','NM','AZ','NV','OR','WA'] },
  { slug: 'the-fresh-market', chainSlug: 'the_fresh_market', name: 'The Fresh Market', markupPct: 10, tier: 'retail', // verified on Instacart
    states: ['NC','SC','GA','FL','AL','TN','VA','OH','IN','IL','CT','PA','MD'] },
  { slug: 'earth-fare-market', chainSlug: 'earth_fare', name: 'Earth Fare', markupPct: 10, tier: 'retail',
    states: ['NC','SC','GA','TN','FL','OH','IN'] },

  // ════════════════════════════════════════════════
  // NORTHEAST REGIONALS
  // ════════════════════════════════════════════════
  { slug: 'market-basket', chainSlug: 'market_basket', name: 'Market Basket', markupPct: 15, tier: 'retail',
    states: ['MA','NH','ME'] },
  { slug: 'price-chopper', chainSlug: 'price_chopper', name: 'Price Chopper', markupPct: 12, tier: 'retail',
    states: ['NY','VT','CT','MA','NH','PA'] },
  { slug: 'tops-markets', chainSlug: 'tops_markets', name: 'Tops Markets', markupPct: 12, tier: 'retail',
    states: ['NY','PA','VT'] },
  { slug: 'wegmans', chainSlug: 'wegmans', name: 'Wegmans', markupPct: 10, tier: 'retail',
    states: ['NY','PA','NJ','VA','NC','MD','MA','DC'] },
  { slug: 'shoprite', chainSlug: 'shoprite', name: 'ShopRite', markupPct: 12, tier: 'retail',
    states: ['NJ','NY','CT','PA','MD','DE'] },
  { slug: 'price-rite', chainSlug: 'price_rite', name: 'Price Rite', markupPct: 15, tier: 'retail',
    states: ['CT','MA','NY','NJ','PA','MD','RI'] },
  { slug: 'weis-markets', chainSlug: 'weis_markets', name: 'Weis Markets', markupPct: 12, tier: 'retail', // verified on Instacart
    states: ['PA','MD','NY','NJ','WV','VA','DE'] },
  { slug: 'key-food', chainSlug: 'key_food', name: 'Key Food', markupPct: 15, tier: 'retail',
    states: ['NY','NJ'] },
  { slug: 'foodtown', chainSlug: 'foodtown', name: 'Foodtown', markupPct: 15, tier: 'retail',
    states: ['NY','NJ','CT','PA'] },
  { slug: 'stew-leonards', chainSlug: 'stew_leonards', name: 'Stew Leonard\'s', markupPct: 10, tier: 'retail',
    states: ['CT','NY','NJ'] },
  { slug: 'big-y', chainSlug: 'big_y', name: 'Big Y', markupPct: 12, tier: 'retail',
    states: ['MA','CT'] },

  // ════════════════════════════════════════════════
  // MID-ATLANTIC REGIONALS
  // ════════════════════════════════════════════════
  { slug: 'giant-eagle', chainSlug: 'giant_eagle', name: 'Giant Eagle', markupPct: 12, tier: 'retail',
    states: ['PA','OH','WV','IN','MD'] },

  // ════════════════════════════════════════════════
  // SOUTHEAST REGIONALS
  // ════════════════════════════════════════════════
  { slug: 'publix', chainSlug: 'publix', name: 'Publix', markupPct: 10, tier: 'retail',
    states: ['FL','GA','AL','TN','SC','NC','VA'] },
  { slug: 'ingles', chainSlug: 'ingles', name: 'Ingles Markets', markupPct: 12, tier: 'retail',
    states: ['NC','SC','GA','TN','VA','AL'] },
  { slug: 'lowes-foods', chainSlug: 'lowes_foods', name: "Lowe's Foods", markupPct: 12, tier: 'retail',
    states: ['NC','SC','VA'] },
  { slug: 'piggly-wiggly', chainSlug: 'piggly_wiggly', name: 'Piggly Wiggly', markupPct: 15, tier: 'retail',
    states: ['SC','GA','AL','MS','LA','WI'] },
  { slug: 'food-city', chainSlug: 'food_city', name: 'Food City', markupPct: 12, tier: 'retail',
    states: ['TN','VA','KY','GA'] },

  // ════════════════════════════════════════════════
  // MIDWEST REGIONALS
  // ════════════════════════════════════════════════
  { slug: 'meijer', chainSlug: 'meijer', name: 'Meijer', markupPct: 12, tier: 'retail',
    states: ['MI','OH','IN','IL','WI','KY'] },
  { slug: 'hy-vee', chainSlug: 'hy_vee', name: 'Hy-Vee', markupPct: 12, tier: 'retail',
    states: ['IA','MN','NE','SD','KS','MO','WI','IL'] },
  { slug: 'schnucks', chainSlug: 'schnucks', name: 'Schnucks', markupPct: 12, tier: 'retail',
    states: ['MO','IL','IN','WI'] },
  { slug: 'woodmans', chainSlug: 'woodmans', name: "Woodman's", markupPct: 12, tier: 'retail',
    states: ['WI','IL'] },
  { slug: 'festival-foods', chainSlug: 'festival_foods', name: 'Festival Foods', markupPct: 12, tier: 'retail',
    states: ['WI'] },
  { slug: 'cub', chainSlug: 'cub_foods', name: 'Cub Foods', markupPct: 12, tier: 'retail',
    states: ['MN'] },
  { slug: 'fresh-thyme-farmers-market', chainSlug: 'fresh_thyme', name: 'Fresh Thyme', markupPct: 10, tier: 'retail',
    states: ['IN','IL','OH','MI','MN','WI','IA','MO','KY','NE','PA'] },
  { slug: 'fareway', chainSlug: 'fareway', name: 'Fareway', markupPct: 12, tier: 'retail',
    states: ['IA','NE','MN','SD','IL','MO','KS'] },
  { slug: 'coborns', chainSlug: 'coborns', name: "Coborn's", markupPct: 12, tier: 'retail',
    states: ['MN','SD','ND','WI'] },
  { slug: 'dierbergs-markets', chainSlug: 'dierbergs', name: 'Dierbergs', markupPct: 12, tier: 'retail',
    states: ['MO','IL'] },

  // ════════════════════════════════════════════════
  // SOUTH / SOUTHWEST REGIONALS
  // ════════════════════════════════════════════════
  { slug: 'h-e-b', chainSlug: 'heb', name: 'H-E-B', markupPct: 10, tier: 'retail',
    states: ['TX'] },
  { slug: 'central-market', chainSlug: 'central_market', name: 'Central Market', markupPct: 8, tier: 'retail',
    states: ['TX'] },
  { slug: 'brookshires', chainSlug: 'brookshires', name: "Brookshire's", markupPct: 12, tier: 'retail',
    states: ['TX','LA','AR'] },
  { slug: 'fiesta-mart', chainSlug: 'fiesta_mart', name: 'Fiesta Mart', markupPct: 12, tier: 'retail',
    states: ['TX'] },

  // ════════════════════════════════════════════════
  // MOUNTAIN / PLAINS
  // ════════════════════════════════════════════════
  { slug: 'bashas', chainSlug: 'bashas', name: "Bashas'", markupPct: 12, tier: 'retail',
    states: ['AZ'] },

  // ════════════════════════════════════════════════
  // WEST COAST REGIONALS
  // ════════════════════════════════════════════════
  { slug: 'winco-foods', chainSlug: 'winco', name: 'WinCo Foods', markupPct: 15, tier: 'retail',
    states: ['ID','WA','OR','CA','NV','AZ','TX','UT','OK','MT'] },
  { slug: 'stater-bros', chainSlug: 'stater_bros', name: 'Stater Bros', markupPct: 12, tier: 'retail',
    states: ['CA'] },
  { slug: 'smart-final', chainSlug: 'smart_and_final', name: 'Smart & Final', markupPct: 12, tier: 'retail',
    states: ['CA','AZ','NV'] },
  { slug: 'grocery-outlet', chainSlug: 'grocery_outlet', name: 'Grocery Outlet', markupPct: 15, tier: 'retail',
    states: ['CA','OR','WA','ID','NV','PA','NJ','MD'] },
  { slug: 'raleys', chainSlug: 'raley', name: "Raley's", markupPct: 12, tier: 'retail',
    states: ['CA','NV'] },
  { slug: 'save-mart', chainSlug: 'save_mart', name: 'Save Mart', markupPct: 12, tier: 'retail',
    states: ['CA','NV'] },
  { slug: 'lucky', chainSlug: 'lucky', name: 'Lucky Supermarkets', markupPct: 12, tier: 'retail',
    states: ['CA'] },
  { slug: 'gelsons', chainSlug: 'gelsons', name: "Gelson's", markupPct: 8, tier: 'retail',
    states: ['CA'] },
  { slug: 'bristol-farms', chainSlug: 'bristol_farms', name: 'Bristol Farms', markupPct: 8, tier: 'retail',
    states: ['CA'] },
  { slug: 'new-seasons-market', chainSlug: 'new_seasons', name: 'New Seasons Market', markupPct: 10, tier: 'retail',
    states: ['OR','WA'] },
  { slug: 'pcc-community-markets', chainSlug: 'pcc', name: 'PCC Community Markets', markupPct: 10, tier: 'retail',
    states: ['WA'] },

  // ════════════════════════════════════════════════
  // HAWAII / ALASKA
  // ════════════════════════════════════════════════
  { slug: 'foodland', chainSlug: 'foodland_hawaii', name: 'Foodland', markupPct: 12, tier: 'retail',
    states: ['HI'] },
  { slug: 'times-supermarket', chainSlug: 'times_supermarket', name: 'Times Supermarket', markupPct: 12, tier: 'retail',
    states: ['HI'] },

  // ════════════════════════════════════════════════
  // CLUB / WHOLESALE
  // ════════════════════════════════════════════════
  { slug: 'costco', chainSlug: 'costco', name: 'Costco', markupPct: 20, tier: 'wholesale',
    states: Object.keys(STATE_ZIPS) },
  { slug: 'bjs', chainSlug: 'bjs', name: "BJ's Wholesale", markupPct: 18, tier: 'wholesale',
    states: ['MA','CT','RI','NY','NJ','PA','DE','MD','DC','VA','NC','SC','GA','FL','OH','MI','IN','ME','NH'] },
  { slug: 'sams-club', chainSlug: 'sams_club', name: "Sam's Club", markupPct: 18, tier: 'wholesale',
    states: Object.keys(STATE_ZIPS) },
  { slug: 'restaurant-depot', chainSlug: 'restaurant_depot', name: 'Restaurant Depot', markupPct: 5, tier: 'wholesale',
    states: ['MA','CT','NY','NJ','PA','MD','DC','VA','NC','GA','FL','OH','IL','TX','CA','CO','AZ','NV','WA','MN','MO'] },

  // ════════════════════════════════════════════════
  // ETHNIC / INTERNATIONAL
  // ════════════════════════════════════════════════
  { slug: 'hmart', chainSlug: 'hmart', name: 'H Mart', markupPct: 12, tier: 'retail',
    states: ['NY','NJ','PA','VA','MD','GA','TX','CA','IL','CO','WA','MI','OH'] },
  { slug: '99-ranch-market', chainSlug: '99_ranch', name: '99 Ranch Market', markupPct: 12, tier: 'retail',
    states: ['CA','TX','NV','WA','OR','NJ','MD','VA'] },
  { slug: 'mitsuwa', chainSlug: 'mitsuwa', name: 'Mitsuwa Marketplace', markupPct: 12, tier: 'retail',
    states: ['CA','NJ','IL','TX','HI'] },
  { slug: 'uwajimaya', chainSlug: 'uwajimaya', name: 'Uwajimaya', markupPct: 12, tier: 'retail',
    states: ['WA','OR'] },
  { slug: 'lotte-plaza', chainSlug: 'lotte_plaza', name: 'Lotte Plaza', markupPct: 12, tier: 'retail',
    states: ['MD','VA'] },
  { slug: 'patel-brothers', chainSlug: 'patel_brothers', name: 'Patel Brothers', markupPct: 12, tier: 'retail',
    states: ['NJ','NY','IL','TX','GA','PA','VA','MD','NC','FL','MI','OH','CA'] },
  { slug: 'el-super', chainSlug: 'el_super', name: 'El Super', markupPct: 12, tier: 'retail',
    states: ['CA','AZ','NV','NM','TX'] },
  { slug: 'cardenas', chainSlug: 'cardenas', name: 'Cardenas Markets', markupPct: 12, tier: 'retail',
    states: ['CA','NV','AZ'] },
  { slug: 'vallarta-supermarkets', chainSlug: 'vallarta', name: 'Vallarta Supermarkets', markupPct: 12, tier: 'retail',
    states: ['CA'] },
  { slug: 'northgate', chainSlug: 'northgate', name: 'Northgate Market', markupPct: 12, tier: 'retail',
    states: ['CA'] },
  { slug: 'sedanos', chainSlug: 'sedanos', name: "Sedano's", markupPct: 12, tier: 'retail',
    states: ['FL'] },

  // ════════════════════════════════════════════════
  // ADDITIONAL KROGER BANNERS
  // ════════════════════════════════════════════════
  { slug: 'foods-co', chainSlug: 'foods_co', name: 'Foods Co', markupPct: 15, tier: 'retail',
    states: ['CA'] },
  { slug: 'metro-market', chainSlug: 'metro_market', name: 'Metro Market', markupPct: 12, tier: 'retail',
    states: ['WI'] },
  { slug: 'owens', chainSlug: 'owens', name: "Owen's", markupPct: 12, tier: 'retail',
    states: ['IN'] },

  // ════════════════════════════════════════════════
  // ADDITIONAL SOUTHEAST / SOUTH
  // ════════════════════════════════════════════════
  { slug: 'bi-lo', chainSlug: 'bi_lo', name: 'BI-LO', markupPct: 12, tier: 'retail',
    states: ['SC','GA','NC','TN'] },
  { slug: 'compare-foods', chainSlug: 'compare_foods', name: 'Compare Foods', markupPct: 12, tier: 'retail',
    states: ['NC','SC','VA','MD'] },
  { slug: 'save-a-lot', chainSlug: 'save_a_lot', name: 'Save-A-Lot', markupPct: 15, tier: 'retail',
    states: ['OH','IL','MO','KY','TN','GA','FL','NC','SC','VA','PA','NY','IN','WI','AL','MS','LA','AR','TX','MD'] },
  { slug: 'food-depot', chainSlug: 'food_depot', name: 'Food Depot', markupPct: 15, tier: 'retail',
    states: ['GA','AL'] },
  { slug: 'grocery-depot', chainSlug: 'grocery_depot', name: 'Grocery Depot', markupPct: 15, tier: 'retail',
    states: ['LA','MS'] },
  { slug: 'bravo-supermarkets', chainSlug: 'bravo', name: 'Bravo Supermarkets', markupPct: 12, tier: 'retail',
    states: ['FL','NY','NJ'] },
  { slug: 'presidente', chainSlug: 'presidente', name: 'Presidente Supermarkets', markupPct: 12, tier: 'retail',
    states: ['FL'] },
  { slug: 'winn-dixie', chainSlug: 'winn_dixie', name: 'Winn-Dixie', markupPct: 12, tier: 'retail',
    states: ['FL','AL','LA','GA','MS'] },
  { slug: 'lucky-supermarkets', chainSlug: 'lucky_ca', name: 'Lucky California', markupPct: 12, tier: 'retail',
    states: ['CA'] },

  // ════════════════════════════════════════════════
  // ADDITIONAL NORTHEAST / MID-ATLANTIC
  // ════════════════════════════════════════════════
  { slug: 'market-32', chainSlug: 'market_32', name: 'Market 32', markupPct: 12, tier: 'retail',
    states: ['NY','VT','CT','MA','NH','PA'] },
  { slug: 'aldi-nord', chainSlug: 'trader_joes', name: "Trader Joe's", markupPct: 10, tier: 'retail',
    states: ['CA','NY','NJ','MA','CT','PA','VA','MD','DC','IL','TX','GA','FL','NC','OH','CO','WA','OR','MN','AZ'] },
  { slug: 'lidl', chainSlug: 'lidl', name: 'Lidl', markupPct: 18, tier: 'retail',
    states: ['NJ','NY','PA','DE','MD','DC','VA','NC','SC','GA'] },
  { slug: 'uncle-giuseppes', chainSlug: 'uncle_giuseppes', name: "Uncle Giuseppe's", markupPct: 10, tier: 'retail',
    states: ['NY','NJ'] },
  { slug: 'fairway', chainSlug: 'fairway', name: 'Fairway Market', markupPct: 10, tier: 'retail',
    states: ['NY','NJ'] },
  { slug: 'morton-williams-supermarket', chainSlug: 'morton_williams', name: 'Morton Williams', markupPct: 10, tier: 'retail',
    states: ['NY'] },
  { slug: 'westside-market', chainSlug: 'westside_market', name: 'Westside Market', markupPct: 10, tier: 'retail',
    states: ['NY'] },
  { slug: 'deciccos', chainSlug: 'deciccos', name: "DeCicco's", markupPct: 10, tier: 'retail',
    states: ['NY'] },
  { slug: 'balducci', chainSlug: 'balducci', name: "Balducci's", markupPct: 8, tier: 'retail',
    states: ['NY','CT','VA','MD'] },
  { slug: 'kings-food-markets', chainSlug: 'kings_food', name: 'Kings Food Markets', markupPct: 10, tier: 'retail',
    states: ['NJ','CT','NY'] },
  { slug: 'food-emporium', chainSlug: 'food_emporium', name: 'Food Emporium', markupPct: 12, tier: 'retail',
    states: ['NY','NJ','CT'] },
  { slug: 'c-town', chainSlug: 'ctown', name: 'C-Town', markupPct: 15, tier: 'retail',
    states: ['NY','NJ','CT','PA'] },
  { slug: 'western-beef', chainSlug: 'western_beef', name: 'Western Beef', markupPct: 12, tier: 'retail',
    states: ['NY','NJ','FL'] },
  { slug: 'associated', chainSlug: 'associated', name: 'Associated Supermarkets', markupPct: 12, tier: 'retail',
    states: ['NY','NJ','CT'] },
  { slug: 'pathmark', chainSlug: 'pathmark', name: 'Pathmark', markupPct: 12, tier: 'retail',
    states: ['NJ','NY','PA','DE'] },
  { slug: 'redner', chainSlug: 'redner', name: "Redner's Markets", markupPct: 12, tier: 'retail',
    states: ['PA','MD','DE'] },
  { slug: 'karns', chainSlug: 'karns', name: "Karns Foods", markupPct: 12, tier: 'retail',
    states: ['PA'] },

  // ════════════════════════════════════════════════
  // ADDITIONAL MIDWEST
  // ════════════════════════════════════════════════
  { slug: 'county-market', chainSlug: 'county_market', name: 'County Market', markupPct: 12, tier: 'retail',
    states: ['IL','MO','IN'] },
  { slug: 'martins-super', chainSlug: 'martins_super', name: "Martin's Super Markets", markupPct: 12, tier: 'retail',
    states: ['IN','MI'] },
  { slug: 'spartan-nash', chainSlug: 'spartan_nash', name: 'SpartanNash', markupPct: 12, tier: 'retail',
    states: ['MI','IN','OH','WI','MN','ND','SD','NE','IA'] },
  { slug: 'piggly-wiggly-midwest', chainSlug: 'piggly_wiggly_mw', name: 'Piggly Wiggly (Midwest)', markupPct: 15, tier: 'retail',
    states: ['WI','MN'] },
  { slug: 'sentry', chainSlug: 'sentry', name: 'Sentry Foods', markupPct: 12, tier: 'retail',
    states: ['WI'] },
  { slug: 'roundys', chainSlug: 'roundys', name: "Roundy's", markupPct: 12, tier: 'retail',
    states: ['WI','IL','MN'] },
  { slug: 'ruler', chainSlug: 'ruler_foods', name: 'Ruler Foods', markupPct: 15, tier: 'retail',
    states: ['IL','IN','KY','OH'] },
  { slug: 'buehlers', chainSlug: 'buehlers', name: "Buehler's", markupPct: 12, tier: 'retail',
    states: ['OH'] },
  { slug: 'marc', chainSlug: 'marcs', name: "Marc's", markupPct: 15, tier: 'retail',
    states: ['OH'] },
  { slug: 'jungle-jims', chainSlug: 'jungle_jims', name: "Jungle Jim's", markupPct: 10, tier: 'retail',
    states: ['OH'] },
  { slug: 'dorothy-lane-market', chainSlug: 'dorothy_lane', name: 'Dorothy Lane Market', markupPct: 8, tier: 'retail',
    states: ['OH'] },
  { slug: 'hyvee', chainSlug: 'hy_vee', name: 'Hy-Vee', markupPct: 12, tier: 'retail',
    states: ['IA','MN','NE','SD','KS','MO','WI','IL'] },
  { slug: 'lunds-and-byerlys', chainSlug: 'lunds_byerlys', name: 'Lunds & Byerlys', markupPct: 10, tier: 'retail',
    states: ['MN'] },
  { slug: 'kowalskis', chainSlug: 'kowalskis', name: "Kowalski's", markupPct: 10, tier: 'retail',
    states: ['MN'] },

  // ════════════════════════════════════════════════
  // ADDITIONAL SOUTH / TEXAS
  // ════════════════════════════════════════════════
  { slug: 'food-town', chainSlug: 'food_town_tx', name: 'Food Town (TX)', markupPct: 12, tier: 'retail',
    states: ['TX'] },
  { slug: 'la-michoacana', chainSlug: 'la_michoacana', name: 'La Michoacana', markupPct: 12, tier: 'retail',
    states: ['TX'] },
  { slug: 'ranch-market', chainSlug: 'ranch_market', name: 'Ranch Market', markupPct: 12, tier: 'retail',
    states: ['AZ','TX'] },
  { slug: 'el-rancho-supermercado', chainSlug: 'el_rancho', name: 'El Rancho Supermercado', markupPct: 12, tier: 'retail',
    states: ['TX'] },
  { slug: 'market-street', chainSlug: 'market_street', name: 'Market Street', markupPct: 12, tier: 'retail',
    states: ['TX','NM'] },
  { slug: 'amigos', chainSlug: 'amigos', name: 'Amigos', markupPct: 12, tier: 'retail',
    states: ['TX'] },
  { slug: 'natural-grocers', chainSlug: 'natural_grocers', name: 'Natural Grocers', markupPct: 10, tier: 'retail',
    states: ['CO','TX','OK','KS','NE','MO','IA','MN','WI','MT','WY','ID','UT','NM','AZ','NV','OR','WA'] },
  { slug: 'spec', chainSlug: 'specs', name: "Spec's", markupPct: 12, tier: 'retail',
    states: ['TX'] },

  // ════════════════════════════════════════════════
  // ADDITIONAL WEST COAST
  // ════════════════════════════════════════════════
  { slug: 'lazy-acres', chainSlug: 'lazy_acres', name: 'Lazy Acres', markupPct: 8, tier: 'retail',
    states: ['CA'] },
  { slug: 'erewhon', chainSlug: 'erewhon', name: 'Erewhon', markupPct: 5, tier: 'retail',
    states: ['CA'] },
  { slug: 'nugget-markets', chainSlug: 'nugget_markets', name: 'Nugget Markets', markupPct: 10, tier: 'retail',
    states: ['CA'] },
  { slug: 'ranch-99', chainSlug: '99_ranch', name: '99 Ranch Market', markupPct: 12, tier: 'retail',
    states: ['CA','TX','NV','WA','OR','NJ','MD','VA'] },
  { slug: 'madre-tierra', chainSlug: 'madre_tierra', name: 'Madre Tierra', markupPct: 12, tier: 'retail',
    states: ['CA'] },
  { slug: 'super-king', chainSlug: 'super_king', name: 'Super King Markets', markupPct: 12, tier: 'retail',
    states: ['CA'] },
  { slug: 'jons', chainSlug: 'jons', name: "Jon's Fresh Marketplace", markupPct: 12, tier: 'retail',
    states: ['CA'] },
  { slug: 'super-a-foods', chainSlug: 'super_a_foods', name: 'Super A Foods', markupPct: 12, tier: 'retail',
    states: ['CA'] },
  { slug: 'grocery-outlet', chainSlug: 'grocery_outlet', name: 'Grocery Outlet', markupPct: 15, tier: 'retail',
    states: ['CA','OR','WA','ID','NV','PA','NJ','MD'] },
  { slug: 'haggen', chainSlug: 'haggen', name: 'Haggen', markupPct: 10, tier: 'retail',
    states: ['WA','OR'] },
  { slug: 'metropolitan-market', chainSlug: 'metropolitan_market', name: 'Metropolitan Market', markupPct: 8, tier: 'retail',
    states: ['WA'] },
  { slug: 'town-and-country', chainSlug: 'town_country', name: 'Town & Country Markets', markupPct: 10, tier: 'retail',
    states: ['WA'] },
  { slug: 'central-co-op', chainSlug: 'central_coop', name: 'Central Co-op', markupPct: 10, tier: 'retail',
    states: ['WA'] },
  { slug: 'market-of-choice', chainSlug: 'market_of_choice', name: 'Market of Choice', markupPct: 10, tier: 'retail',
    states: ['OR'] },
  { slug: 'winco-foods', chainSlug: 'winco', name: 'WinCo Foods', markupPct: 15, tier: 'retail',
    states: ['ID','WA','OR','CA','NV','AZ','TX','UT','OK','MT'] },

  // ════════════════════════════════════════════════
  // MOUNTAIN / PLAINS
  // ════════════════════════════════════════════════
  { slug: 'harmons', chainSlug: 'harmons', name: 'Harmons', markupPct: 10, tier: 'retail',
    states: ['UT'] },
  { slug: 'maceys', chainSlug: 'maceys', name: "Macey's", markupPct: 12, tier: 'retail',
    states: ['UT'] },
  { slug: 'lins', chainSlug: 'lins', name: "Lin's", markupPct: 12, tier: 'retail',
    states: ['UT'] },
  { slug: 'ridleys', chainSlug: 'ridleys', name: "Ridley's", markupPct: 12, tier: 'retail',
    states: ['ID','MT','UT'] },
  { slug: 'rosauers-supermarkets', chainSlug: 'rosauers', name: "Rosauers", markupPct: 12, tier: 'retail',
    states: ['WA','ID','MT','OR'] },
  { slug: 'super-1-foods', chainSlug: 'super_1_foods', name: 'Super 1 Foods', markupPct: 12, tier: 'retail',
    states: ['ID','WA','MT'] },
  { slug: 'yokes-fresh-market', chainSlug: 'yokes', name: "Yoke's Fresh Market", markupPct: 12, tier: 'retail',
    states: ['WA','ID'] },

  // ════════════════════════════════════════════════
  // ADDITIONAL ETHNIC / INTERNATIONAL
  // ════════════════════════════════════════════════
  { slug: 'great-wall', chainSlug: 'great_wall', name: 'Great Wall Supermarket', markupPct: 12, tier: 'retail',
    states: ['VA','MD','GA','TX'] },
  { slug: 'good-fortune', chainSlug: 'good_fortune', name: 'Good Fortune Supermarket', markupPct: 12, tier: 'retail',
    states: ['NY','NJ'] },
  { slug: 'hana-world', chainSlug: 'hana_world', name: 'Hana World Market', markupPct: 12, tier: 'retail',
    states: ['TX'] },
  { slug: 'kam-man', chainSlug: 'kam_man', name: 'Kam Man Food', markupPct: 12, tier: 'retail',
    states: ['NJ','CT'] },
  { slug: 'apna-bazaar', chainSlug: 'apna_bazaar', name: 'Apna Bazaar', markupPct: 12, tier: 'retail',
    states: ['NJ','NY'] },
  { slug: 'international-fresh', chainSlug: 'intl_fresh', name: 'International Fresh Market', markupPct: 12, tier: 'retail',
    states: ['IL','IN'] },
  { slug: 'la-bodega', chainSlug: 'la_bodega', name: 'La Bodega', markupPct: 12, tier: 'retail',
    states: ['TX','FL'] },
  { slug: 'supermercado-el-ahorro', chainSlug: 'el_ahorro', name: 'El Ahorro Supermarket', markupPct: 12, tier: 'retail',
    states: ['TX'] },
  { slug: 'ranch-99', chainSlug: 'ranch_99', name: '168 Market', markupPct: 12, tier: 'retail',
    states: ['CA'] },

  // ════════════════════════════════════════════════
  // ADDITIONAL WHOLESALE / FOODSERVICE
  // ════════════════════════════════════════════════
  { slug: 'jetro', chainSlug: 'jetro', name: 'Jetro Cash & Carry', markupPct: 5, tier: 'wholesale',
    states: ['NY','NJ','PA','FL','TX','CA'] },
  { slug: 'chefs-warehouse', chainSlug: 'chefs_warehouse', name: "Chef's Warehouse", markupPct: 5, tier: 'wholesale',
    states: ['NY','NJ','CT','PA','FL','TX','CA','IL','DC','MD'] },
  { slug: 'performance-food', chainSlug: 'performance_food', name: 'Performance Food Group', markupPct: 5, tier: 'wholesale',
    states: ['VA','TX','GA','OH','CO'] },

  // ════════════════════════════════════════════════
  // NATURAL / ORGANIC / CO-OPS
  // ════════════════════════════════════════════════
  { slug: 'whole-foods-market', chainSlug: 'whole_foods', name: 'Whole Foods', markupPct: 10, tier: 'retail',
    states: ['MA','CT','RI','NY','NJ','PA','MD','DC','VA','NC','SC','GA','FL','TN','OH','MI','IL','MN','MO','TX','CO','AZ','NV','CA','OR','WA','HI'] },
  { slug: 'mom-organic', chainSlug: 'mom_organic', name: "MOM's Organic Market", markupPct: 8, tier: 'retail',
    states: ['MD','VA','DC','PA','NJ','NY'] },
  { slug: 'fresh-market', chainSlug: 'fresh_market', name: 'Fresh Market', markupPct: 10, tier: 'retail',
    states: ['NC','SC','GA','FL','AL','TN','VA','OH','IN','IL','CT','PA','MD'] },
  { slug: 'lucky-market', chainSlug: 'lucky_market', name: "Lucky's Market", markupPct: 10, tier: 'retail',
    states: ['FL','CO','OH','IN','MI','MO','MT'] },
  { slug: 'fresh-fields', chainSlug: 'fresh_fields', name: 'Fresh Fields', markupPct: 10, tier: 'retail',
    states: ['MD','VA'] },

  // ════════════════════════════════════════════════
  // DISCOUNT / VALUE
  // ════════════════════════════════════════════════
  { slug: 'dollar-general', chainSlug: 'dollar_general', name: 'Dollar General', markupPct: 20, tier: 'retail',
    states: Object.keys(STATE_ZIPS) },
  { slug: 'dollar-tree', chainSlug: 'dollar_tree', name: 'Dollar Tree', markupPct: 20, tier: 'retail',
    states: Object.keys(STATE_ZIPS) },
  { slug: 'family-dollar', chainSlug: 'family_dollar', name: 'Family Dollar', markupPct: 20, tier: 'retail',
    states: Object.keys(STATE_ZIPS) },
  { slug: 'five-below', chainSlug: 'five_below', name: 'Five Below', markupPct: 20, tier: 'retail',
    states: Object.keys(STATE_ZIPS) },
  { slug: 'grocery-outlet', chainSlug: 'grocery_outlet_disc', name: 'Grocery Outlet Bargain', markupPct: 15, tier: 'retail',
    states: ['CA','OR','WA','ID','NV','PA','NJ','MD'] },
  { slug: 'ocean-state', chainSlug: 'ocean_state', name: 'Ocean State Job Lot', markupPct: 15, tier: 'retail',
    states: ['MA','CT','RI','NH','NY','NJ','PA'] },
  { slug: 'sharp-shopper', chainSlug: 'sharp_shopper', name: 'Sharp Shopper', markupPct: 15, tier: 'retail',
    states: ['PA','VA'] },
  { slug: 'ollies', chainSlug: 'ollies', name: "Ollie's Bargain Outlet", markupPct: 15, tier: 'retail',
    states: ['PA','NY','NJ','OH','VA','NC','SC','GA','FL','MI','IN','KY','TN','AL','MS'] },
];

// ══════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════

// Chains verified as NOT on Instacart (404 confirmed 2026-04-07).
// These stay in the database for receipt/Flipp/direct scraping, but
// the Instacart scraper skips them to avoid wasting Pi time.
const NOT_ON_INSTACART = new Set([
  // Albertsons banners with own delivery (not Instacart)
  'shaws', 'star-market', 'carrs',
  // Own delivery platforms
  'whole-foods', 'whole-foods-market', 'lidl', 'aldi-nord',
  'lowes-foods', 'fareway', 'woodmans', 'coborns',
  // Wholesale / distributor (no retail scraping)
  'chefs-warehouse', 'performance-food',
  // Not on Instacart (verified 404)
  'bakers', 'jay-c', 'harveys', 'fresco-y-mas', 'price-rite',
  'times-supermarket', 'mitsuwa', 'patel-brothers', 'lotte-plaza',
  'foods-co', 'sedanos', 'northgate', 'grocery-depot', 'presidente',
  'uncle-giuseppes', 'balducci', 'food-emporium', 'c-town',
  'karns', 'redner', 'associated', 'sentry', 'martins-super',
  'piggly-wiggly-midwest', 'ruler', 'marc', 'jungle-jims',
  'hyvee', 'ranch-market', 'la-michoacana', 'spec', 'nugget-markets',
  'ranch-99', 'madre-tierra', 'jons', 'central-co-op', 'market-of-choice',
  'lins', 'apna-bazaar', 'great-wall', 'kam-man', 'hana-world',
  'good-fortune', 'la-bodega', 'supermercado-el-ahorro',
  'international-fresh', 'lucky-market', 'mom-organic', 'fresh-fields',
  // Discount (not on Instacart)
  'dollar-general', 'dollar-tree', 'family-dollar', 'five-below',
  'ocean-state', 'sharp-shopper', 'ollies',
]);

export { CHAIN_DEFINITIONS, STATE_ZIPS, NOT_ON_INSTACART };
export const NATIONWIDE_STORES = CHAIN_DEFINITIONS;

/**
 * Flatten into one entry per chain+state+zip for the scraper.
 * This is what the Instacart bulk scraper iterates over.
 */
export function getFlatStoreList() {
  const flat = [];
  for (const chain of CHAIN_DEFINITIONS) {
    // Skip chains verified as not on Instacart
    if (NOT_ON_INSTACART.has(chain.slug)) continue;
    for (const stateCode of chain.states) {
      const zips = STATE_ZIPS[stateCode];
      if (!zips) continue;
      for (const z of zips) {
        flat.push({
          slug: chain.slug,
          chainSlug: chain.chainSlug,
          sourceId: `ic-${chain.slug}-${stateCode.toLowerCase()}-${z.zip}`,
          name: `${chain.name} (${z.label}, ${stateCode})`,
          markupPct: chain.markupPct,
          tier: chain.tier,
          zip: z.zip,
          state: stateCode,
          label: `${z.label}, ${stateCode}`,
        });
      }
    }
  }
  return flat;
}

/**
 * Get unique chains (deduplicated by chainSlug).
 */
export function getUniqueChains() {
  const seen = new Set();
  const chains = [];
  for (const store of CHAIN_DEFINITIONS) {
    if (!seen.has(store.chainSlug)) {
      seen.add(store.chainSlug);
      chains.push({ slug: store.chainSlug, name: store.name });
    }
  }
  return chains;
}

/**
 * Get all chains that operate in a specific state.
 */
export function getStoresForState(stateCode) {
  return CHAIN_DEFINITIONS.filter(c => c.states.includes(stateCode));
}

// Quick stats when run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('nationwide-stores.mjs')) {
  const flat = getFlatStoreList();
  const chains = getUniqueChains();
  const allStates = new Set();
  for (const c of CHAIN_DEFINITIONS) c.states.forEach(s => allStates.add(s));

  console.log('=== Nationwide Store Registry ===');
  console.log(`Chains: ${chains.length}`);
  console.log(`Scrape targets: ${flat.length} (chain x state x zip combinations)`);
  console.log(`States covered: ${allStates.size} / 50 + DC`);
  console.log('');

  // Check for missing states
  const ALL_STATES = Object.keys(STATE_ZIPS);
  const covered = new Set();
  for (const c of CHAIN_DEFINITIONS) c.states.forEach(s => covered.add(s));
  const missing = ALL_STATES.filter(s => !covered.has(s));
  if (missing.length > 0) {
    console.log('WARNING - States with NO chain coverage:', missing.join(', '));
  } else {
    console.log('All states have at least one chain configured.');
  }

  console.log('');
  console.log('Chains per state:');
  for (const s of ALL_STATES.sort()) {
    const count = CHAIN_DEFINITIONS.filter(c => c.states.includes(s)).length;
    console.log(`  ${s}: ${count} chains`);
  }
}
