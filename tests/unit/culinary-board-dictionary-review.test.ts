import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('lib/culinary-words/actions.ts', 'utf8')

test('added culinary board words queue dictionary review candidates', () => {
  assert.match(source, /queueCulinaryWordDictionaryReview/)
  assert.match(source, /source_surface:\s*'culinary_board'/)
  assert.match(source, /normalized_value:\s*normalizedValue/)
  assert.match(source, /revalidatePath\('\/culinary\/dictionary'\)/)
})

test('culinary board dictionary queue is non-blocking', () => {
  assert.match(source, /catch \(err\)/)
  assert.match(source, /\[non-blocking\] Culinary dictionary review queue failed/)
})

test('culinary board categories map into dictionary term types', () => {
  assert.match(source, /category === 'technique' \|\| category === 'action'/)
  assert.match(source, /category === 'sauce'/)
  assert.match(source, /category === 'texture' \|\| category === 'mouthfeel'/)
  assert.match(source, /category === 'flavor' \|\| category === 'aroma'/)
})
