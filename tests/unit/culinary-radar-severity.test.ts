import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  assessRadarSeverity,
  assessRadarRelevance,
  shouldPublishRadarItem,
} = require('../../lib/culinary-radar/severity.ts')

test('assessRadarSeverity escalates recall and outbreak language by authority', () => {
  assert.equal(
    assessRadarSeverity({
      sourceAuthority: 'regulatory',
      title: 'Class I recall for undeclared peanuts',
      summary: 'Immediate health risk for allergic guests.',
      tags: ['recall', 'class i'],
      publishedAt: '2026-04-29T00:00:00Z',
    }),
    'critical'
  )

  assert.equal(
    assessRadarSeverity({
      sourceAuthority: 'relief',
      title: 'Regional kitchen volunteer update',
      summary: 'No urgent food safety concern.',
      tags: ['operations'],
      publishedAt: '2026-04-29T00:00:00Z',
    }),
    'low'
  )
})

test('assessRadarRelevance requires chef-operational signal before publishing', () => {
  const high = assessRadarRelevance({
    title: 'FDA allergen alert for catering sauce',
    summary: 'Food service operators should check inventory and menus.',
    tags: ['allergen', 'recall'],
  })
  const low = assessRadarRelevance({
    title: 'Conference keynote announced',
    summary: 'General association news for members.',
    tags: ['news'],
  })

  assert.equal(high.score, 95)
  assert.equal(high.publishable, true)
  assert.deepEqual(high.matchedSignals, ['allergen', 'catering', 'food service', 'recall'])
  assert.equal(low.score, 15)
  assert.equal(low.publishable, false)
  assert.equal(shouldPublishRadarItem(high), true)
  assert.equal(shouldPublishRadarItem(low), false)
})
