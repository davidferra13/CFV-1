import type { CulinaryRadarSourceDefinition, CulinaryRadarSourceKey } from './types'

export const CULINARY_RADAR_SOURCES: readonly CulinaryRadarSourceDefinition[] = [
  {
    key: 'fda',
    label: 'FDA Recalls',
    authority: 'regulatory',
    homepageUrl: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
    defaultRelevanceScore: 65,
  },
  {
    key: 'fsis',
    label: 'USDA FSIS Recalls',
    authority: 'regulatory',
    homepageUrl: 'https://www.fsis.usda.gov/recalls-alerts',
    defaultRelevanceScore: 65,
  },
  {
    key: 'wck',
    label: 'World Central Kitchen',
    authority: 'relief',
    homepageUrl: 'https://wck.org/news',
    defaultRelevanceScore: 45,
  },
  {
    key: 'worldchefs',
    label: 'Worldchefs',
    authority: 'industry',
    homepageUrl: 'https://worldchefs.org/news',
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
