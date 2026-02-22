// Seasonal Produce Data — US-Centric
// Pure data module — no 'use server', no async.
// Maps months (1-12) to curated seasonal produce grouped by category.

export type SeasonalCategory = 'produce' | 'fresh_herb' | 'protein' | 'specialty'

export type SeasonalItem = {
  name: string
  category: SeasonalCategory
  peak: boolean // true = peak availability, false = still available but transitional
  note?: string // chef tip shown on hover
}

export type SeasonalPeriod =
  | 'deep-winter'
  | 'early-spring'
  | 'late-spring'
  | 'peak-summer'
  | 'fall-harvest'
  | 'late-fall'

export const SEASONAL_CATEGORY_CONFIG: Record<SeasonalCategory, { label: string; emoji: string }> =
  {
    produce: { label: 'Fruits & Vegetables', emoji: '\u{1F96C}' },
    fresh_herb: { label: 'Fresh Herbs', emoji: '\u{1F33F}' },
    protein: { label: 'Seasonal Seafood & Game', emoji: '\u{1F980}' },
    specialty: { label: 'Specialty & Foraged', emoji: '\u{1F344}' },
  }

// ---------------------------------------------------------------------------
// Data: 6 culinary seasons
// ---------------------------------------------------------------------------

const DEEP_WINTER: SeasonalItem[] = [
  // Produce
  { name: 'Blood Oranges', category: 'produce', peak: true, note: 'Season peaks Jan\u2013Feb' },
  { name: 'Meyer Lemons', category: 'produce', peak: true },
  { name: 'Grapefruit', category: 'produce', peak: true },
  { name: 'Satsuma Mandarins', category: 'produce', peak: true },
  { name: 'Celery Root', category: 'produce', peak: true },
  { name: 'Parsnips', category: 'produce', peak: true },
  { name: 'Turnips', category: 'produce', peak: true },
  { name: 'Rutabaga', category: 'produce', peak: true },
  { name: 'Brussels Sprouts', category: 'produce', peak: true },
  { name: 'Kale', category: 'produce', peak: true },
  { name: 'Collard Greens', category: 'produce', peak: true },
  { name: 'Sweet Potatoes', category: 'produce', peak: false },
  { name: 'Beets', category: 'produce', peak: true },
  { name: 'Fennel', category: 'produce', peak: true },
  { name: 'Cabbage', category: 'produce', peak: true },
  { name: 'Leeks', category: 'produce', peak: true },
  // Fresh herbs
  { name: 'Rosemary', category: 'fresh_herb', peak: true },
  { name: 'Thyme', category: 'fresh_herb', peak: true },
  { name: 'Bay Leaves', category: 'fresh_herb', peak: true },
  { name: 'Sage', category: 'fresh_herb', peak: true },
  // Protein
  { name: 'Dungeness Crab', category: 'protein', peak: true, note: 'Pacific season Nov\u2013Jun' },
  { name: 'Black Cod', category: 'protein', peak: true },
  { name: 'Mussels', category: 'protein', peak: true, note: 'Best in cold months' },
  { name: 'Venison', category: 'protein', peak: false, note: 'Late season availability' },
  // Specialty
  {
    name: 'Black Truffles',
    category: 'specialty',
    peak: true,
    note: 'European season Dec\u2013Mar',
  },
  { name: 'Pomegranate', category: 'specialty', peak: false, note: 'Tail end of season' },
  { name: 'Kumquats', category: 'specialty', peak: true },
]

const EARLY_SPRING: SeasonalItem[] = [
  // Produce
  { name: 'Asparagus', category: 'produce', peak: true, note: 'Look for fat spears Mar\u2013Apr' },
  { name: 'Peas', category: 'produce', peak: true },
  { name: 'Sugar Snap Peas', category: 'produce', peak: true },
  { name: 'Artichokes', category: 'produce', peak: true, note: 'Spring harvest begins' },
  { name: 'Radishes', category: 'produce', peak: true },
  { name: 'Fava Beans', category: 'produce', peak: true },
  { name: 'Spring Onions', category: 'produce', peak: true },
  { name: 'Watercress', category: 'produce', peak: true },
  { name: 'Spinach', category: 'produce', peak: true },
  { name: 'Arugula', category: 'produce', peak: true },
  { name: 'Leeks', category: 'produce', peak: false, note: 'Last of the season' },
  { name: 'Turnips', category: 'produce', peak: false },
  { name: 'Nettles', category: 'produce', peak: true, note: 'Forage early spring only' },
  { name: 'Green Garlic', category: 'produce', peak: true },
  // Fresh herbs
  { name: 'Chives', category: 'fresh_herb', peak: true },
  { name: 'Dill', category: 'fresh_herb', peak: true },
  { name: 'Mint', category: 'fresh_herb', peak: true },
  { name: 'Tarragon', category: 'fresh_herb', peak: true },
  { name: 'Chervil', category: 'fresh_herb', peak: true },
  // Protein
  { name: 'Soft-Shell Crab', category: 'protein', peak: true, note: 'Brief season Apr\u2013May' },
  { name: 'Shad', category: 'protein', peak: true, note: 'East Coast spring run' },
  { name: 'Wild Salmon', category: 'protein', peak: false, note: 'Copper River starts May' },
  // Specialty
  { name: 'Ramps', category: 'specialty', peak: true, note: 'Foraged, 2\u20133 week window' },
  { name: 'Morel Mushrooms', category: 'specialty', peak: true, note: 'Foraged Apr\u2013May' },
  { name: 'Fiddlehead Ferns', category: 'specialty', peak: true, note: 'Brief spring season' },
]

const LATE_SPRING: SeasonalItem[] = [
  // Produce
  { name: 'Strawberries', category: 'produce', peak: true },
  { name: 'Cherries', category: 'produce', peak: true, note: 'Rainier & Bing start in May' },
  { name: 'Apricots', category: 'produce', peak: true },
  { name: 'Artichokes', category: 'produce', peak: true },
  { name: 'Fava Beans', category: 'produce', peak: true },
  { name: 'Snap Peas', category: 'produce', peak: true },
  { name: 'Zucchini', category: 'produce', peak: true, note: 'Early summer squash' },
  { name: 'New Potatoes', category: 'produce', peak: true },
  { name: 'English Peas', category: 'produce', peak: true },
  { name: 'Vidalia Onions', category: 'produce', peak: true, note: 'Georgia sweet onion season' },
  { name: 'Rhubarb', category: 'produce', peak: true },
  { name: 'Spring Garlic', category: 'produce', peak: true },
  { name: 'Arugula', category: 'produce', peak: true },
  // Fresh herbs
  { name: 'Basil', category: 'fresh_herb', peak: true },
  { name: 'Cilantro', category: 'fresh_herb', peak: true },
  { name: 'Mint', category: 'fresh_herb', peak: true },
  { name: 'Lavender', category: 'fresh_herb', peak: true, note: 'Culinary varieties' },
  { name: 'Lemon Verbena', category: 'fresh_herb', peak: true },
  // Protein
  { name: 'Soft-Shell Crab', category: 'protein', peak: true },
  { name: 'Wild Salmon', category: 'protein', peak: true, note: 'Copper River in full swing' },
  { name: 'Halibut', category: 'protein', peak: true, note: 'Pacific season' },
  // Specialty
  {
    name: 'Elderflower',
    category: 'specialty',
    peak: true,
    note: 'Brief bloom for cordials & desserts',
  },
  { name: 'Morel Mushrooms', category: 'specialty', peak: false, note: 'Late season' },
]

const PEAK_SUMMER: SeasonalItem[] = [
  // Produce
  { name: 'Tomatoes', category: 'produce', peak: true, note: 'Heirloom season' },
  { name: 'Sweet Corn', category: 'produce', peak: true },
  { name: 'Peaches', category: 'produce', peak: true },
  { name: 'Nectarines', category: 'produce', peak: true },
  { name: 'Plums', category: 'produce', peak: true },
  { name: 'Blueberries', category: 'produce', peak: true },
  { name: 'Blackberries', category: 'produce', peak: true },
  { name: 'Raspberries', category: 'produce', peak: true },
  { name: 'Watermelon', category: 'produce', peak: true },
  { name: 'Cantaloupe', category: 'produce', peak: true },
  { name: 'Peppers', category: 'produce', peak: true },
  { name: 'Eggplant', category: 'produce', peak: true },
  { name: 'Okra', category: 'produce', peak: true },
  { name: 'Green Beans', category: 'produce', peak: true },
  { name: 'Cucumbers', category: 'produce', peak: true },
  { name: 'Figs', category: 'produce', peak: true, note: 'First crop (breba) in July' },
  {
    name: 'Hatch Chiles',
    category: 'produce',
    peak: true,
    note: 'New Mexico harvest Aug\u2013Sep',
  },
  // Fresh herbs
  { name: 'Basil', category: 'fresh_herb', peak: true },
  { name: 'Cilantro', category: 'fresh_herb', peak: false, note: 'Bolts fast in heat' },
  { name: 'Shiso', category: 'fresh_herb', peak: true },
  { name: 'Thai Basil', category: 'fresh_herb', peak: true },
  { name: 'Lemongrass', category: 'fresh_herb', peak: true },
  // Protein
  { name: 'Wild Salmon', category: 'protein', peak: true },
  { name: 'Swordfish', category: 'protein', peak: true },
  { name: 'Yellowfin Tuna', category: 'protein', peak: true },
  { name: 'Lobster', category: 'protein', peak: true, note: 'Maine season peaks Jul\u2013Aug' },
  // Specialty
  { name: 'Chanterelles', category: 'specialty', peak: true, note: 'Foraged Jul\u2013Sep' },
  {
    name: 'Squash Blossoms',
    category: 'specialty',
    peak: true,
    note: 'Stuff & fry, or use as garnish',
  },
]

const FALL_HARVEST: SeasonalItem[] = [
  // Produce
  { name: 'Butternut Squash', category: 'produce', peak: true },
  { name: 'Delicata Squash', category: 'produce', peak: true },
  { name: 'Acorn Squash', category: 'produce', peak: true },
  { name: 'Kabocha Squash', category: 'produce', peak: true },
  { name: 'Apples', category: 'produce', peak: true, note: 'Honeycrisp, Fuji, Gala peak' },
  { name: 'Pears', category: 'produce', peak: true },
  { name: 'Grapes', category: 'produce', peak: true, note: 'Concord & wine grapes' },
  { name: 'Brussels Sprouts', category: 'produce', peak: true, note: 'Sweeter after first frost' },
  { name: 'Cauliflower', category: 'produce', peak: true },
  { name: 'Broccoli', category: 'produce', peak: true },
  { name: 'Sweet Potatoes', category: 'produce', peak: true },
  { name: 'Parsnips', category: 'produce', peak: true, note: 'Sweeter after frost' },
  { name: 'Fennel', category: 'produce', peak: true },
  { name: 'Celery Root', category: 'produce', peak: true },
  { name: 'Figs', category: 'produce', peak: true, note: 'Second crop Sep\u2013Oct' },
  // Fresh herbs
  { name: 'Sage', category: 'fresh_herb', peak: true },
  { name: 'Rosemary', category: 'fresh_herb', peak: true },
  { name: 'Thyme', category: 'fresh_herb', peak: true },
  { name: 'Oregano', category: 'fresh_herb', peak: true },
  // Protein
  { name: 'Oysters', category: 'protein', peak: true, note: 'Best in months with an R' },
  { name: 'Wild Duck', category: 'protein', peak: true },
  { name: 'Venison', category: 'protein', peak: true, note: 'Hunting season begins' },
  { name: 'Elk', category: 'protein', peak: true },
  // Specialty
  { name: 'Porcini Mushrooms', category: 'specialty', peak: true },
  { name: 'Hen of the Woods', category: 'specialty', peak: true, note: 'Foraged Sep\u2013Nov' },
  { name: 'Black Walnuts', category: 'specialty', peak: true, note: 'Foraged, intense flavor' },
  {
    name: 'Quince',
    category: 'specialty',
    peak: true,
    note: 'Must be cooked \u2014 incredible poached or in paste',
  },
]

const LATE_FALL: SeasonalItem[] = [
  // Produce
  { name: 'Cranberries', category: 'produce', peak: true },
  { name: 'Persimmons', category: 'produce', peak: true, note: 'Fuyu (crisp) & Hachiya (soft)' },
  { name: 'Pomegranate', category: 'produce', peak: true },
  { name: 'Satsuma Mandarins', category: 'produce', peak: true, note: 'Season begins Nov' },
  { name: 'Cara Cara Oranges', category: 'produce', peak: true },
  { name: 'Pumpkin', category: 'produce', peak: true },
  { name: 'Winter Squash', category: 'produce', peak: true },
  { name: 'Kale', category: 'produce', peak: true, note: 'Sweetens after frost' },
  { name: 'Collard Greens', category: 'produce', peak: true },
  { name: 'Swiss Chard', category: 'produce', peak: false },
  { name: 'Turnips', category: 'produce', peak: true },
  { name: 'Celery Root', category: 'produce', peak: true },
  { name: 'Beets', category: 'produce', peak: true },
  { name: 'Radicchio', category: 'produce', peak: true },
  { name: 'Endive', category: 'produce', peak: true },
  // Fresh herbs
  { name: 'Rosemary', category: 'fresh_herb', peak: true },
  { name: 'Sage', category: 'fresh_herb', peak: true },
  { name: 'Bay Leaves', category: 'fresh_herb', peak: true },
  { name: 'Thyme', category: 'fresh_herb', peak: true },
  // Protein
  { name: 'Dungeness Crab', category: 'protein', peak: true, note: 'Season opens mid-Nov' },
  { name: 'Oysters', category: 'protein', peak: true },
  { name: 'Mussels', category: 'protein', peak: true },
  { name: 'Wild Boar', category: 'protein', peak: true },
  // Specialty
  {
    name: 'Black Truffles',
    category: 'specialty',
    peak: true,
    note: 'P\u00E9rigord season starts Dec',
  },
  { name: 'Chestnuts', category: 'specialty', peak: true },
  {
    name: 'Sunchokes',
    category: 'specialty',
    peak: true,
    note: 'Also called Jerusalem artichokes',
  },
  {
    name: 'Dried Persimmons',
    category: 'specialty',
    peak: true,
    note: 'Hoshigaki \u2014 Japanese technique',
  },
]

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

const SEASON_MAP: Record<number, { period: SeasonalPeriod; label: string; items: SeasonalItem[] }> =
  {
    1: { period: 'deep-winter', label: 'Deep Winter', items: DEEP_WINTER },
    2: { period: 'deep-winter', label: 'Deep Winter', items: DEEP_WINTER },
    3: { period: 'early-spring', label: 'Early Spring', items: EARLY_SPRING },
    4: { period: 'early-spring', label: 'Early Spring', items: EARLY_SPRING },
    5: { period: 'late-spring', label: 'Late Spring', items: LATE_SPRING },
    6: { period: 'late-spring', label: 'Late Spring', items: LATE_SPRING },
    7: { period: 'peak-summer', label: 'Peak Summer', items: PEAK_SUMMER },
    8: { period: 'peak-summer', label: 'Peak Summer', items: PEAK_SUMMER },
    9: { period: 'fall-harvest', label: 'Fall Harvest', items: FALL_HARVEST },
    10: { period: 'fall-harvest', label: 'Fall Harvest', items: FALL_HARVEST },
    11: { period: 'late-fall', label: 'Late Fall', items: LATE_FALL },
    12: { period: 'late-fall', label: 'Late Fall', items: LATE_FALL },
  }

const CATEGORY_ORDER: SeasonalCategory[] = ['produce', 'fresh_herb', 'protein', 'specialty']

export function getSeasonalProduceGrouped(month: number) {
  const entry = SEASON_MAP[month] ?? SEASON_MAP[1]

  const groups = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: SEASONAL_CATEGORY_CONFIG[cat].label,
    items: entry.items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0)

  return {
    period: entry.period,
    seasonLabel: entry.label,
    groups,
  }
}
