import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const quoteDetailSource = readFileSync('app/(chef)/quotes/[id]/page.tsx', 'utf8')

test('quote detail surfaces canonical chef quote action', () => {
  assert.match(quoteDetailSource, /getChefQuoteAction/)
  assert.match(quoteDetailSource, /Recommended quote action/)
  assert.match(quoteDetailSource, /quoteActionProjection\.href/)
  assert.match(quoteDetailSource, /quoteActionProjection\.ctaLabel/)
})
