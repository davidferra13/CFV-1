import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

describe('Cannabis portal copy', () => {
  it('states that cannabis dinners are strictly private', () => {
    const source = readFileSync('app/(chef)/events/cannabis/page.tsx', 'utf8')

    assert.ok(
      source.includes('All cannabis dinners are strictly private.'),
      'Cannabis portal must state that all cannabis dinners are strictly private'
    )
  })
})
