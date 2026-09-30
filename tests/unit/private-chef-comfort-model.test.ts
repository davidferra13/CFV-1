import test from 'node:test'
import assert from 'node:assert/strict'

import { getArchetype } from '@/lib/archetypes/presets'
import { getArchetypeCopy, getDashboardPrimaryAction } from '@/lib/archetypes/ui-copy'

const DAILY_DRIVERS = [
  '/dashboard',
  '/calendar',
  '/events',
  '/clients',
  '/menus',
  '/inbox',
  '/finance',
]

test('private-chef preset uses the seven daily-driver doors without duplicate messaging', () => {
  const preset = getArchetype('private-chef')
  assert.ok(preset)
  assert.deepEqual(preset.primaryNavHrefs, DAILY_DRIVERS)
  assert.equal(preset.primaryNavHrefs.includes('/chat'), false)
  assert.equal(preset.primaryNavHrefs.includes('/inquiries'), false)
})

test('private-chef event language says Dinner consistently', () => {
  assert.equal(getArchetypeCopy('private-chef').eventsLabel, 'Dinners')
  assert.equal(getArchetypeCopy('private-chef').newEventLabel, 'New Dinner')
  assert.equal(getDashboardPrimaryAction('private-chef').label, 'New Dinner')
})
