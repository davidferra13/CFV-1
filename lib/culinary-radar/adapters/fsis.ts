import type { CulinaryRadarRawItem } from '../types'

type FsisFixtureRecord = Record<string, unknown>

export function parseFsisRecord(record: FsisFixtureRecord): CulinaryRadarRawItem {
  const title = text(record.title) || text(record.product) || text(record.field_recall_title)
  const url = text(record.url) || text(record.field_recall_url) || text(record.link)
  const reason = text(record.reason) || text(record.summary) || text(record.field_recall_reason)

  return {
    sourceKey: 'fsis_recalls',
    externalId:
      text(record.recall_id) || text(record.field_recall_number) || text(record.id) || url || title,
    title,
    summary: reason,
    url: url || 'https://www.fsis.usda.gov/recalls-alerts',
    publishedAt:
      text(record.published_date) ||
      text(record.publishedAt) ||
      text(record.field_recall_date) ||
      text(record.created) ||
      new Date().toISOString(),
    updatedAt: text(record.updated_date) || null,
    status: record.active === true ? 'active' : text(record.status),
    category: 'safety',
    tags: [text(record.classification), text(record.field_recall_risk_level), 'recall'].filter(
      Boolean
    ),
    affectedEntities: {
      product: title,
      reason,
      distribution: text(record.distribution) || text(record.field_states),
    },
    rawPayload: record,
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
