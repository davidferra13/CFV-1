import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDerivedOutputObservabilityMetadata,
  buildPlatformObservabilityMetadata,
  extractRequestMetadata,
  summarizeDerivedOutputProvenance,
} from '@/lib/platform-observability/context'
import { createDerivedOutputProvenance } from '@/lib/analytics/source-provenance'

function makeHeaders(values: Record<string, string>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null
    },
  }
}

test('extractRequestMetadata captures request correlation fields', () => {
  const metadata = extractRequestMetadata(
    makeHeaders({
      'x-request-id': 'req-123',
      traceparent: '00-abcdef-123456-01',
      'x-pathname': '/chef/quotes/123',
      'x-forwarded-host': 'app.cheflowhq.com',
      'x-forwarded-proto': 'https',
      'x-forwarded-for': '203.0.113.42',
      'user-agent': 'Mozilla/5.0',
    })
  )

  assert.equal(metadata.request_id, 'req-123')
  assert.equal(metadata.traceparent, '00-abcdef-123456-01')
  assert.equal(metadata.request_path, '/chef/quotes/123')
  assert.equal(metadata.request_host, 'app.cheflowhq.com')
  assert.equal(metadata.request_proto, 'https')
  assert.equal(metadata.request_ip_hint, '203.0.113.x')
  assert.equal(metadata.user_agent, 'Mozilla/5.0')
})

test('buildPlatformObservabilityMetadata merges runtime metadata with request metadata', () => {
  const metadata = buildPlatformObservabilityMetadata(
    { custom_flag: true },
    makeHeaders({
      'x-request-id': 'req-456',
    })
  )

  assert.equal(metadata.request_id, 'req-456')
  assert.equal(metadata.custom_flag, true)
  assert.ok('environment' in metadata)
  assert.ok('build_id' in metadata)
})

test('derived output observability metadata carries shared provenance fields', () => {
  const provenance = createDerivedOutputProvenance({
    asOf: '2026-04-21T11:30:00.000Z',
    derivationMethod: 'hybrid',
    derivationSource: 'unit-test',
    freshnessWindowMs: 60 * 60 * 1000,
    generatedAt: '2026-04-21T12:00:00.000Z',
    inputs: [
      { kind: 'report', id: '2026-04-21', label: 'daily-report' },
      { kind: 'chef', id: 'chef-1', label: 'Chef One' },
    ],
    model: {
      endpointName: 'local',
      executionLocation: 'local',
      mode: 'local',
      model: 'gemma4',
      modelTier: 'fast',
      provider: 'ollama',
      taskType: 'daily-report.narrative',
    },
    moduleId: 'tests/unit/platform-observability-context.test.ts',
  })

  const summary = summarizeDerivedOutputProvenance(provenance)
  const metadata = buildDerivedOutputObservabilityMetadata(provenance, {
    delivery_channel: 'email',
  })

  assert.equal(summary.contract_version, 'derived-output.v1')
  assert.equal(summary.derivation_method, 'hybrid')
  assert.equal(summary.freshness_status, 'fresh')
  assert.equal(summary.source_count, 2)
  assert.equal(summary.model_provider, 'ollama')
  assert.deepEqual(summary.source_kinds, ['report', 'chef'])
  assert.deepEqual(metadata.derived_output, summary)
  assert.equal(metadata.delivery_channel, 'email')
  assert.ok('environment' in metadata)
})
