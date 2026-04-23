import test from 'node:test'
import assert from 'node:assert/strict'
import {
  attachDerivedOutputProvenance,
  createDerivedOutputProvenance,
  deriveProvenance,
} from '@/lib/analytics/source-provenance'
import { PUBLIC_INTAKE_LANE_KEYS } from '@/lib/public/intake-lane-config'

test('deriveProvenance preserves the existing inquiry lane precedence', () => {
  const provenance = deriveProvenance({
    channel: 'website',
    event_booking_source: 'instant_book',
    unknown_fields: { open_booking: true },
  })

  assert.deepEqual(provenance, {
    key: 'open_booking',
    label: 'Open Booking',
  })
})

test('deriveProvenance prefers the explicit submission source lane when present', () => {
  const provenance = deriveProvenance({
    channel: 'website',
    unknown_fields: {
      submission_source: PUBLIC_INTAKE_LANE_KEYS.open_booking,
      open_booking: true,
    },
  })

  assert.deepEqual(provenance, {
    key: 'open_booking',
    label: 'Open Booking',
  })
})

test('deriveProvenance maps website inquiries to the direct single-chef lane by default', () => {
  const provenance = deriveProvenance({
    channel: 'website',
    unknown_fields: {},
  })

  assert.deepEqual(provenance, {
    key: PUBLIC_INTAKE_LANE_KEYS.public_profile_inquiry,
    label: 'Profile Inquiry',
  })
})

test('createDerivedOutputProvenance builds freshness and runtime metadata', () => {
  const provenance = createDerivedOutputProvenance({
    asOf: '2026-04-21T11:30:00.000Z',
    derivationMethod: 'ai-assisted',
    derivationSource: 'parseWithOllama',
    freshnessWindowMs: 45 * 60 * 1000,
    generatedAt: '2026-04-21T12:00:00.000Z',
    inputs: [
      { kind: 'event', id: 'evt-1', label: 'Spring Dinner' },
      { kind: 'client', id: 'client-1', label: 'Alex Rivera' },
    ],
    model: {
      endpointName: 'local',
      executionLocation: 'local',
      mode: 'local',
      model: 'gemma4',
      modelTier: 'standard',
      provider: 'ollama',
      taskType: 'contract.generation',
    },
    moduleId: 'tests/unit/source-provenance.test.ts',
  })

  assert.equal(provenance.contractVersion, 'derived-output.v1')
  assert.equal(provenance.derivationMethod, 'ai-assisted')
  assert.equal(provenance.freshness.asOf, '2026-04-21T11:30:00.000Z')
  assert.equal(provenance.freshness.ageSeconds, 1800)
  assert.equal(provenance.freshness.windowSeconds, 2700)
  assert.equal(provenance.freshness.status, 'fresh')
  assert.equal(provenance.model?.provider, 'ollama')
  assert.equal(provenance.inputs.length, 2)
  assert.equal(provenance.inputs[0]?.kind, 'event')
  assert.ok(provenance.runtime.environment)
})

test('attachDerivedOutputProvenance decorates an output object with shared metadata', () => {
  const result = attachDerivedOutputProvenance(
    {
      generatedAt: '2026-04-21T12:00:00.000Z',
      title: 'Draft contract',
    },
    {
      derivationMethod: 'deterministic',
      derivationSource: 'generateContractTemplate',
      inputs: [{ kind: 'template', label: 'contract' }],
      moduleId: 'tests/unit/source-provenance.test.ts',
    }
  )

  assert.equal(result.title, 'Draft contract')
  assert.equal(result.provenance.derivationMethod, 'deterministic')
  assert.equal(result.provenance.inputs[0]?.kind, 'template')
})
