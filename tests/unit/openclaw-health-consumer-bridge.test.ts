import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('/api/openclaw/status carries canonical health without dropping legacy fields', () => {
  const route = source('app/api/openclaw/status/route.ts')

  assert.ok(
    route.includes('getOpenClawHealthContract'),
    '/api/openclaw/status must import getOpenClawHealthContract'
  )
  assert.ok(
    route.includes('getOpenClawRuntimeHealth'),
    '/api/openclaw/status must keep getOpenClawRuntimeHealth'
  )
  assert.match(
    route,
    /NextResponse\.json\(\{\s*canonical:\s*canonical,/s,
    '/api/openclaw/status must include top-level canonical'
  )
  assert.ok(route.includes('sync: {'), '/api/openclaw/status must keep legacy sync field')
  assert.ok(route.includes('health: {'), '/api/openclaw/status must keep legacy health field')
  assert.ok(
    route.includes('canonical_overall: canonical.overall'),
    '/api/openclaw/status health must expose canonical_overall'
  )
  assert.ok(
    route.includes('canonical_contradictions: canonical.contradictions.length'),
    '/api/openclaw/status health must expose canonical_contradictions'
  )
})

test('/api/sentinel/sync-status carries canonical health without dropping legacy fields', () => {
  const route = source('app/api/sentinel/sync-status/route.ts')

  assert.ok(
    route.includes('getOpenClawHealthContract'),
    '/api/sentinel/sync-status must import getOpenClawHealthContract'
  )
  assert.ok(
    route.includes('getOpenClawRuntimeHealth'),
    '/api/sentinel/sync-status must keep getOpenClawRuntimeHealth'
  )

  for (const field of [
    'canonical',
    'canonicalStatus',
    'canonicalContradictions',
    'status',
    'overall',
    'bridge',
    'mirror',
    'pi',
    'wrapper',
  ]) {
    assert.match(
      route,
      new RegExp(`\\b${field}:`),
      `/api/sentinel/sync-status must include ${field}`
    )
  }
})
