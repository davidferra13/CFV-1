import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PUBLIC_INTAKE_LANE_CONFIG,
  PUBLIC_INTAKE_LANE_KEYS,
  getPublicIntakeLaneLabel,
  isPublicIntakeLaneKey,
  withSubmissionSource,
} from '@/lib/public/intake-lane-config'

test('public intake lane config exposes the canonical lane keys', () => {
  assert.deepEqual(Object.keys(PUBLIC_INTAKE_LANE_CONFIG), [
    PUBLIC_INTAKE_LANE_KEYS.open_booking,
    PUBLIC_INTAKE_LANE_KEYS.public_profile_inquiry,
    PUBLIC_INTAKE_LANE_KEYS.embed_inquiry,
    PUBLIC_INTAKE_LANE_KEYS.kiosk_inquiry,
    PUBLIC_INTAKE_LANE_KEYS.wix_form,
    PUBLIC_INTAKE_LANE_KEYS.instant_book,
  ])
})

test('lane helpers validate keys and labels without duplicating strings', () => {
  assert.equal(isPublicIntakeLaneKey(PUBLIC_INTAKE_LANE_KEYS.public_profile_inquiry), true)
  assert.equal(isPublicIntakeLaneKey('phone'), false)
  assert.equal(getPublicIntakeLaneLabel(PUBLIC_INTAKE_LANE_KEYS.instant_book), 'Instant Book')
})

test('withSubmissionSource stamps the canonical lane key without dropping other fields', () => {
  const fields = withSubmissionSource(PUBLIC_INTAKE_LANE_KEYS.embed_inquiry, {
    embed_source: true,
    utm_source: 'partner-site',
  })

  assert.deepEqual(fields, {
    embed_source: true,
    utm_source: 'partner-site',
    submission_source: PUBLIC_INTAKE_LANE_KEYS.embed_inquiry,
  })
})
