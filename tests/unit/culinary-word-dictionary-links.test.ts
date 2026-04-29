import assert from 'node:assert/strict'
import test from 'node:test'
import { getCulinaryWordDictionaryLink } from '@/lib/culinary-words/dictionary-links'

test('links culinary board words that exactly match canonical dictionary terms', () => {
  assert.deepEqual(getCulinaryWordDictionaryLink('Brunoise'), {
    canonicalName: 'Brunoise',
    href: '/culinary/dictionary?q=Brunoise',
  })

  assert.deepEqual(getCulinaryWordDictionaryLink('julienne'), {
    canonicalName: 'Julienne',
    href: '/culinary/dictionary?q=Julienne',
  })
})

test('does not link non-canonical board vocabulary words', () => {
  assert.equal(getCulinaryWordDictionaryLink('Crunchy'), null)
  assert.equal(getCulinaryWordDictionaryLink('Scallion'), null)
})
