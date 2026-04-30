import type { CulinaryRadarSourceDefinition, CulinaryRadarSourceKey } from './types'

export const CULINARY_RADAR_SOURCES: readonly CulinaryRadarSourceDefinition[] = [
  {
    key: 'fda_recalls',
    label: 'FDA Recalls',
    authority: 'regulatory',
    category: 'safety',
    credibilityTier: 'official',
    homepageUrl: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
    feedUrl: 'https://api.fda.gov/food/enforcement.json?limit=25&sort=report_date:desc',
    defaultRelevanceScore: 65,
  },
  {
    key: 'fsis_recalls',
    label: 'USDA FSIS Recalls',
    authority: 'regulatory',
    category: 'safety',
    credibilityTier: 'official',
    homepageUrl: 'https://www.fsis.usda.gov/recalls-alerts',
    feedUrl: 'https://www.fsis.usda.gov/fsis/api/recall/v/1',
    defaultRelevanceScore: 65,
  },
  {
    key: 'cdc_foodborne_outbreaks',
    label: 'CDC Foodborne Outbreaks',
    authority: 'regulatory',
    category: 'safety',
    credibilityTier: 'official',
    homepageUrl: 'https://www.cdc.gov/foodborne-outbreaks/index.html',
    defaultRelevanceScore: 70,
  },
  {
    key: 'usda_farmers_markets',
    label: 'USDA Farmers Market Directory',
    authority: 'industry',
    category: 'local',
    credibilityTier: 'official',
    homepageUrl: 'https://www.ams.usda.gov/local-food-directories/farmersmarkets',
    feedUrl: 'https://www.usdalocalfoodportal.com/',
    defaultRelevanceScore: 50,
  },
  {
    key: 'wck_opportunities',
    label: 'World Central Kitchen',
    authority: 'relief',
    category: 'opportunity',
    credibilityTier: 'mission_partner',
    homepageUrl: 'https://wck.org/careers/',
    defaultRelevanceScore: 45,
  },
  {
    key: 'worldchefs_sustainability',
    label: 'Worldchefs',
    authority: 'industry',
    category: 'sustainability',
    credibilityTier: 'industry',
    homepageUrl: 'https://feedtheplanet.worldchefs.org/our-trainers/',
    defaultRelevanceScore: 35,
  },
  {
    key: 'ift_food_science',
    label: 'IFT Food Science',
    authority: 'academic',
    category: 'craft',
    credibilityTier: 'industry',
    homepageUrl: 'https://www.ift.org/news-and-publications',
    defaultRelevanceScore: 35,
  },
]

const SOURCE_BY_KEY = new Map<CulinaryRadarSourceKey, CulinaryRadarSourceDefinition>(
  CULINARY_RADAR_SOURCES.map((source) => [source.key, source])
)

export function getSourceDefinition(key: CulinaryRadarSourceKey): CulinaryRadarSourceDefinition {
  const source = SOURCE_BY_KEY.get(key)
  if (!source) {
    throw new Error(`Unknown culinary radar source: ${key}`)
  }

  return source
}

export function listSourceDefinitions(): CulinaryRadarSourceDefinition[] {
  return [...CULINARY_RADAR_SOURCES]
}

export function isCulinaryRadarSourceKey(value: string): value is CulinaryRadarSourceKey {
  return SOURCE_BY_KEY.has(value as CulinaryRadarSourceKey)
}
