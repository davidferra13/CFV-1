import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('app/(public)/dictionary/[slug]/page.tsx', 'utf8')

test('public dictionary detail links only to resolved ingredient guides', () => {
  assert.match(source, /getIngredientGuideLinkForTerm/)
  assert.match(source, /getIngredientKnowledgeBySlug\(candidate\.slug\)\.catch/)
  assert.match(source, /if \(!ingredient\) continue/)
  assert.match(source, /href=\{`\/ingredient\/\$\{ingredientGuideLink\.slug\}`\}/)
})

test('public dictionary ingredient links are derived from canonical names and aliases', () => {
  assert.match(source, /term\.canonicalSlug/)
  assert.match(source, /toIngredientSlugCandidate\(term\.canonicalName\)/)
  assert.match(source, /term\.aliases\.flatMap/)
})
