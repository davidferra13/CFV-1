import type { CulinaryRadarRawItem } from '../types'

type FdaFixtureRecord = Record<string, unknown>

export function parseFdaRecord(record: FdaFixtureRecord): CulinaryRadarRawItem {
  const recallNumber = text(record.recall_number) || text(record.recallnum)
  const productDescription = text(record.product_description) || text(record.productdescriptiontxt)
  const reason = text(record.reason_for_recall) || text(record.productshortreasontxt)
  const publishedAt =
    text(record.report_date) ||
    text(record.postedinternetdt) ||
    text(record.recall_initiation_date) ||
    text(record.recallinitiationdt) ||
    text(record.published_at)

  return {
    sourceKey: 'fda_recalls',
    externalId: recallNumber || text(record.id) || text(record.url),
    title: text(record.title) || productDescription,
    summary: text(record.summary) || reason,
    url:
      text(record.url) ||
      text(record.more_code_info) ||
      text(record.press_release_url) ||
      text(record.pressreleaseurl) ||
      'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
    publishedAt: normalizeFdaDate(publishedAt) || new Date().toISOString(),
    updatedAt: text(record.updated_at) || null,
    status: text(record.status),
    category: 'safety',
    tags: [
      text(record.classification),
      text(record.reason),
      text(record.product_type) || text(record.producttypeshort),
      'recall',
    ].filter(Boolean),
    affectedEntities: {
      product: productDescription,
      reason,
      distribution: text(record.distribution_pattern) || text(record.distributionareasummarytxt),
    },
    rawPayload: record,
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeFdaDate(value: string): string {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
  }
  return value
}
