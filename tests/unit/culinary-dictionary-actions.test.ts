import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('lib/culinary-dictionary/actions.ts', 'utf8')
const querySource = readFileSync('lib/culinary-dictionary/queries.ts', 'utf8')

test('culinary dictionary actions are server actions with chef auth', () => {
  assert.match(source, /^'use server'/)
  assert.match(source, /requireChef\(\)/)
})

test('chef-owned dictionary mutations are scoped by chef id', () => {
  assert.match(source, /chef_id:\s*user\.entityId/)
  assert.match(source, /\.eq\('chef_id', user\.entityId\)/)
})

test('dictionary mutations return feedback and revalidate affected routes', () => {
  assert.match(source, /success:\s*false,\s*error:/)
  assert.match(source, /success:\s*true/)
  assert.match(source, /revalidatePath\('\/culinary\/dictionary'\)/)
  assert.match(source, /revalidatePath\('\/culinary\/costing'\)/)
  assert.match(source, /revalidatePath\('\/culinary\/ingredients'\)/)
})

test('chef dictionary searches merge chef-specific aliases', () => {
  assert.match(querySource, /applyChefOverrides/)
  assert.match(querySource, /FROM chef_culinary_dictionary_overrides/)
  assert.match(querySource, /WHERE chef_id = \$\{chefId\}/)
  assert.match(querySource, /source:\s*'chef'/)
})

test('approved dictionary review items become private searchable chef terms', () => {
  assert.match(querySource, /getApprovedChefReviewTerms/)
  assert.match(querySource, /FROM culinary_dictionary_review_queue/)
  assert.match(querySource, /AND status = 'approved'/)
  assert.match(querySource, /id:\s*`chef-review-\$\{String\(row\.id\)\}`/)
  assert.match(querySource, /\.\.\.baseTerms,\s*\.\.\.approvedReviewTerms/)
})

test('dictionary search misses can be queued as chef-scoped review candidates', () => {
  assert.match(source, /createDictionarySearchReviewCandidate/)
  assert.match(source, /source_surface: parsed\.data\.sourceSurface/)
  assert.match(source, /source_value: parsed\.data\.query/)
  assert.match(source, /\.eq\('chef_id', user\.entityId\)/)
  assert.match(source, /search_miss_capture/)
})
