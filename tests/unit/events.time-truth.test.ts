import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEventTimeTruthValue } from '@/lib/events/time-truth'

describe('normalizeEventTimeTruthValue', () => {
  it('returns null for blank values', () => {
    assert.equal(normalizeEventTimeTruthValue(''), null)
    assert.equal(normalizeEventTimeTruthValue('   '), null)
    assert.equal(normalizeEventTimeTruthValue(null), null)
    assert.equal(normalizeEventTimeTruthValue(undefined), null)
  })

  it('treats placeholder tokens as unknown time truth', () => {
    assert.equal(normalizeEventTimeTruthValue('TBD'), null)
    assert.equal(normalizeEventTimeTruthValue('unknown'), null)
    assert.equal(normalizeEventTimeTruthValue('N/A'), null)
  })

  it('preserves concrete time values', () => {
    assert.equal(normalizeEventTimeTruthValue('18:30'), '18:30')
    assert.equal(normalizeEventTimeTruthValue(' 16:45:00 '), '16:45:00')
  })
})
