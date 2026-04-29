import type { CulinaryRadarRawItem } from '../types'

type CdcRecord = Record<string, unknown>

export function parseCdcRecord(record: CdcRecord): CulinaryRadarRawItem {
  const title = text(record.title) || text(record.name)
  const summary = text(record.summary) || text(record.description)
  const url = text(record.url) || text(record.link) || 'https://www.cdc.gov/foodborne-outbreaks/'

  return {
    sourceKey: 'cdc_foodborne_outbreaks',
    externalId: text(record.id) || url || title,
    title,
    summary,
    url,
    publishedAt: text(record.publishedAt) || text(record.date) || new Date().toISOString(),
    updatedAt: text(record.updatedAt) || null,
    status: text(record.status) || 'active',
    category: 'safety',
    tags: ['outbreak', 'food safety', text(record.pathogen), text(record.food)].filter(Boolean),
    affectedEntities: {
      pathogen: text(record.pathogen),
      food: text(record.food),
      states: record.states,
    },
    rawPayload: record,
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
