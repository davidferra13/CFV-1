import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('lib/documents/generate-allergy-card.ts', 'utf8')

test('allergy card generation and readiness share the same renderable-data predicate', () => {
  assert.match(source, /function hasRenderableAllergyCardData\(data: AllergyCardData\): boolean/)
  assert.match(source, /if \(!hasRenderableAllergyCardData\(data\)\)/)
  assert.match(source, /return data \? hasRenderableAllergyCardData\(data\) : false/)
})

test('allergy card readiness uses fetched generator data instead of a narrower query', () => {
  assert.match(
    source,
    /export async function hasAllergyData\(eventId: string\): Promise<boolean> \{\s*const data = await fetchAllergyCardData\(eventId\)/
  )
  assert.doesNotMatch(source, /select\('id', \{ count: 'exact', head: true \}\)/)
  assert.match(source, /freeTextNotes\.push\(`Kitchen:/)
  assert.match(source, /profile\.dietary_notes/)
})
