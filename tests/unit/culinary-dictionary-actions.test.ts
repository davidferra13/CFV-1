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
