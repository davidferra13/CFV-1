import type { CulinaryRadarRawItem } from '../types'

type FdaFixtureRecord = Record<string, unknown>

export function parseFdaRecord(record: FdaFixtureRecord): CulinaryRadarRawItem {
  return {
    sourceKey: 'fda',
    externalId: text(record.recall_number) || text(record.id) || text(record.url),
    title: text(record.title) || text(record.product_description),
    summary: text(record.summary) || text(record.reason_for_recall),
    url: text(record.url),
    publishedAt: text(record.published_at) || text(record.recall_initiation_date),
    updatedAt: text(record.updated_at) || null,
    status: text(record.status),
    tags: [text(record.classification), text(record.reason), 'recall'].filter(Boolean),
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
