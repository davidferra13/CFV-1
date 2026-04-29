import type { CulinaryRadarRawItem } from '../types'

type FsisFixtureRecord = Record<string, unknown>

export function parseFsisRecord(record: FsisFixtureRecord): CulinaryRadarRawItem {
  return {
    sourceKey: 'fsis',
    externalId: text(record.recall_id) || text(record.id) || text(record.url),
    title: text(record.title) || text(record.product),
    summary: text(record.reason) || text(record.summary),
    url: text(record.url),
    publishedAt: text(record.published_date) || text(record.publishedAt),
    updatedAt: text(record.updated_date) || null,
    status: record.active === true ? 'active' : text(record.status),
    tags: [text(record.classification), 'recall'].filter(Boolean),
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
