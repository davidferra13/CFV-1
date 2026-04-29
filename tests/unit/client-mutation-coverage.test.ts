import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  getClientMutationCoverage,
  getClientMutationCoverageGaps,
  getClientMutationPathContract,
} from '@/lib/clients/client-mutation-coverage'

describe('client mutation coverage', () => {
  it('registers every major client fact mutation path with implementation files', () => {
    const coverage = getClientMutationCoverage()
    const pathKeys = coverage.map((entry) => entry.path.key)

    assert.deepEqual(pathKeys, [
      'client_self_service_profile',
      'chef_client_profile',
      'public_booking_intake',
      'client_intake_form',
      'dietary_dashboard',
    ])
    for (const entry of coverage) {
      assert.ok(entry.path.fields.length > 0)
      assert.ok(entry.path.implementationFiles.length > 0)
      assert.equal(entry.missingRequiredTargets.length, 0)
    }
  })

  it('keeps self-service profile coverage aligned to active events and menu safety', () => {
    const coverage = getClientMutationCoverage().find(
      (entry) => entry.path.key === 'client_self_service_profile'
    )

    assert.ok(coverage)
    assert.ok(coverage.path.fields.includes('allergies'))
    assert.ok(coverage.path.fields.includes('address'))
    assert.ok(coverage.requiredTargets.includes('active_events'))
    assert.ok(coverage.requiredTargets.includes('menu_safety'))
    assert.ok(coverage.implementedTargets.includes('remy_context_cache'))
    assert.equal(coverage.summary.safetyCriticalFieldCount >= 4, true)
  })

  it('points mutation contracts at real implementation files', () => {
    for (const entry of getClientMutationCoverage()) {
      for (const file of entry.path.implementationFiles) {
        const source = readFileSync(file, 'utf8')
        assert.ok(source.length > 0, `Expected ${file} to exist and contain source`)
      }
    }
  })

  it('describes the public booking intake as profile plus event creation coverage', () => {
    const contract = getClientMutationPathContract('public_booking_intake')

    assert.equal(contract.actor, 'client')
    assert.equal(contract.trigger, 'booking_intake')
    assert.ok(contract.fields.includes('address'))
    assert.ok(contract.fields.includes('dietary_restrictions'))
    assert.ok(contract.implementedTargets.includes('active_events'))
  })

  it('reports no required-target gaps for registered mutation paths', () => {
    assert.deepEqual(getClientMutationCoverageGaps(), [])
  })
})
