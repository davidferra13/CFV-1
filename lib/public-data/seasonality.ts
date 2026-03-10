export type SeasonName = 'Spring' | 'Summer' | 'Fall' | 'Winter'

type SeasonalityRecord = {
  name: string
  aliases: string[]
  peakMonths: number[]
  yearRound?: boolean
}

export type IngredientSeasonality = {
  canonicalName: string | null
  status: 'peak_now' | 'seasonal_reference' | 'year_round' | 'unclassified'
  peakMonths: number[]
  seasons: SeasonName[]
  source: string | null
}

const SEASONALITY_SOURCE = 'USDA / SNAP-Ed seasonal produce reference'

const SEASONALITY_REFERENCE: SeasonalityRecord[] = [
  { name: 'Asparagus', aliases: ['asparagus'], peakMonths: [4, 5, 6] },
  { name: 'Artichoke', aliases: ['artichoke', 'artichokes'], peakMonths: [3, 4, 5] },
  { name: 'Beets', aliases: ['beet', 'beets'], peakMonths: [6, 7, 8, 9, 10] },
  { name: 'Blueberries', aliases: ['blueberry', 'blueberries'], peakMonths: [6, 7, 8] },
  { name: 'Blackberries', aliases: ['blackberry', 'blackberries'], peakMonths: [7, 8] },
  { name: 'Basil', aliases: ['basil'], peakMonths: [6, 7, 8] },
  { name: 'Cucumbers', aliases: ['cucumber', 'cucumbers'], peakMonths: [6, 7, 8] },
  { name: 'Corn', aliases: ['corn', 'sweet corn'], peakMonths: [7, 8, 9] },
  { name: 'Eggplant', aliases: ['eggplant', 'aubergine'], peakMonths: [7, 8, 9] },
  { name: 'Figs', aliases: ['fig', 'figs'], peakMonths: [8, 9] },
  { name: 'Fiddleheads', aliases: ['fiddlehead', 'fiddleheads'], peakMonths: [4, 5] },
  { name: 'Kale', aliases: ['kale'], peakMonths: [10, 11, 12, 1, 2] },
  { name: 'Lettuce', aliases: ['lettuce', 'greens', 'mesclun'], peakMonths: [4, 5, 6, 9, 10] },
  { name: 'Morels', aliases: ['morel', 'morels'], peakMonths: [4, 5] },
  {
    name: 'Mushrooms',
    aliases: ['mushroom', 'mushrooms', 'chanterelle', 'chanterelles'],
    peakMonths: [9, 10, 11],
  },
  { name: 'Peaches', aliases: ['peach', 'peaches'], peakMonths: [7, 8, 9] },
  { name: 'Pears', aliases: ['pear', 'pears'], peakMonths: [9, 10] },
  { name: 'Peas', aliases: ['pea', 'peas', 'snap pea', 'snap peas'], peakMonths: [5, 6] },
  { name: 'Peppers', aliases: ['pepper', 'peppers', 'bell pepper'], peakMonths: [7, 8, 9] },
  { name: 'Pumpkin', aliases: ['pumpkin', 'pumpkins'], peakMonths: [9, 10] },
  { name: 'Ramps', aliases: ['ramp', 'ramps'], peakMonths: [4, 5] },
  { name: 'Radishes', aliases: ['radish', 'radishes'], peakMonths: [4, 5, 9, 10] },
  { name: 'Strawberries', aliases: ['strawberry', 'strawberries'], peakMonths: [5, 6] },
  {
    name: 'Squash',
    aliases: ['squash', 'summer squash', 'winter squash'],
    peakMonths: [7, 8, 9, 10, 11],
  },
  { name: 'Sweet Potatoes', aliases: ['sweet potato', 'sweet potatoes'], peakMonths: [9, 10, 11] },
  { name: 'Tomatoes', aliases: ['tomato', 'tomatoes'], peakMonths: [7, 8, 9] },
  { name: 'Turnips', aliases: ['turnip', 'turnips'], peakMonths: [10, 11, 12] },
  { name: 'Zucchini', aliases: ['zucchini'], peakMonths: [6, 7, 8] },
  {
    name: 'Citrus',
    aliases: ['citrus', 'orange', 'oranges', 'lemon', 'lemons', 'grapefruit'],
    peakMonths: [12, 1, 2],
  },
  { name: 'Apples', aliases: ['apple', 'apples'], peakMonths: [9, 10, 11] },
  { name: 'Potatoes', aliases: ['potato', 'potatoes'], peakMonths: [], yearRound: true },
  {
    name: 'Onions',
    aliases: ['onion', 'onions', 'shallot', 'shallots'],
    peakMonths: [],
    yearRound: true,
  },
  { name: 'Garlic', aliases: ['garlic'], peakMonths: [], yearRound: true },
  { name: 'Carrots', aliases: ['carrot', 'carrots'], peakMonths: [], yearRound: true },
]

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function monthToSeason(month: number): SeasonName {
  if (month === 12 || month === 1 || month === 2) return 'Winter'
  if (month >= 3 && month <= 5) return 'Spring'
  if (month >= 6 && month <= 8) return 'Summer'
  return 'Fall'
}

function uniqueSeasons(months: number[]): SeasonName[] {
  return Array.from(new Set(months.map(monthToSeason)))
}

function findRecord(name: string): SeasonalityRecord | null {
  const normalizedName = normalizeToken(name)
  if (!normalizedName) return null

  for (const record of SEASONALITY_REFERENCE) {
    if (
      record.aliases.some((alias) => {
        const normalizedAlias = normalizeToken(alias)
        return (
          normalizedName === normalizedAlias ||
          normalizedName.includes(normalizedAlias) ||
          normalizedAlias.includes(normalizedName)
        )
      })
    ) {
      return record
    }
  }

  return null
}

export function resolveIngredientSeasonality(
  name: string,
  category?: string | null,
  now = new Date()
): IngredientSeasonality {
  const record = findRecord(name)
  if (record?.yearRound) {
    return {
      canonicalName: record.name,
      status: 'year_round',
      peakMonths: [],
      seasons: [],
      source: SEASONALITY_SOURCE,
    }
  }

  if (record && record.peakMonths.length > 0) {
    const currentMonth = now.getMonth() + 1
    return {
      canonicalName: record.name,
      status: record.peakMonths.includes(currentMonth) ? 'peak_now' : 'seasonal_reference',
      peakMonths: record.peakMonths,
      seasons: uniqueSeasons(record.peakMonths),
      source: SEASONALITY_SOURCE,
    }
  }

  if (category && category !== 'produce' && category !== 'fresh_herb') {
    return {
      canonicalName: null,
      status: 'year_round',
      peakMonths: [],
      seasons: [],
      source: null,
    }
  }

  return {
    canonicalName: null,
    status: 'unclassified',
    peakMonths: [],
    seasons: [],
    source: null,
  }
}

export function getPrimarySeason(
  insight: IngredientSeasonality,
  now = new Date()
): SeasonName | null {
  if (insight.peakMonths.length === 0) return null
  const currentMonth = now.getMonth() + 1
  if (insight.peakMonths.includes(currentMonth)) return monthToSeason(currentMonth)
  return monthToSeason(insight.peakMonths[0])
}

export function formatPeakMonths(months: number[]): string {
  if (months.length === 0) return 'Year-round'

  return months
    .map((month) =>
      new Date(Date.UTC(2026, month - 1, 1)).toLocaleDateString('en-US', {
        month: 'short',
        timeZone: 'UTC',
      })
    )
    .join(', ')
}

export function isPeakNow(insight: IngredientSeasonality): boolean {
  return insight.status === 'peak_now'
}
