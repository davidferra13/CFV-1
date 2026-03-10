import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canonicalizeAllergen,
  deriveAllergenFlagsFromText,
  isFdaBig9Allergen,
  mergeAllergenFlags,
} from '@/lib/public-data/allergens'

test('canonicalizeAllergen normalizes common aliases to platform labels', () => {
  assert.equal(canonicalizeAllergen('dairy'), 'Milk')
  assert.equal(canonicalizeAllergen('shellfish'), 'Crustacean shellfish')
  assert.equal(canonicalizeAllergen('soy'), 'Soybeans')
  assert.equal(canonicalizeAllergen('tree nut'), 'Tree nuts')
})

test('deriveAllergenFlagsFromText detects major allergens from ingredient text', () => {
  const flags = deriveAllergenFlagsFromText(
    'Sesame dressing with peanut crumble and parmesan cream'
  )

  assert.deepEqual(flags, ['Milk', 'Peanuts', 'Sesame'])
})

test('mergeAllergenFlags de-dupes and preserves stable ordering', () => {
  const flags = mergeAllergenFlags(['Soybeans', 'Milk'], ['soy', 'sesame'])

  assert.deepEqual(flags, ['Milk', 'Sesame', 'Soybeans'])
  assert.equal(isFdaBig9Allergen('sesame'), true)
})
