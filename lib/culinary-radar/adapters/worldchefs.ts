import type { CulinaryRadarRawItem } from '../types'

type WorldchefsFixtureRecord = Record<string, unknown>

export function parseWorldchefsRecord(record: WorldchefsFixtureRecord): CulinaryRadarRawItem {
  return {
    sourceKey: 'worldchefs_sustainability',
    externalId: text(record.id) || text(record.slug) || text(record.link),
    title: text(record.headline) || text(record.title),
    summary: text(record.body) || text(record.summary),
    url: text(record.link) || text(record.url),
    publishedAt: text(record.date) || text(record.publishedAt),
    updatedAt: text(record.updatedAt) || null,
    status: text(record.status),
    category: 'sustainability',
    tags: ['industry', 'sustainability', text(record.region)].filter(Boolean),
    rawPayload: record,
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
