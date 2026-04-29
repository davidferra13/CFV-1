import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  BUILD_CAPABILITY_REGISTRY,
  findBuildCapabilitiesByCategory,
  findBuildCapabilitiesByQuery,
  getBuildCapability,
  getBuildCapabilityCoverageSummary,
} from '../../lib/build-queue/capability-registry'

describe('build capability registry', () => {
  it('captures the current first-pass build queue', () => {
    const queueFileCount = fs
      .readdirSync('system/build-queue')
      .filter((name) => name.endsWith('.md')).length

    assert.equal(BUILD_CAPABILITY_REGISTRY.length, queueFileCount)

    const ids = new Set(BUILD_CAPABILITY_REGISTRY.map((item) => item.id))
    assert.equal(ids.size, BUILD_CAPABILITY_REGISTRY.length)
  })

  it('keeps every capability traceable to its queue item and first-pass scope', () => {
    for (const item of BUILD_CAPABILITY_REGISTRY) {
      assert.ok(item.id.length > 0, 'missing id')
      assert.ok(item.title.length > 0, `missing title: ${item.id}`)
      assert.ok(item.category.length > 0, `missing category: ${item.id}`)
      assert.ok(item.source.length > 0, `missing source: ${item.id}`)
      assert.match(item.queuePath, /^system\/build-queue\/\d{3}-.+\.md$/)
      assert.ok(item.firstPassScope.includes('First-pass build registry entry'))
      assert.ok(['high', 'medium', 'low'].includes(item.priority))
    }
  })

  it('supports lookup by id, category, and query', () => {
    assert.equal(
      getBuildCapability('001-high-asset-inventory-tracking')?.title,
      'Asset/Inventory Tracking:'
    )
    assert.equal(getBuildCapability('missing-capability'), null)

    const paymentFinancial = findBuildCapabilitiesByCategory('payment-financial')
    assert.ok(paymentFinancial.some((item) => item.id === '031-medium-billing-tracking'))

    const mobileSite = findBuildCapabilitiesByQuery('mobile site profile')
    assert.ok(mobileSite.some((item) => item.id === '068-high-develop-mobile-site-profile'))
  })

  it('summarizes first-pass coverage without silent zeros', () => {
    const summary = getBuildCapabilityCoverageSummary()

    assert.equal(summary.total, BUILD_CAPABILITY_REGISTRY.length)
    assert.ok(summary.categories.includes('payment-financial'))
    assert.ok(summary.priorityCounts.high > 0)
    assert.ok(summary.priorityCounts.medium > 0)
    assert.ok(summary.priorityCounts.low > 0)
    assert.equal(
      summary.withAffectedFiles + summary.missingAffectedFiles,
      BUILD_CAPABILITY_REGISTRY.length
    )
  })
})
