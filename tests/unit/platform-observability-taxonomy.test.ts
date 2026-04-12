import test from 'node:test'
import assert from 'node:assert/strict'
import { ACTIVITY_EVENT_TYPES } from '@/lib/activity/types'
import {
  ACTIVITY_EVENT_TO_PLATFORM_EVENT,
  PLATFORM_OBSERVABILITY_DIGEST_CONFIG,
  PLATFORM_OBSERVABILITY_TAXONOMY,
} from '@/lib/platform-observability/taxonomy'

test('platform observability taxonomy entries have valid routing', () => {
  for (const [eventKey, definition] of Object.entries(PLATFORM_OBSERVABILITY_TAXONOMY)) {
    assert.ok(definition.label, `${eventKey} is missing a label`)
    assert.ok(definition.description, `${eventKey} is missing a description`)
    assert.match(definition.severity, /^(info|important|critical)$/)
    assert.match(definition.scope, /^(public|private|system)$/)
    assert.match(definition.group, /^(account|subscription|auth|feature|input|conversion|system)$/)
    assert.match(
      definition.digestSection,
      /^(growth|subscriptions|auth|engagement|conversion|system)$/
    )
    assert.equal(
      definition.realtimeAlert || definition.dailyDigest,
      true,
      `${eventKey} must route to at least one channel`
    )
    assert.ok(
      definition.alertDedupMinutes >= 0,
      `${eventKey} must have a non-negative dedupe window`
    )
  }
})

test('activity event taxonomy covers all tracked activity events', () => {
  assert.deepEqual(
    Object.keys(ACTIVITY_EVENT_TO_PLATFORM_EVENT).sort(),
    [...ACTIVITY_EVENT_TYPES].sort()
  )
})

test('platform observability digest defaults to daily cadence', () => {
  assert.equal(PLATFORM_OBSERVABILITY_DIGEST_CONFIG.cadence, 'daily')
  assert.equal(PLATFORM_OBSERVABILITY_DIGEST_CONFIG.windowHours, 24)
  assert.equal(PLATFORM_OBSERVABILITY_DIGEST_CONFIG.timezone, 'America/New_York')
})
