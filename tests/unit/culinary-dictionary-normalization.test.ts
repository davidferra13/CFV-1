import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeCulinaryTerm,
  normalizeDictionaryAlias,
  normalizeIngredientName,
  slugifyCulinaryTerm,
} from '@/lib/culinary-dictionary/normalization'
import {
  findDictionaryAliasSuggestions,
  searchDictionaryTerms,
} from '@/lib/culinary-dictionary/queries'

test('normalizes culinary aliases deterministically', () => {
  assert.equal(normalizeIngredientName('E.V.O.O.'), 'extra virgin olive oil')
  assert.equal(normalizeIngredientName('AP flour'), 'all purpose flour')
  assert.equal(normalizeDictionaryAlias('Green-Onions'), 'green onion')
  assert.equal(normalizeCulinaryTerm('napp\u00e9'), 'nappe')
  assert.equal(slugifyCulinaryTerm('All Purpose Flour'), 'all-purpose-flour')
})

test('seeded alias family resolves scallion, green onion, and spring onion together', async () => {
  const terms = await searchDictionaryTerms({ query: 'scallion', limit: 10 })
  const greenOnion = terms.find((term) => term.canonicalSlug === 'green-onion')

  assert.ok(greenOnion)
  assert.equal(greenOnion.canonicalName, 'Green Onion')
  assert.ok(greenOnion.aliases.some((alias) => alias.alias === 'green onion'))
  assert.ok(greenOnion.aliases.some((alias) => alias.alias === 'scallion'))
  assert.ok(greenOnion.aliases.some((alias) => alias.alias === 'spring onion'))
})

test('dictionary alias suggestions expose canonical term without auto-confirming ingredient aliases', async () => {
  const suggestions = await findDictionaryAliasSuggestions('spring onions', 5)
  assert.ok(suggestions.some((suggestion) => suggestion.canonicalSlug === 'green-onion'))
})
