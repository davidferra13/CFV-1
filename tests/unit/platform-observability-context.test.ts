import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPlatformObservabilityMetadata,
  extractRequestMetadata,
} from '@/lib/platform-observability/context'

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
