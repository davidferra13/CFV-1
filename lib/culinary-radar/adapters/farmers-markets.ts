import type { CulinaryRadarRawItem } from '../types'

type FarmersMarketRecord = Record<string, unknown>

const USDA_FARMERS_MARKET_URL =
  'https://www.ams.usda.gov/local-food-directories/farmersmarkets'

export function parseFarmersMarketRecord(record: FarmersMarketRecord): CulinaryRadarRawItem {
  const url = text(record.url) || text(record.link) || USDA_FARMERS_MARKET_URL
  const title =
    text(record.title) ||
    text(record.headline) ||
    text(record.marketName) ||
    'USDA National Farmers Market Directory'
  const summary =
    text(record.summary) ||
    text(record.description) ||
    'USDA AMS maintains a national directory for farmers markets with locations, operating times, product offerings, payment methods, and local food access details.'

  return {
    sourceKey: 'usda_farmers_markets',
    externalId: text(record.id) || text(record.slug) || url,
    title,
    summary,
    url,
    publishedAt: text(record.publishedAt) || text(record.date) || new Date().toISOString(),
    updatedAt: text(record.updatedAt) || null,
    status: text(record.status) || 'monitored',
    category: 'local',
    tags: ['farmers market', 'local sourcing', 'supplier', 'seasonal produce'],
    locations: stringArray(record.locations),
    affectedEntities: {
      directory: 'USDA Local Food Directories',
      searchableBy: ['zip code', 'product availability', 'payment method', 'SNAP participation'],
    },
    rawPayload: record,
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []
}
