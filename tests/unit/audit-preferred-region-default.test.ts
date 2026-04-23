import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPreferredRegionAuditSummary,
  classifyRow,
  parseAuditOptions,
  renderPreferredRegionAuditText,
  type AuditRow,
} from '../../scripts/audit-preferred-region-default'

function createAuditRow(overrides: Partial<AuditRow> = {}): AuditRow {
  return {
    id: 'chef-1',
    business_name: 'Harbor Table',
    email: 'chef@example.com',
    created_at: '2026-04-01T12:00:00.000Z',
    preferred_region: 'haverhill-ma',
    chef_city: null,
    chef_state: null,
    community_city: null,
    community_state: null,
    community_area: null,
    marketplace_city: null,
    marketplace_state: null,
    listing_city: null,
    listing_state: null,
    ...overrides,
  }
}

test('classifyRow flags rows outside the legacy market as likely inherited defaults', () => {
  const classification = classifyRow(
    createAuditRow({
      chef_city: 'Phoenix',
      chef_state: 'AZ',
    })
  )

  assert.equal(classification, 'likely_inherited_default_outside_legacy_market')
})

test('parseAuditOptions accepts explicit format, report path, and preview limit overrides', () => {
  const options = parseAuditOptions([
    '--format',
    'markdown',
    '--out',
    'reports/preferred-region-audit.md',
    '--limit',
    '7',
    '--retry-limit',
    '3',
    '--retry-delay-ms',
    '2500',
  ])

  assert.equal(options.format, 'markdown')
  assert.equal(options.outPath, 'reports/preferred-region-audit.md')
  assert.equal(options.previewLimit, 7)
  assert.equal(options.connectRetryLimit, 3)
  assert.equal(options.connectRetryDelayMs, 2500)
})

test('renderPreferredRegionAuditText groups candidates by review priority and keeps the audit read-only', () => {
  const summary = buildPreferredRegionAuditSummary(
    [
      { preferred_region: 'haverhill-ma', chef_count: '4' },
      { preferred_region: null, chef_count: '2' },
    ],
    [
      createAuditRow({
        id: 'chef-outside',
        business_name: 'Desert Dinner Co.',
        email: 'outside@example.com',
        chef_city: 'Phoenix',
        chef_state: 'AZ',
      }),
      createAuditRow({
        id: 'chef-local',
        business_name: 'North Shore Supper',
        email: 'local@example.com',
        community_city: 'Salem',
        community_state: 'MA',
      }),
    ]
  )

  const report = renderPreferredRegionAuditText(summary, 10)

  assert.match(report, /Preferred-region legacy default audit \(read-only\)/)
  assert.match(report, /likely_inherited_default_outside_legacy_market \(1\)/)
  assert.match(report, /legacy_default_with_local_signals \(1\)/)
  assert.match(report, /Manual review first\. If no intentional local-market dependency exists/i)
  assert.match(report, /Leave as-is unless the chef confirms a different preferred region/i)
})

test('renderPreferredRegionAuditText preserves freeform service-area hints for manual review', () => {
  const summary = buildPreferredRegionAuditSummary(
    [{ preferred_region: 'haverhill-ma', chef_count: '1' }],
    [
      createAuditRow({
        id: 'chef-area-only',
        business_name: 'Neighborhood Supper Club',
        email: 'area-only@example.com',
        community_area: 'Greater Nashville area',
      }),
    ]
  )

  const report = renderPreferredRegionAuditText(summary, 10)

  assert.match(report, /manual_review_missing_location_signals \(1\)/)
  assert.match(report, /Areas: Greater Nashville area/)
  assert.match(report, /Do not mutate automatically\. Confirm service-area intent before clearing preferred_region\./)
})
