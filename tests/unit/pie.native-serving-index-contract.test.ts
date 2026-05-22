import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  NATIVE_SERVING_INDEX_FIXTURES,
  evaluateNativeServingIndexRequest,
  getNativeServingIndexContractReport,
  makeNativeServingIndexKey,
} from '../../lib/pricing/pie-native-serving-index-contract.js'

describe('PIE native serving index read model contract', () => {
  it('keys every precomputed serving cell by identity, region, unit basis, and freshness bucket', () => {
    const key = makeNativeServingIndexKey({
      canonicalIdentityId: 'plant.tomato.fruit.fresh',
      pricingRegion: 'us-ca-los-angeles',
      unitBasis: 'lb',
      freshnessBucket: 'fresh_7d',
    })

    assert.equal(key, 'plant.tomato.fruit.fresh::us-ca-los-angeles::lb::fresh_7d')

    const report = getNativeServingIndexContractReport()
    assert.deepEqual(report.keyParts, [
      'canonicalIdentityId',
      'pricingRegion',
      'unitBasis',
      'freshnessBucket',
    ])
    assert.equal(report.missingFixtureScenarios.length, 0)
  })

  it('serves native truth instantly only when the cell carries proof, confidence, lineage, and repair state', () => {
    const direct = evaluateNativeServingIndexRequest(
      NATIVE_SERVING_INDEX_FIXTURES.find((fixture) => fixture.id === 'direct-native-truth')!
    )

    assert.equal(direct.finalCostingState, 'allowed')
    assert.equal(direct.reliability, 'direct_proof')
    assert.equal(direct.visibleLabel, 'Native price truth')
    assert.equal(direct.canServeDuringExternalOutage, true)
    assert.equal(direct.requiresTenantOrUserData, false)
    assert.deepEqual(direct.blockers, [])
  })

  it('degrades stale, missing, anomalous, and repair-estimate cells with visible repair actions', () => {
    const stale = evaluateNativeServingIndexRequest(
      NATIVE_SERVING_INDEX_FIXTURES.find((fixture) => fixture.id === 'stale-but-servable')!
    )
    assert.equal(stale.finalCostingState, 'allowed_with_estimate')
    assert.equal(stale.reliability, 'estimate_labeled')
    assert.ok(stale.degradedLabels.includes('Stale native price'))
    assert.ok(stale.repairActions.includes('refresh_native_observation'))

    const missing = evaluateNativeServingIndexRequest(
      NATIVE_SERVING_INDEX_FIXTURES.find((fixture) => fixture.id === 'missing-regional-cell')!
    )
    assert.equal(missing.finalCostingState, 'review_required')
    assert.ok(missing.degradedLabels.includes('Regional price missing'))
    assert.ok(missing.repairActions.includes('seed_regional_cell'))

    const repair = evaluateNativeServingIndexRequest(
      NATIVE_SERVING_INDEX_FIXTURES.find((fixture) => fixture.id === 'repair-estimate')!
    )
    assert.equal(repair.finalCostingState, 'allowed_with_estimate')
    assert.equal(repair.visibleLabel, 'Native repair estimate')
    assert.ok(repair.degradedLabels.includes('Repair estimate'))
    assert.ok(repair.repairActions.includes('validate_repair_estimate'))
  })

  it('blocks external API, request-time crawl, and user-submitted market price serving modes', () => {
    const external = evaluateNativeServingIndexRequest(
      NATIVE_SERVING_INDEX_FIXTURES.find((fixture) => fixture.id === 'external-dependency-blocked')!
    )
    assert.equal(external.finalCostingState, 'blocked')
    assert.ok(external.blockers.includes('external API fetch is not native serving'))
    assert.equal(external.canServeDuringExternalOutage, false)

    const userPrice = evaluateNativeServingIndexRequest(
      NATIVE_SERVING_INDEX_FIXTURES.find((fixture) => fixture.id === 'user-price-blocked')!
    )
    assert.equal(userPrice.finalCostingState, 'blocked')
    assert.ok(userPrice.blockers.includes('user-submitted price cannot become market truth'))
    assert.equal(userPrice.requiresTenantOrUserData, true)
  })

  it('ships the mandatory fixture coverage for the read model gate', () => {
    const report = getNativeServingIndexContractReport()

    assert.equal(report.fixtureCount, 6)
    assert.equal(report.missingFixtureScenarios.length, 0)
    assert.deepEqual(report.blockedServingModes.sort(), [
      'external_api_fetch',
      'request_time_crawl',
      'user_supplied_market_price',
    ])

    for (const fixture of NATIVE_SERVING_INDEX_FIXTURES) {
      assert.ok(fixture.cell.provenance.nativeObservationId, `${fixture.id} needs provenance`)
      assert.ok(fixture.cell.observedAt, `${fixture.id} needs observedAt`)
      assert.ok(fixture.cell.computedAt, `${fixture.id} needs computedAt`)
      assert.ok(fixture.cell.confidence.bucket, `${fixture.id} needs confidence bucket`)
      assert.ok(fixture.cell.uncertainty, `${fixture.id} needs uncertainty`)
      assert.ok(fixture.cell.sourceLineage.length > 0, `${fixture.id} needs source lineage`)
      assert.ok(fixture.cell.repair.status, `${fixture.id} needs repair status`)
    }
  })
})
