import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  METRIC_DEFINITIONS,
  assertMetricIdsUnique,
  findMetricsBySurface,
  getMetricCoverageSummary,
  getMetricDefinition,
  isMetricStale,
  listMetricDefinitions,
} from '../../lib/analytics/metric-registry'

describe('metric registry', () => {
  it('has unique ids and enough coverage for the chef portal analytics surface', () => {
    assert.doesNotThrow(() => assertMetricIdsUnique())
    assert.ok(METRIC_DEFINITIONS.length >= 25)
  })

  it('defines source, scope, surface, and failure behavior for every metric', () => {
    for (const metric of METRIC_DEFINITIONS) {
      assert.ok(metric.id.includes('.'), `metric id should be namespaced: ${metric.id}`)
      assert.ok(metric.label.length > 0, `missing label: ${metric.id}`)
      assert.ok(metric.description.length > 0, `missing description: ${metric.id}`)
      assert.ok(metric.sourceAction.length > 0, `missing source action: ${metric.id}`)
      assert.ok(metric.sourceTables.length > 0, `missing source tables: ${metric.id}`)
      assert.ok(metric.surfaces.length > 0, `missing surfaces: ${metric.id}`)
      assert.ok(metric.freshnessSlaMinutes > 0, `invalid freshness SLA: ${metric.id}`)
      assert.equal(metric.failureMode, 'error_state_not_zero')
      assert.ok(
        metric.tenantScope === 'tenant_id' ||
          metric.tenantScope === 'chef_id' ||
          metric.tenantScope === 'derived_from_tenant',
        `invalid tenant scope: ${metric.id}`
      )
    }
  })

  it('finds metrics by id, domain, and surface', () => {
    assert.equal(getMetricDefinition('culinary.ingredient_usage')?.label, 'Ingredient Usage')
    assert.equal(getMetricDefinition('missing.metric'), null)

    const culinaryMetrics = listMetricDefinitions({ domain: 'culinary' })
    assert.ok(culinaryMetrics.length >= 5)
    assert.ok(culinaryMetrics.every((metric) => metric.domain === 'culinary'))

    const insightMetrics = findMetricsBySurface('/insights')
    assert.ok(insightMetrics.some((metric) => metric.id === 'culinary.ingredient_usage'))
    assert.ok(insightMetrics.every((metric) => metric.surfaces.includes('/insights')))
  })

  it('computes coverage summary from the registry', () => {
    const summary = getMetricCoverageSummary()

    assert.equal(summary.total, METRIC_DEFINITIONS.length)
    assert.ok(summary.domains >= 7)
    assert.ok(summary.surfaces.includes('/insights'))
    assert.ok(summary.surfaces.includes('remy_context'))
    assert.ok(summary.rollupCounts.live > 0)
    assert.ok(summary.rollupCounts.daily > 0)
    assert.ok(summary.maxFreshnessSlaMinutes >= 1440)
  })

  it('detects stale and invalid metric computation timestamps', () => {
    const now = new Date('2026-04-28T12:00:00.000Z')

    assert.equal(isMetricStale(null, 60, now), true)
    assert.equal(isMetricStale('not-a-date', 60, now), true)
    assert.equal(isMetricStale('2026-04-28T11:30:00.000Z', 60, now), false)
    assert.equal(isMetricStale('2026-04-28T10:30:00.000Z', 60, now), true)
  })
})
