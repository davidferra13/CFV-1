import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPlanningEvidenceSource,
  summarizePlanningDataQuality,
} from '@/lib/planning/contracts'

test('createPlanningEvidenceSource marks partially covered sources correctly', () => {
  const source = createPlanningEvidenceSource({
    key: 'financials',
    label: 'Financial summaries',
    asOf: '2026-04-22T12:00:00.000Z',
    recordCount: 14,
    coveragePercent: 72,
    note: 'Fallback to quoted values when a summary row is missing.',
  })

  assert.equal(source.status, 'partial')
  assert.equal(source.coveragePercent, 72)
  assert.equal(source.recordCount, 14)
})

test('summarizePlanningDataQuality escalates failures over warnings', () => {
  const summary = summarizePlanningDataQuality([
    {
      key: 'source-data-presence',
      label: 'Source data presence',
      status: 'fail',
      message: 'No source data.',
    },
    {
      key: 'history-depth',
      label: 'History depth',
      status: 'warn',
      message: 'Limited history.',
    },
  ])

  assert.equal(summary.overallStatus, 'fail')
  assert.equal(summary.failureCount, 1)
  assert.equal(summary.warningCount, 1)
})
