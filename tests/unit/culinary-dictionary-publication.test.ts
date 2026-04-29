import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canShowDictionaryAliasPublicly,
  filterPublicDictionaryTerms,
  isDictionaryTermPubliclyVisible,
} from '@/lib/culinary-dictionary/publication'
import { SEEDED_DICTIONARY_TERMS } from '@/lib/culinary-dictionary/seed'

test('publication policy only exposes public-safe terms', () => {
  const publicTerms = filterPublicDictionaryTerms([
    ...SEEDED_DICTIONARY_TERMS,
    {
      ...SEEDED_DICTIONARY_TERMS[0],
      id: 'private-test',
      canonicalSlug: 'private-test',
      publicSafe: false,
    },
  ])

  assert.ok(publicTerms.length >= SEEDED_DICTIONARY_TERMS.length)
  assert.equal(
    publicTerms.some((term) => term.id === 'private-test'),
    false
  )
  assert.equal(isDictionaryTermPubliclyVisible(SEEDED_DICTIONARY_TERMS[0]), true)
})

test('aliases under review are not public-displayable', () => {
  assert.equal(canShowDictionaryAliasPublicly({ needsReview: false }), true)
  assert.equal(canShowDictionaryAliasPublicly({ needsReview: true }), false)
})
