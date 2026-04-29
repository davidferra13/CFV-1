import type { CulinaryRadarRawItem } from '../types'

type IftRecord = Record<string, unknown>

export function parseIftRecord(record: IftRecord): CulinaryRadarRawItem {
  return {
    sourceKey: 'ift_food_science',
    externalId: text(record.id) || text(record.slug) || text(record.url),
    title: text(record.title) || text(record.headline),
    summary: text(record.summary) || text(record.description),
    url: text(record.url) || text(record.link) || 'https://www.ift.org/news-and-publications',
    publishedAt: text(record.publishedAt) || text(record.date) || new Date().toISOString(),
    updatedAt: text(record.updatedAt) || null,
    status: text(record.status),
    category: 'craft',
    tags: ['food science', 'innovation', text(record.topic)].filter(Boolean),
    rawPayload: record,
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
