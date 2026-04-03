import test from 'node:test'
import assert from 'node:assert/strict'

import { getStateName, normalizeUsStateCode } from '../../lib/discover/constants'

test('normalizeUsStateCode accepts postal abbreviations', () => {
  assert.equal(normalizeUsStateCode('MA'), 'MA')
  assert.equal(normalizeUsStateCode('dc'), 'DC')
})

test('normalizeUsStateCode accepts full state names', () => {
  assert.equal(normalizeUsStateCode('Massachusetts'), 'MA')
  assert.equal(normalizeUsStateCode('new york'), 'NY')
  assert.equal(normalizeUsStateCode('District of Columbia'), 'DC')
})

test('normalizeUsStateCode rejects malformed values', () => {
  assert.equal(normalizeUsStateCode('SON'), null)
  assert.equal(normalizeUsStateCode(''), null)
  assert.equal(normalizeUsStateCode(null), null)
})

test('getStateName returns the canonical display name when possible', () => {
  assert.equal(getStateName('MA'), 'Massachusetts')
  assert.equal(getStateName('Massachusetts'), 'Massachusetts')
  assert.equal(getStateName('  new york  '), 'New York')
})
