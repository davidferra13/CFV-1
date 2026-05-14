import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyDiscoveryFreshness } from '@/lib/discovery/data-freshness'
import {
  buildExternalMenuReadModel,
  evaluateDiscoveryCoverageGates,
  isPublicDiscoverySuppressed,
  scoreDiscoverySourceConfidence,
} from '@/lib/discovery/source-governance'

test('source confidence ranks claimed/direct data over inferred public data', () => {
  const freshness = classifyDiscoveryFreshness({
    dataClass: 'operator_status',
    checkedAt: '2026-05-13T08:00:00.000Z',
    currentAt: '2026-05-13T12:00:00.000Z',
  })

  const claimed = scoreDiscoverySourceConfidence({
    sourceType: 'chef_flow_claimed',
    field: 'operator_identity',
    freshness,
  })
  const inferredOsm = scoreDiscoverySourceConfidence({
    sourceType: 'open_street_map',
    field: 'cuisine_tags',
    freshness,
    inferred: true,
  })

  assert.equal(claimed.tier, 'high')
  assert.equal(claimed.canSupportStrongClaim, true)
  assert.equal(inferredOsm.canSupportStrongClaim, false)
  assert.ok(claimed.score > inferredOsm.score)
})

test('removal and quarantine states suppress public discovery', () => {
  assert.equal(isPublicDiscoverySuppressed({ removalState: 'opted_out' }), true)
  assert.equal(isPublicDiscoverySuppressed({ removalState: 'disputed' }), true)
  assert.equal(isPublicDiscoverySuppressed({ moderationState: 'quarantined' }), true)
  assert.equal(
    isPublicDiscoverySuppressed({ removalState: 'none', moderationState: 'clear' }),
    false
  )
})

test('external menu read model separates link-only, stale, claimed, and suppressed states', () => {
  const currentAt = '2026-05-13T12:00:00.000Z'
  const linkOnly = buildExternalMenuReadModel({
    sourceType: 'menu_platform',
    sourceUrl: 'https://menus.example.com/pasta-house',
    capturedAt: '2026-05-13T08:00:00.000Z',
    currentAt,
    extractionStatus: 'link_only',
    hasAttribution: true,
  })
  const stale = buildExternalMenuReadModel({
    sourceType: 'direct_operator_website',
    sourceUrl: 'https://pastahouse.example/menu',
    capturedAt: '2026-04-01T08:00:00.000Z',
    currentAt,
    extractionStatus: 'metadata_extracted',
    hasAttribution: true,
  })
  const claimed = buildExternalMenuReadModel({
    sourceType: 'operator_submission',
    sourceUrl: 'https://pastahouse.example/menu',
    capturedAt: '2026-05-13T08:00:00.000Z',
    currentAt,
    extractionStatus: 'metadata_extracted',
    operatorClaimed: true,
  })
  const suppressed = buildExternalMenuReadModel({
    sourceType: 'direct_operator_website',
    sourceUrl: 'https://pastahouse.example/menu',
    capturedAt: '2026-05-13T08:00:00.000Z',
    currentAt,
    extractionStatus: 'metadata_extracted',
    hasAttribution: true,
    removalState: 'removed',
  })

  assert.equal(linkOnly.status, 'link_only')
  assert.equal(linkOnly.canPowerMenuSearch, false)
  assert.equal(stale.status, 'metadata_stale')
  assert.equal(stale.canPowerMenuSearch, false)
  assert.equal(claimed.status, 'claimed_current')
  assert.equal(claimed.canPowerMenuSearch, true)
  assert.equal(suppressed.status, 'suppressed')
})

test('coverage gates block launch when representative market queries are under-backed', () => {
  const result = evaluateDiscoveryCoverageGates([
    {
      id: 'nyc-menu-sichuan',
      market: 'nyc',
      queryType: 'menu_led',
      freshResultCount: 8,
      totalResultCount: 24,
      requiredFreshResultCount: 10,
      missingDimensions: ['capacity'],
    },
    {
      id: 'boston-radius-dietary',
      market: 'boston',
      queryType: 'dietary',
      freshResultCount: 22,
      totalResultCount: 30,
      requiredFreshResultCount: 20,
    },
  ])

  assert.equal(result.passed, false)
  assert.deepEqual(result.blockedMetricIds, ['nyc-menu-sichuan'])
  assert.match(result.warnings.join(' '), /capacity/)
})
