import type { CulinaryRadarRawItem } from '../types'

type WckFixtureRecord = Record<string, unknown>

export function parseWckRecord(record: WckFixtureRecord): CulinaryRadarRawItem {
  return {
    sourceKey: 'wck_opportunities',
    externalId: text(record.slug) || text(record.id) || text(record.url),
    title: text(record.title) || text(record.headline),
    summary: text(record.description) || text(record.summary),
    url: text(record.url) || text(record.link),
    publishedAt: text(record.publishedAt) || text(record.date),
    updatedAt: text(record.updatedAt) || null,
    status: text(record.status),
    category: 'opportunity',
    tags: ['relief', 'operations', 'opportunity'],
    locations: stringArray(record.locations),
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
