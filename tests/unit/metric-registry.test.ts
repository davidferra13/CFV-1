import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  METRIC_DEFINITIONS,
  assertMetricIdsUnique,
  findMetricsBySurface,
  findMetricDefinitionsByQuery,
  formatMetricRegistryForPrompt,
  getMetricCoverageSummary,
  getMetricDefinition,
  getMetricRegistryPromptContext,
  isMetricStale,
  listMetricDefinitions,
} from '../../lib/analytics/metric-registry'
import { tryInstantAnswer } from '../../app/api/remy/stream/route-instant-answers'
import type { RemyContext } from '../../lib/ai/remy-types'

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

  it('builds a Remy-safe metric prompt context', () => {
    const context = getMetricRegistryPromptContext('remy_context')
    const prompt = formatMetricRegistryForPrompt(context)

    assert.ok(context.metrics.length > 0)
    assert.ok(context.metrics.every((metric) => metric.surfaces.includes('remy_context')))
    assert.ok(prompt.includes('METRIC TRUTH REGISTRY'))
    assert.ok(prompt.includes('Full registry is visible'))
  })

  it('finds metric definitions from natural language source questions', () => {
    const matches = findMetricDefinitionsByQuery('where does ingredient usage come from', {
      surface: 'remy_context',
    })

    assert.equal(matches[0]?.id, 'culinary.ingredient_usage')
  })

  it('lets Remy answer metric availability and source questions instantly', () => {
    const context = {
      clientCount: 0,
      upcomingEventCount: 0,
      openInquiryCount: 0,
      metricRegistry: getMetricRegistryPromptContext('remy_context'),
    } as RemyContext

    const overview = tryInstantAnswer('what stats do you track', context)
    assert.ok(overview?.text.includes('canonical metrics'))
    assert.equal(overview?.navSuggestions?.[0]?.href, '/insights')

    const source = tryInstantAnswer('where does ingredient usage come from', context)
    assert.ok(source?.text.includes('getCulinaryUsageStats'))
    assert.ok(source?.text.includes('recipe_ingredients'))
    assert.ok(source?.text.includes('never a fake zero'))
  })
})
