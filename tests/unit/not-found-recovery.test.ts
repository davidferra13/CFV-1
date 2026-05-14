import test from 'node:test'
import assert from 'node:assert/strict'

import { getPathRecoveryContext, getRoleRecoveryHome } from '../../lib/errors/not-found-recovery'

test('404 recovery maps chef profile misses to chef browsing and booking', () => {
  const context = getPathRecoveryContext('/chef/bad-slug')

  assert.equal(context?.title, 'Chef profile not found.')
  assert.deepEqual(context?.primaryHrefs, ['/chefs', '/book'])
  assert.equal(context?.searchDefault, 'bad slug')
})

test('404 recovery maps ingredient misses to ingredient directory search', () => {
  const context = getPathRecoveryContext('/ingredient/green-garlic')

  assert.equal(context?.title, 'Ingredient page not found.')
  assert.equal(context?.primaryHrefs[0], '/ingredients')
  assert.equal(context?.primaryHrefs[1], '/ingredients?q=green%20garlic')
  assert.equal(context?.searchDefault, 'green garlic')
})

test('404 recovery maps client event misses to my events and support', () => {
  const context = getPathRecoveryContext('/my-events/not-real')

  assert.equal(context?.title, 'Event link not found.')
  assert.deepEqual(context?.primaryHrefs, ['/my-events', '/contact'])
})

test('404 recovery maps admin misses to admin home and system', () => {
  const context = getPathRecoveryContext('/admin/old-system')

  assert.equal(context?.title, 'Admin surface not found.')
  assert.deepEqual(context?.primaryHrefs, ['/admin', '/admin/system'])
})

test('404 recovery exposes stale route near matches', () => {
  const foodDirectory = getPathRecoveryContext('/food-directory')
  const operators = getPathRecoveryContext('/operators/')

  assert.equal(foodDirectory?.nearMatch?.to, '/ingredients')
  assert.equal(operators?.nearMatch?.to, '/for-operators')
})

test('404 recovery maps signed-in roles to their primary home', () => {
  assert.equal(getRoleRecoveryHome('client')?.href, '/my-events')
  assert.equal(getRoleRecoveryHome('chef')?.href, '/dashboard')
  assert.equal(getRoleRecoveryHome('staff')?.href, '/staff-dashboard')
  assert.equal(getRoleRecoveryHome('partner')?.href, '/partner/dashboard')
  assert.equal(getRoleRecoveryHome('admin')?.href, '/admin')
  assert.equal(getRoleRecoveryHome('unknown'), null)
})
