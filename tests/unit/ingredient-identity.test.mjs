import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { assessIngredientIdentity, normalizeIngredientName } from '../../scripts/lib/ingredient-identity.mjs'

const wrong = [
  ['Duck Fat', 'The Fat Duck', 'Restaurant in Bray, Berkshire, England'],
  ['Fresh Basil', 'Pizza Margherita', 'Neapolitan style pizza'],
  ['Fresh Epazote', 'Pambazo', 'Mexican traditional dish'],
  ['Fresh Mint', 'Mint julep', 'Cocktail of bourbon, sugar and fresh mint'],
  ['Ginger Root', 'Ginger Root (music project)', 'American indie soul music project'],
]
test('observed wrong entities are never accepted as ingredients', () => {
  for (const [name, title, description] of wrong) {
    const result = assessIngredientIdentity(name, { title, description })
    assert.equal(result.accepted, false, name)
    assert.equal(result.needsReview, true, name)
  }
})
test('whole ingredient identities survive ordinary preparation labels', () => {
  for (const name of ['Fresh Dill', 'Dill, fresh', 'Dill (whole)', 'Dill']) {
    assert.equal(assessIngredientIdentity(name, {
      title: 'Dill', description: 'Species of flowering plant in the celery family'
    }).accepted, true, name)
  }
  assert.equal(assessIngredientIdentity('Black Pepper', {
    title: 'Black pepper', description: 'Flowering vine cultivated for its spice'
  }).accepted, true)
})
test('valid aliases stay in review instead of being guessed or discarded', () => {
  for (const [name, title, description] of [
    ['Dukkah', 'Duqqa', 'Egyptian condiment'],
    ['Fresh Cilantro', 'Coriander', 'Annual herb'],
    ['Cremini Mushroom', 'Agaricus bisporus', 'Species of mushroom']
  ]) {
    const result = assessIngredientIdentity(name, { title, description })
    assert.equal(result.accepted, false)
    assert.equal(result.reason, 'unresolved_title')
  }
})
test('same-name non-food entities, disambiguation and unknown types stay held', () => {
  for (const summary of [
    { title: 'Sage', description: 'A grey-green color' },
    { title: 'Sage', description: 'Software company' },
    { title: 'Sage', description: 'Plant genus', type: 'disambiguation' },
    { title: 'Sage', description: '' },
    { title: 'Sage', description: 'Something unclassified' }
  ]) assert.equal(assessIngredientIdentity('Sage', summary).accepted, false)
  assert.equal(assessIngredientIdentity('Ginger', {
    title: 'Ginger', description: 'American actress'
  }).accepted, false)
})
test('normalization preserves identity-bearing words and unknown qualifiers', () => {
  assert.equal(normalizeIngredientName('Duck Fat'), 'duck fat')
  assert.equal(normalizeIngredientName('Black Pepper'), 'black pepper')
  assert.equal(normalizeIngredientName('Corn Oil'), 'corn oil')
  assert.equal(normalizeIngredientName('Ground Cherry'), 'ground cherry')
  assert.equal(assessIngredientIdentity('Ground Cherry', {
    title: 'Cherry', description: 'Fruit of several plants'
  }).accepted, false)
  assert.equal(normalizeIngredientName('Sage (color)'), 'sage (color)')
  assert.equal(normalizeIngredientName('Salt, sodium-free'), 'salt, sodium-free')
  assert.equal(assessIngredientIdentity('', { title: '', description: 'herb' }).accepted, false)
})

const workerPath = process.env.CF_IDENTITY_SOURCE ||
  fileURLToPath(new URL('../../scripts/openclaw-wiki-enrichment.mjs', import.meta.url))
const source = readFileSync(workerPath, 'utf8').replace(/\r\n/g, '\n')
const start = source.indexOf('async function enrichIngredient(')
const end = source.indexOf('\n// ---------------------------------------------------------------------------\n// Main', start)
assert.ok(start >= 0 && end > start, 'worker function boundary')
const workerSource = source.slice(start, end) + '\nenrichIngredient'

function worker(summary, selectedTitle = summary.title) {
  const writes = []
  const calls = []
  const fn = vm.runInNewContext(workerSource, {
    DRY: false, WIKI_MS: 0, WDATA_MS: 0, USDA_MS: 0,
    cleanName: normalizeIngredientName, assessIngredientIdentity,
    delay: async () => {},
    searchWikipedia: async () => selectedTitle,
    getWikipediaSummary: async () => summary,
    getWikipediaSections: async () => { calls.push('sections'); return { culinary: 'Herb used in cooking' } },
    getWikidataProperties: async () => ({ originQids: [], taxonName: 'Test taxon' }),
    resolveQidLabels: async () => [],
    getUsdaNutrition: async () => null,
    parseCulinaryContext: () => ({ flavorProfile: null, culinaryUses: null, typicalPairings: [] }),
    computeConfidence: () => 0.62,
    toSlug: value => value.toLowerCase().replace(/\s+/g, '-'),
    sql: async (strings, ...values) => { writes.push({ text: strings.join('?'), values }); return [] },
    console: { log() {} },
  })
  return { fn, writes, calls }
}
for (const [name, title, description] of wrong) {
  test('worker holds ' + name + ' before trusted effects', async () => {
    const run = worker({ title, description, extract: 'Captured article evidence', wikidataQid: 'Q1', imageUrl: 'image' })
    const result = await run.fn({ id: 'fixture-id', name, usda_fdc_id: null })
    assert.equal(result.reviewRequired, true)
    assert.equal(run.calls.length, 0, 'must not fetch culinary sections for a wrong identity')
    assert.equal(run.writes.length, 1, 'only review candidate is recorded')
    assert.match(run.writes[0].text, /0\.05,\s*true,\s*NOW\(\)/)
    assert.match(run.writes[0].text, /ON CONFLICT \(system_ingredient_id\) DO NOTHING/)
    assert.doesNotMatch(run.writes[0].text, /UPDATE system_ingredients|ingredient_knowledge_slugs/)
  })
}
test('worker checks resolved article, not only selected search title', async () => {
  const run = worker({ title: 'Pizza Margherita', description: 'Neapolitan style pizza' }, 'Basil')
  assert.equal((await run.fn({ id: 'fixture-id', name: 'Fresh Basil' })).reviewRequired, true)
  assert.equal(run.writes.length, 1)
})
test('accepted identity continues normal enrichment and promotion', async () => {
  const run = worker({ title: 'Dill', description: 'Species of flowering plant', extract: 'Dill is an herb.' })
  const result = await run.fn({ id: 'fixture-id', name: 'Fresh Dill' })
  assert.equal(result.success, true)
  assert.equal(run.calls.length, 1)
  assert.equal(run.writes.length, 3)
  assert.match(run.writes[1].text, /UPDATE system_ingredients/)
  assert.match(run.writes[2].text, /ingredient_knowledge_slugs/)
})
