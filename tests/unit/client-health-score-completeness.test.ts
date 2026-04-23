import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  getClientProfileCompleteness,
  getClientProfileEngagementPoints,
} from '@/lib/clients/completeness'

test('profile engagement points scale directly from the canonical completeness contract', () => {
  const sparseProfile = {
    allergies: ['tree nuts'],
    dietary_restrictions: ['gluten_free'],
  }

  const richerProfile = {
    ...sparseProfile,
    address: '123 Main St',
    birthday: '1990-05-03',
    preferred_service_style: 'family-style',
    favorite_cuisines: ['Italian'],
    dislikes: ['cilantro'],
    pets: [{ name: 'Pepper' }],
  }

  const sparseCompleteness = getClientProfileCompleteness(sparseProfile)
  const richerCompleteness = getClientProfileCompleteness(richerProfile)

  assert.ok(richerCompleteness.score > sparseCompleteness.score)
  assert.ok(
    getClientProfileEngagementPoints(richerProfile, 15) >
      getClientProfileEngagementPoints(sparseProfile, 15)
  )
  assert.equal(
    getClientProfileEngagementPoints(richerProfile, 15),
    Math.round((richerCompleteness.score / 100) * 15)
  )
})

test('health score delegates profile engagement scoring to completeness helpers', () => {
  const source = readFileSync(join(process.cwd(), 'lib/clients/health-score.ts'), 'utf8')

  assert.match(source, /getClientProfileEngagementPoints/)
  assert.match(source, /CLIENT_PROFILE_COMPLETENESS_FIELDS/)
  assert.doesNotMatch(source, /if \(client\.allergies\) engagementScore \+= 4/)
  assert.doesNotMatch(source, /if \(client\.dietary_restrictions\) engagementScore \+= 3/)
  assert.doesNotMatch(source, /if \(client\.kitchen_constraints\) engagementScore \+= 3/)
  assert.doesNotMatch(source, /if \(client\.what_they_care_about\) engagementScore \+= 3/)
  assert.doesNotMatch(source, /if \(client\.personal_milestones\) engagementScore \+= 2/)
})
