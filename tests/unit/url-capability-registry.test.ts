import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildUrlCapabilityConfidenceStrip,
  buildUrlCapabilityXrayReport,
  getUrlCapabilityPaletteItems,
  listUrlCapabilityContracts,
  resolveUrlCapability,
} from '@/lib/navigation/url-capability-registry'

describe('URL capability registry', () => {
  it('resolves exact and dynamic chef routes', () => {
    assert.equal(resolveUrlCapability('/dashboard', 'chef')?.routePattern, '/dashboard')
    assert.equal(resolveUrlCapability('/features', 'chef')?.routePattern, '/features')
    assert.equal(
      resolveUrlCapability('/onboarding/features', 'chef')?.routePattern,
      '/onboarding/features'
    )
    assert.equal(
      resolveUrlCapability('/clients/contribution?view=missing', 'chef')?.routePattern,
      '/clients/contribution'
    )
    assert.equal(resolveUrlCapability('/events/evt_123', 'chef')?.routePattern, '/events/[id]')
    assert.equal(
      resolveUrlCapability('/clients/client_123?tab=history', 'chef')?.routePattern,
      '/clients/[id]'
    )
  })

  it('filters contracts by role', () => {
    assert.equal(resolveUrlCapability('/dashboard', 'client'), null)
  })

  it('reports covered and missing route capability state for Page X-Ray', () => {
    const covered = buildUrlCapabilityXrayReport('/dashboard', 'chef')
    assert.equal(covered.status, 'covered')
    assert.equal(covered.routePolicy.aligned, true)
    assert.equal(covered.contract?.primaryAction.label, 'Resolve next')

    const missing = buildUrlCapabilityXrayReport('/unknown-url-rail-test', 'chef')
    assert.equal(missing.status, 'missing_contract')
    assert.equal(missing.actionCompleteness, 'missing')
    assert.ok(missing.missing.includes('capability contract'))
  })

  it('builds confidence strips with proof and sensitivity state', () => {
    const strip = buildUrlCapabilityConfidenceStrip('/events/evt_123', 'chef')
    assert.equal(strip.display, 'show')
    assert.equal(strip.permissionState, 'allowed')
    assert.equal(strip.sensitivityWarning, true)
    assert.ok(strip.proofLinks.length > 0)
  })

  it('feeds current URL actions to command surfaces', () => {
    const items = getUrlCapabilityPaletteItems('/dashboard', 'chef')
    assert.ok(items.length >= 6)
    assert.equal(items[0]?.tone, 'primary')
    assert.equal(
      items.every((item) => item.href),
      true
    )
  })

  it('keeps all-features escape hatch available after redirect target renders', () => {
    const features = getUrlCapabilityPaletteItems('/onboarding/features', 'chef')
    assert.equal(features[0]?.label, 'Show all features')
    assert.equal(features[0]?.href, '/features')
    assert.ok(features.some((item) => item.href === '/settings/navigation'))

    const report = buildUrlCapabilityXrayReport('/onboarding/features', 'chef')
    assert.equal(report.status, 'covered')
    assert.equal(report.routePolicy.aligned, true)
  })

  it('keeps priority contracts non-empty', () => {
    const contracts = listUrlCapabilityContracts()
    assert.ok(contracts.length >= 8)
    assert.equal(
      contracts.every((contract) => contract.primaryAction.label.length > 0),
      true
    )
  })
})
