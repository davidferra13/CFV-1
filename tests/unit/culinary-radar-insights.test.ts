import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { buildRadarInsightSummary } = require('../../lib/culinary-radar/insights.ts')

function match(overrides: Record<string, unknown>) {
  return {
    id: String(overrides.id),
    itemId: `${overrides.id}_item`,
    relevanceScore: overrides.relevanceScore ?? 70,
    severity: overrides.severity ?? 'low',
    deliveryState: 'unread',
    matchReasons: [],
    matchedEntities: [],
    recommendedActions: [],
    createdAt: overrides.createdAt ?? '2026-04-30T12:00:00Z',
    readAt: null,
    dismissedAt: null,
    item: {
      title: overrides.title ?? 'Radar item',
      summary: null,
      canonicalUrl: 'https://example.com',
      sourcePublishedAt: '2026-04-30T12:00:00Z',
      category: overrides.category,
      status: 'active',
      sourceName: overrides.sourceName ?? 'Source',
      credibilityTier: 'official',
    },
  }
}

test('buildRadarInsightSummary groups matches into action lanes', () => {
  const summary = buildRadarInsightSummary({
    success: true,
    matches: [
      match({ id: 'safety', category: 'safety', severity: 'critical' }),
      match({ id: 'local', category: 'local', title: 'Farmers market directory' }),
      match({ id: 'opportunity', category: 'opportunity' }),
      match({ id: 'sustainability', category: 'sustainability' }),
    ],
    sources: [],
  })

  assert.deepEqual(
    summary.lanes.map((lane: { key: string; matches: unknown[] }) => [lane.key, lane.matches.length]),
    [
      ['safety_impact', 1],
      ['local_sourcing', 1],
      ['opportunity_inbox', 1],
      ['sustainability_brief', 1],
    ]
  )
})

test('buildRadarInsightSummary labels source freshness without claiming all-clear', () => {
  const now = new Date().toISOString()
  const stale = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const summary = buildRadarInsightSummary({
    success: true,
    matches: [],
    sources: [
      {
        id: 'fresh',
        key: 'fresh',
        name: 'Fresh source',
        homepageUrl: 'https://example.com/fresh',
        sourceType: 'page',
        credibilityTier: 'official',
        defaultCategory: 'local',
        active: true,
        lastCheckedAt: now,
        lastSuccessAt: now,
        lastError: null,
      },
      {
        id: 'stale',
        key: 'stale',
        name: 'Stale source',
        homepageUrl: 'https://example.com/stale',
        sourceType: 'page',
        credibilityTier: 'official',
        defaultCategory: 'local',
        active: true,
        lastCheckedAt: stale,
        lastSuccessAt: stale,
        lastError: null,
      },
      {
        id: 'error',
        key: 'error',
        name: 'Error source',
        homepageUrl: 'https://example.com/error',
        sourceType: 'page',
        credibilityTier: 'official',
        defaultCategory: 'safety',
        active: true,
        lastCheckedAt: now,
        lastSuccessAt: null,
        lastError: 'timeout',
      },
    ],
  })

  assert.equal(summary.trustedSourceCount, 1)
  assert.equal(summary.staleSourceCount, 1)
  assert.equal(summary.degradedSourceCount, 1)
})
